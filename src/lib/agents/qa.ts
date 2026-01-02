import OpenAI from 'openai';
import type { LPBlueprint } from './architect';

/**
 * QA Issue severity levels
 */
export type IssueSeverity = 'critical' | 'major' | 'minor' | 'suggestion';

/**
 * QA Issue categories
 */
export type IssueCategory =
  | 'functionality'    // JS doesn't work, buttons don't click
  | 'structure'        // Missing sections, wrong flow
  | 'responsive'       // Layout breaks on mobile/desktop
  | 'content'          // Missing text, wrong content
  | 'conversion'       // Missing CTA, no redirect
  | 'accessibility'    // Missing alt text, contrast issues
  | 'performance';     // Large images, slow loading

/**
 * A single QA issue
 */
export interface QAIssue {
  id: string;
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  description: string;
  location?: string;        // CSS selector or line number
  suggestedFix?: string;    // How to fix it
  codeSnippet?: string;     // Problematic code
}

/**
 * Complete QA result
 */
export interface QAResult {
  id: string;
  testedAt: Date;

  // Overall status
  passed: boolean;
  score: number;           // 0-100

  // Issues found
  issues: QAIssue[];

  // Counts by severity
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  suggestionCount: number;

  // Specific checks
  checks: {
    hasValidHTML: boolean;
    hasWorkingJS: boolean;
    hasAllSteps: boolean;
    hasCorrectRedirect: boolean;
    hasResponsiveDesign: boolean;
    hasCTAButtons: boolean;
    matchesBlueprint: boolean;
  };

  // Summary
  summary: string;
}

/**
 * Get OpenAI client for QA
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set - required for QA agent');
  }
  return new OpenAI({ apiKey });
}

/**
 * QA Agent - Reviews and validates generated landing pages
 * Uses OpenAI for a fresh perspective (different from the builder's LLM)
 */
