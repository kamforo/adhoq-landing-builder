import { getLLMProvider } from '@/lib/llm';
import type { QAResult, QAIssue } from './qa';
import type { LPBlueprint } from './architect';

/**
 * Repair result
 */
export interface RepairResult {
  id: string;
  repairedAt: Date;

  // The fixed HTML
  html: string;

  // What was fixed
  fixesApplied: {
    issueId: string;
    issueTitle: string;
    fixDescription: string;
    success: boolean;
  }[];

  // Summary
  totalIssues: number;
  fixedCount: number;
  failedCount: number;
  summary: string;
}

/**
 * User-reported issue
 */
export interface UserReportedIssue {
  description: string;         // What the user says is wrong
  screenshot?: string;         // Optional screenshot URL
  expectedBehavior?: string;   // What should happen
}

/**
 * Repair Agent - Fixes issues in generated landing pages
 */
export async function repairLandingPage(
  html: string,
  blueprint: LPBlueprint,
  qaResult?: QAResult,
  userIssue?: UserReportedIssue
): Promise<RepairResult> {
  const llm = getLLMProvider('grok');

  // Collect all issues to fix
  const issuesToFix: string[] = [];

  if (qaResult) {
    // Prioritize critical and major issues
    const criticalAndMajor = qaResult.issues.filter(i => i.severity === 'critical' || i.severity === 'major');
    for (const issue of criticalAndMajor) {
      issuesToFix.push(`- [${issue.severity.toUpperCase()}] ${issue.title}: ${issue.description}${issue.suggestedFix ? `\n  Suggested fix: ${issue.suggestedFix}` : ''}${issue.codeSnippet ? `\n  Problematic code: ${issue.codeSnippet}` : ''}`);
    }
  }

  if (userIssue) {
    issuesToFix.push(`- [USER REPORTED] ${userIssue.description}${userIssue.expectedBehavior ? `\n  Expected: ${userIssue.expectedBehavior}` : ''}`);
  }

  if (issuesToFix.length === 0) {
    return {
      id: `repair-${Date.now()}`,
      repairedAt: new Date(),
      html,
      fixesApplied: [],
      totalIssues: 0,
      fixedCount: 0,
      failedCount: 0,
      summary: 'No issues to fix',
    };
  }

  const prompt = `You are an expert HTML/CSS/JS repair agent. Fix ALL the issues listed below in this landing page.

## ISSUES TO FIX:

${issuesToFix.join('\n\n')}

## BLUEPRINT REFERENCE:

Total Steps: ${blueprint.totalSteps}
Tracking URL: ${blueprint.technical.trackingUrl}
Expected structure:
${blueprint.sections.map(s => `- Step ${s.stepNumber} (${s.type}): ${s.title}`).join('\n')}

## CURRENT HTML:

\`\`\`html
${html}
\`\`\`

## REPAIR INSTRUCTIONS:

1. **Fix ALL listed issues** - don't skip any
2. **Preserve working parts** - don't break what works
3. **Test your logic** - make sure JS functions are defined and called correctly
4. **Check responsive rules**:
   - NO overflow:hidden on body or containers
   - Use min-height: 100vh (NOT max-height)
   - Use px/rem for fonts (NOT vw)
   - Center with max-width: 600px for desktop
5. **Verify the flow**:
   - Step 1 (HOOK): Hero + headline + Continue button
   - Steps 2 to N-1 (QUIZ): Question + answer options ONLY (no separate Continue)
   - Step N (CTA): Urgency + final CTA that redirects

## COMMON FIXES:

**Non-clickable buttons**:
- Ensure onclick="nextStep()" is properly attached
- Verify function nextStep() is defined BEFORE it's called
- Check for typos in function names

**Missing redirect**:
- Final step button should use: window.location.href = REDIRECT_URL
- Or onclick="nextStep()" with nextStep checking if currentStep > TOTAL_STEPS

**Responsive issues**:
- Remove overflow: hidden from body and .step
- Change max-height: 100vh to min-height: 100vh
- Replace vw units with px or rem

**Quiz steps with extra buttons**:
- Quiz answer options should call nextStep() directly
- Remove any separate Continue/Next buttons in quiz steps

## OUTPUT FORMAT:

Return a JSON object:
{
  "fixedHtml": "complete fixed HTML starting with <!DOCTYPE html>",
  "fixesApplied": [
    {
      "issueId": "issue-id or 'user-reported'",
      "issueTitle": "Brief title",
      "fixDescription": "What you fixed and how",
      "success": true
    }
  ],
  "summary": "Brief summary of all fixes"
}

IMPORTANT:
- Return the COMPLETE fixed HTML, not just snippets
- Make sure ALL issues are addressed
- Test that your fixes actually solve the problems

Return ONLY valid JSON.`;

  try {
    const response = await llm.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 8000,
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON in repair response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const fixesApplied = (parsed.fixesApplied || []).map((fix: { issueId?: string; issueTitle?: string; fixDescription?: string; success?: boolean }) => ({
      issueId: fix.issueId || 'unknown',
      issueTitle: fix.issueTitle || 'Unknown fix',
      fixDescription: fix.fixDescription || '',
      success: fix.success ?? true,
    }));

    return {
      id: `repair-${Date.now()}`,
      repairedAt: new Date(),
      html: parsed.fixedHtml || html,
      fixesApplied,
      totalIssues: issuesToFix.length,
      fixedCount: fixesApplied.filter((f: { success: boolean }) => f.success).length,
      failedCount: fixesApplied.filter((f: { success: boolean }) => !f.success).length,
      summary: parsed.summary || `Applied ${fixesApplied.length} fixes`,
    };
  } catch (error) {
    console.error('Repair agent failed:', error);
    return attemptBasicRepairs(html, blueprint, qaResult, userIssue);
  }
}