export async function reviewLandingPage(
  html: string,
  blueprint: LPBlueprint
): Promise<QAResult> {
  const openai = getOpenAIClient();

  const prompt = `You are a QA engineer specializing in landing page validation. Review this generated HTML against the blueprint and find ALL issues.

## BLUEPRINT REQUIREMENTS:

Total Steps: ${blueprint.totalSteps}
Tracking URL: ${blueprint.technical.trackingUrl}
Vertical: ${blueprint.vertical}

Expected Sections:
${blueprint.sections.map(s => `- Step ${s.stepNumber} (${s.type}): ${s.title}`).join('\n')}

Required Elements:
${blueprint.technical.requiresCountdown ? '- Countdown timer in CTA step' : ''}
${blueprint.technical.requiresScarcity ? '- Scarcity text above CTA button' : ''}
${blueprint.technical.requiresSocialProof ? '- Social proof element' : ''}

## GENERATED HTML:

\`\`\`html
${html.substring(0, 15000)}
\`\`\`

## CHECK FOR THESE ISSUES:

### CRITICAL (Page won't work or breaks on mobile):
1. **JavaScript Errors**: Syntax errors, undefined functions, missing nextStep()
2. **Non-clickable Buttons**: onclick not attached, wrong function names
3. **Missing Redirect**: Final step doesn't redirect to tracking URL
4. **Missing Steps**: Not all ${blueprint.totalSteps} steps present
5. **Broken Flow**: Steps don't transition properly
6. **overflow:hidden on html/body**: Prevents scrolling on mobile - CRITICAL
7. **overflow:hidden on .step containers**: Cuts off content on mobile - CRITICAL
8. **max-height:100vh on containers**: Cuts off content with browser chrome - CRITICAL

### MAJOR (Significantly affects UX):
1. **Missing CTA**: No clear call-to-action button
2. **Wrong Content**: Content doesn't match blueprint
3. **Layout Broken**: Elements overlap, wrong positioning
4. **vw font units**: Can cause text to be too small on mobile

### MINOR (Should fix but not blocking):
1. **Accessibility**: Missing alt text, low contrast
2. **Performance**: Large inline images, excessive CSS
3. **Styling Issues**: Inconsistent fonts, colors

### SUGGESTIONS (Nice to have):
1. **Improvements**: Better animations, enhanced UX

## OUTPUT FORMAT (JSON):

{
  "passed": true|false,
  "score": 0-100,
  "issues": [
    {
      "id": "issue-1",
      "severity": "critical|major|minor|suggestion",
      "category": "functionality|structure|responsive|content|conversion|accessibility|performance",
      "title": "Brief title",
      "description": "Detailed description of the issue",
      "location": "CSS selector or description of where",
      "suggestedFix": "How to fix it",
      "codeSnippet": "problematic code if applicable"
    }
  ],
  "checks": {
    "hasValidHTML": true|false,
    "hasWorkingJS": true|false,
    "hasAllSteps": true|false,
    "hasCorrectRedirect": true|false,
    "hasResponsiveDesign": true|false,
    "hasCTAButtons": true|false,
    "matchesBlueprint": true|false
  },
  "summary": "1-2 sentence summary of the review"
}

IMPORTANT:
- Be THOROUGH - find ALL issues, not just obvious ones
- Check that onclick handlers actually call defined functions
- Verify the redirect URL matches: ${blueprint.technical.trackingUrl}
- Check for quiz steps having BOTH answer options AND separate Continue buttons (this is WRONG)
- CRITICAL: Check CSS for overflow:hidden on html, body, or .step - mark as CRITICAL severity
- CRITICAL: Check CSS for max-height:100vh on any container - mark as CRITICAL severity
- These responsive issues BREAK the page on mobile and must be flagged as CRITICAL

Return ONLY valid JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert QA engineer who reviews HTML landing pages for issues. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON in QA response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Count issues by severity
    const issues: QAIssue[] = (parsed.issues || []).map((issue: Partial<QAIssue>, index: number) => ({
      id: issue.id || `issue-${index + 1}`,
      severity: issue.severity || 'minor',
      category: issue.category || 'functionality',
      title: issue.title || 'Unknown issue',
      description: issue.description || '',
      location: issue.location,
      suggestedFix: issue.suggestedFix,
      codeSnippet: issue.codeSnippet,
    }));

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const majorCount = issues.filter(i => i.severity === 'major').length;
    const minorCount = issues.filter(i => i.severity === 'minor').length;
    const suggestionCount = issues.filter(i => i.severity === 'suggestion').length;

    // Calculate score
    const score = Math.max(0, 100 - (criticalCount * 25) - (majorCount * 10) - (minorCount * 3) - (suggestionCount * 1));

    return {
      id: `qa-${Date.now()}`,
      testedAt: new Date(),
      passed: criticalCount === 0 && majorCount <= 2,
      score,
      issues,
      criticalCount,
      majorCount,
      minorCount,
      suggestionCount,
      checks: {
        hasValidHTML: parsed.checks?.hasValidHTML ?? true,
        hasWorkingJS: parsed.checks?.hasWorkingJS ?? true,
        hasAllSteps: parsed.checks?.hasAllSteps ?? true,
        hasCorrectRedirect: parsed.checks?.hasCorrectRedirect ?? true,
        hasResponsiveDesign: parsed.checks?.hasResponsiveDesign ?? true,
        hasCTAButtons: parsed.checks?.hasCTAButtons ?? true,
        matchesBlueprint: parsed.checks?.matchesBlueprint ?? true,
      },
      summary: parsed.summary || `Found ${issues.length} issues (${criticalCount} critical, ${majorCount} major)`,
    };
  } catch (error) {
    console.error('QA review failed:', error);

    // Do basic validation if AI fails
    return doBasicValidation(html, blueprint);
  }
}

/**
 * Basic validation without AI
 */
function doBasicValidation(html: string, blueprint: LPBlueprint): QAResult {
  const issues: QAIssue[] = [];

  // Check for DOCTYPE
  if (!html.includes('<!DOCTYPE html>')) {
    issues.push({
      id: 'missing-doctype',
      severity: 'minor',
      category: 'structure',
      title: 'Missing DOCTYPE',
      description: 'HTML should start with <!DOCTYPE html>',
    });
  }

  // Check for nextStep function
  if (!html.includes('function nextStep')) {
    issues.push({
      id: 'missing-nextstep',
      severity: 'critical',
      category: 'functionality',
      title: 'Missing nextStep function',
      description: 'The nextStep() function is required for multi-step navigation',
      suggestedFix: 'Add the nextStep() function in a script tag',
    });
  }

  // Check for tracking URL
  if (blueprint.technical.trackingUrl && !html.includes(blueprint.technical.trackingUrl)) {
    issues.push({
      id: 'missing-redirect',
      severity: 'critical',
      category: 'conversion',
      title: 'Missing tracking URL redirect',
      description: `The page should redirect to ${blueprint.technical.trackingUrl}`,
      suggestedFix: 'Add the tracking URL as the redirect destination',
    });
  }

  // Check for all steps
  for (let i = 1; i <= blueprint.totalSteps; i++) {
    if (!html.includes(`id="step${i}"`) && !html.includes(`id='step${i}'`)) {
      issues.push({
        id: `missing-step-${i}`,
        severity: 'critical',
        category: 'structure',
        title: `Missing step ${i}`,
        description: `Step ${i} of ${blueprint.totalSteps} is missing`,
        suggestedFix: `Add <div id="step${i}" class="step">...</div>`,
      });
    }
  }

  // Check for responsive issues - these are CRITICAL because they break mobile
  // Check for overflow:hidden on html or body (prevents scrolling)
  const overflowPattern = /(?:html|body)\s*\{[^}]*overflow\s*:\s*hidden/gi;
  if (overflowPattern.test(html)) {
    issues.push({
      id: 'overflow-hidden-body',
      severity: 'critical',
      category: 'responsive',
      title: 'overflow:hidden on html/body',
      description: 'Using overflow:hidden on html or body prevents scrolling on mobile devices',
      suggestedFix: 'Remove overflow:hidden from html and body elements',
    });
  }

  // Check for overflow:hidden on step containers
  const stepOverflowPattern = /\.step\s*\{[^}]*overflow\s*:\s*hidden/gi;
  if (stepOverflowPattern.test(html)) {
    issues.push({
      id: 'overflow-hidden-step',
      severity: 'critical',
      category: 'responsive',
      title: 'overflow:hidden on step containers',
      description: 'Using overflow:hidden on step containers cuts off content on mobile',
      suggestedFix: 'Remove overflow:hidden from .step containers or use overflow-x:hidden only',
    });
  }

  // Check for max-height: 100vh (cuts off content on mobile)
  if (html.includes('max-height: 100vh') || html.includes('max-height:100vh')) {
    issues.push({
      id: 'max-height-vh',
      severity: 'critical',
      category: 'responsive',
      title: 'Using max-height: 100vh',
      description: 'max-height: 100vh cuts off content on mobile devices with browser chrome',
      suggestedFix: 'Use min-height: 100vh instead, or min-height: 100dvh for modern browsers',
    });
  }

  // Check for onclick handlers
  const onclickMatches = html.match(/onclick="([^"]+)"/g) || [];
  for (const match of onclickMatches) {
    const funcName = match.match(/onclick="([a-zA-Z]+)\(/)?.[1];
    if (funcName && !html.includes(`function ${funcName}`)) {
      issues.push({
        id: `undefined-function-${funcName}`,
        severity: 'critical',
        category: 'functionality',
        title: `Undefined function: ${funcName}`,
        description: `onclick calls ${funcName}() but this function is not defined`,
        suggestedFix: `Define the ${funcName} function or use the correct function name`,
      });
    }
  }

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const majorCount = issues.filter(i => i.severity === 'major').length;
  const minorCount = issues.filter(i => i.severity === 'minor').length;
  const suggestionCount = issues.filter(i => i.severity === 'suggestion').length;
  const score = Math.max(0, 100 - (criticalCount * 25) - (majorCount * 10) - (minorCount * 3));

  return {
    id: `qa-basic-${Date.now()}`,
    testedAt: new Date(),
    passed: criticalCount === 0,
    score,
    issues,
    criticalCount,
    majorCount,
    minorCount,
    suggestionCount,
    checks: {
      hasValidHTML: html.includes('<!DOCTYPE html>'),
      hasWorkingJS: html.includes('function nextStep'),
      hasAllSteps: !issues.some(i => i.id.startsWith('missing-step')),
      hasCorrectRedirect: html.includes(blueprint.technical.trackingUrl),
      hasResponsiveDesign: !(/(?:html|body)\s*\{[^}]*overflow\s*:\s*hidden/gi.test(html)) &&
        !(/\.step\s*\{[^}]*overflow\s*:\s*hidden/gi.test(html)) &&
        !html.includes('max-height: 100vh') && !html.includes('max-height:100vh'),
      hasCTAButtons: html.includes('onclick'),
      matchesBlueprint: true, // Can't check without AI
    },
    summary: `Basic validation found ${issues.length} issues (${criticalCount} critical, ${majorCount} major)`,
  };
}

/**
 * Quick validation without OpenAI (for testing)
 */
export function quickValidate(html: string, blueprint: LPBlueprint): QAResult {
  return doBasicValidation(html, blueprint);
}