/**
 * Attempt basic repairs without AI
 */
function attemptBasicRepairs(
  html: string,
  blueprint: LPBlueprint,
  qaResult?: QAResult,
  userIssue?: UserReportedIssue
): RepairResult {
  let fixedHtml = html;
  const fixesApplied: RepairResult['fixesApplied'] = [];

  // Fix overflow:hidden on html/body (multi-line CSS support)
  const htmlBodyOverflowPattern = /(html\s*,\s*body|html|body)\s*\{([^}]*?)overflow\s*:\s*hidden/gi;
  const beforeHtmlBodyFix = fixedHtml;
  fixedHtml = fixedHtml.replace(htmlBodyOverflowPattern, '$1 {$2/* overflow removed */');
  if (fixedHtml !== beforeHtmlBodyFix) {
    fixesApplied.push({
      issueId: 'overflow-hidden-body',
      issueTitle: 'Removed overflow:hidden from html/body',
      fixDescription: 'Removed overflow:hidden from html and body to allow scrolling',
      success: true,
    });
  }

  // Fix overflow:hidden on .step containers
  const stepOverflowPattern = /(\.step)\s*\{([^}]*?)overflow\s*:\s*hidden/gi;
  const beforeStepFix = fixedHtml;
  fixedHtml = fixedHtml.replace(stepOverflowPattern, '$1 {$2/* overflow removed */');
  if (fixedHtml !== beforeStepFix) {
    fixesApplied.push({
      issueId: 'overflow-hidden-step',
      issueTitle: 'Removed overflow:hidden from .step',
      fixDescription: 'Removed overflow:hidden from step containers to prevent content cutoff',
      success: true,
    });
  }

  // Fix max-height: 100vh (remove it entirely)
  if (fixedHtml.includes('max-height: 100vh') || fixedHtml.includes('max-height:100vh')) {
    fixedHtml = fixedHtml.replace(/max-height\s*:\s*100vh\s*;?/g, '/* max-height removed */');
    fixesApplied.push({
      issueId: 'max-height-vh',
      issueTitle: 'Removed max-height: 100vh',
      fixDescription: 'Removed max-height: 100vh to prevent content cutoff on mobile',
      success: true,
    });
  }

  // Fix missing tracking URL in redirect
  if (blueprint.technical.trackingUrl && !fixedHtml.includes(blueprint.technical.trackingUrl)) {
    // Try to find and fix the redirect URL
    const redirectPatterns = [
      /window\.location\.href\s*=\s*["'][^"']*["']/g,
      /REDIRECT_URL\s*=\s*["'][^"']*["']/g,
    ];

    for (const pattern of redirectPatterns) {
      if (pattern.test(fixedHtml)) {
        fixedHtml = fixedHtml.replace(pattern, `REDIRECT_URL = "${blueprint.technical.trackingUrl}"`);
        fixesApplied.push({
          issueId: 'missing-redirect',
          issueTitle: 'Fixed tracking URL',
          fixDescription: `Set redirect URL to ${blueprint.technical.trackingUrl}`,
          success: true,
        });
        break;
      }
    }
  }

  // Fix missing nextStep function
  if (!fixedHtml.includes('function nextStep')) {
    // Add the standard nextStep function before </script>
    const nextStepFn = `
function nextStep() {
    document.getElementById('step' + currentStep).classList.remove('active');
    currentStep++;
    if (currentStep > TOTAL_STEPS) {
        window.location.href = REDIRECT_URL;
    } else {
        document.getElementById('step' + currentStep).classList.add('active');
    }
}
`;
    fixedHtml = fixedHtml.replace('</script>', nextStepFn + '</script>');
    fixesApplied.push({
      issueId: 'missing-nextstep',
      issueTitle: 'Added nextStep function',
      fixDescription: 'Added missing nextStep() function for step navigation',
      success: true,
    });
  }

  return {
    id: `repair-basic-${Date.now()}`,
    repairedAt: new Date(),
    html: fixedHtml,
    fixesApplied,
    totalIssues: (qaResult?.issues.length || 0) + (userIssue ? 1 : 0),
    fixedCount: fixesApplied.length,
    failedCount: 0,
    summary: `Applied ${fixesApplied.length} basic fixes`,
  };
}

/**
 * Quick fix for user-reported issues (single issue repair)
 */
export async function quickFix(
  html: string,
  blueprint: LPBlueprint,
  issueDescription: string
): Promise<RepairResult> {
  return repairLandingPage(html, blueprint, undefined, {
    description: issueDescription,
  });
}
