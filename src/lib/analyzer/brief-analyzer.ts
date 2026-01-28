import { v4 as uuidv4 } from 'uuid';
import { getLLMProvider } from '@/lib/llm';
import {
  validateComponents,
  validateVertical,
  validateTone,
  validateSections,
} from './ai-analyzer';
import type { ComponentAnalysis } from '@/types/component-analysis';
import type { GenerationOptions } from '@/types';

/**
 * Brief Analyzer — synthesize ComponentAnalysis from text instructions
 *
 * Instead of analyzing an existing HTML page, this takes a user's brief
 * (text instructions) and generates a full ComponentAnalysis that the
 * Architect and Builder agents can consume identically.
 */
export async function analyzeFromBrief(
  brief: string,
  options: Partial<GenerationOptions>
): Promise<ComponentAnalysis> {
  const llm = getLLMProvider('grok');

  try {
    const aiResult = await getAIBriefAnalysis(llm, brief, options);

    return {
      id: uuidv4(),
      sourceUrl: undefined,
      analyzedAt: new Date(),
      components: aiResult.components,
      sections: aiResult.sections,
      flow: aiResult.flow,
      vertical: aiResult.vertical,
      tone: aiResult.tone,
      trackingUrl: options.ctaUrlOverride || '',
      images: [],
      originalImages: [],
      strategySummary: aiResult.strategySummary,
      rawCheerioData: {
        headlines: [],
        buttons: [],
        images: [],
        forms: 0,
      },
    };
  } catch (error) {
    console.error('Brief analysis AI failed, using fallback:', error);
    return getFallbackBriefAnalysis(brief, options);
  }
}

/**
 * Use Grok AI to synthesize components from a brief
 */
async function getAIBriefAnalysis(
  llm: ReturnType<typeof getLLMProvider>,
  brief: string,
  options: Partial<GenerationOptions>
): Promise<{
  components: ComponentAnalysis['components'];
  sections: ComponentAnalysis['sections'];
  flow: ComponentAnalysis['flow'];
  vertical: ComponentAnalysis['vertical'];
  tone: ComponentAnalysis['tone'];
  strategySummary: ComponentAnalysis['strategySummary'];
}> {
  const verticalHint = options.vertical && options.vertical !== 'auto' ? options.vertical : 'auto-detect from brief';
  const toneHint = options.tone && options.tone !== 'auto' ? options.tone : 'auto-detect from brief';
  const stepCountHint = options.stepCount && options.stepCount > 0 ? `${options.stepCount} steps` : 'decide based on brief';
  const countryHint = options.country || 'US';
  const languageHint = options.language || 'en';

  const prompt = `You are an expert landing page strategist specializing in high-converting dating/adult funnels.

A user wants to create a landing page FROM SCRATCH (no source page). Based on their brief, design the full component structure.

## USER BRIEF:
"${brief}"

## SETTINGS:
- Vertical: ${verticalHint}
- Tone: ${toneHint}
- Steps: ${stepCountHint}
- Country: ${countryHint}
- Language: ${languageHint}

## TASK:
Design the full landing page structure. Return a JSON object with:

{
  "components": [
    {
      "id": "unique-id",
      "type": "headline|subheadline|body-text|image|button|quiz-question|testimonial|badge|list|progress-indicator|logo|footer",
      "content": "The actual content text or description of what this component should contain",
      "role": "attention-grabber|qualifier|engagement|trust-builder|desire-creator|objection-handler|action-driver|urgency-creator|value-demonstrator|brand-element|visual-support|navigation|redirect",
      "importance": "critical|important|optional",
      "persuasionTechniques": ["curiosity", "urgency", "social-proof", "micro-commitment", etc.],
      "position": 1,
      "notes": "Why this component works and its purpose in the funnel"
    }
  ],
  "sections": [
    {
      "type": "hook|quiz|cta|testimonial|benefits",
      "stepNumbers": [1],
      "description": "What this section does"
    }
  ],
  "flow": {
    "type": "multi-step|single-page|long-form",
    "totalSteps": 5,
    "hasProgressIndicator": true
  },
  "vertical": "adult|casual|mainstream",
  "tone": "playful-seductive|urgent-exciting|professional-trustworthy|friendly-approachable|bold-confident|intimate-personal|fun-lighthearted",
  "strategySummary": {
    "mainHook": "What grabs attention initially",
    "valueProposition": "The core promise/offer",
    "conversionMechanism": "How it converts (quiz, form, etc)",
    "keyPersuasionTactics": ["list", "of", "tactics"]
  }
}

## DESIGN RULES:
1. Every LP needs at minimum: a hook headline, engagement elements, and a CTA with redirect
2. For quiz funnels: include quiz-question components with realistic question text and answer options in the notes
3. Include a progress-indicator if multi-step
4. Include body-text components for hook/intro text
5. Include button components for each step transition and the final CTA
6. Design for mobile-first (375px width)
7. The last component should be a redirect/action-driver

## VERTICAL DETECTION (if auto):
- adult: Explicit language, suggestive content, hookup, NSA, discreet, affair
- casual: Sexy but not explicit, date, flirt, meet singles, fun
- mainstream: Completely SFW, find love, relationship, meaningful connection

Return ONLY valid JSON, no explanation.`;

  const response = await llm.generateText(prompt, {
    temperature: 0.5,
    maxTokens: 4000,
  });

  const jsonMatch = response.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in AI brief analysis response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const totalSteps = options.stepCount && options.stepCount > 0
    ? options.stepCount
    : parsed.flow?.totalSteps || 5;
  const isMultiStep = parsed.flow?.type === 'multi-step' || totalSteps > 1;

  return {
    components: validateComponents(parsed.components || []),
    sections: validateSections(parsed.sections, totalSteps, isMultiStep),
    flow: {
      type: parsed.flow?.type || (isMultiStep ? 'multi-step' : 'single-page'),
      totalSteps,
      hasProgressIndicator: parsed.flow?.hasProgressIndicator ?? isMultiStep,
    },
    vertical: validateVertical(
      options.vertical && options.vertical !== 'auto' ? options.vertical : parsed.vertical
    ),
    tone: validateTone(
      options.tone && options.tone !== 'auto' ? options.tone : parsed.tone
    ),
    strategySummary: {
      mainHook: parsed.strategySummary?.mainHook || 'Find local matches',
      valueProposition: parsed.strategySummary?.valueProposition || 'Connect with singles nearby',
      conversionMechanism: parsed.strategySummary?.conversionMechanism || 'Quiz funnel',
      keyPersuasionTactics: parsed.strategySummary?.keyPersuasionTactics || ['curiosity'],
    },
  };
}

/**
 * Deterministic fallback — defaults to multi-step quiz funnel
 */
function getFallbackBriefAnalysis(
  brief: string,
  options: Partial<GenerationOptions>
): ComponentAnalysis {
  const totalSteps = options.stepCount && options.stepCount > 0 ? options.stepCount : 5;
  const vertical = options.vertical && options.vertical !== 'auto' ? options.vertical : 'casual';

  // Build components for a standard quiz funnel
  const components: ComponentAnalysis['components'] = [
    {
      id: 'headline-1',
      type: 'headline',
      content: 'Find Your Perfect Match Tonight',
      role: 'attention-grabber',
      importance: 'critical',
      persuasionTechniques: ['curiosity', 'urgency'],
      position: 1,
      notes: 'Main headline to hook visitors — generated from brief fallback',
    },
    {
      id: 'body-1',
      type: 'body-text',
      content: brief.slice(0, 200),
      role: 'desire-creator',
      importance: 'important',
      persuasionTechniques: ['curiosity'],
      position: 2,
      notes: 'Intro text derived from user brief',
    },
    {
      id: 'progress-1',
      type: 'progress-indicator',
      content: 'Step 1 of ' + totalSteps,
      role: 'navigation',
      importance: 'important',
      persuasionTechniques: ['commitment-consistency'],
      position: 3,
      notes: 'Progress bar to show quiz completion',
    },
  ];

  // Add quiz questions for middle steps
  const quizSteps = Math.max(totalSteps - 2, 1);
  for (let i = 0; i < quizSteps; i++) {
    components.push({
      id: `quiz-${i + 1}`,
      type: 'quiz-question',
      content: `Quiz question ${i + 1}`,
      role: 'engagement',
      importance: 'important',
      persuasionTechniques: ['commitment-consistency', 'curiosity'],
      position: 4 + i,
      notes: `Quiz step ${i + 2} — engagement question`,
    });
  }

  // Final CTA
  components.push({
    id: 'cta-final',
    type: 'button',
    content: 'See Your Matches',
    role: 'action-driver',
    importance: 'critical',
    persuasionTechniques: ['urgency', 'curiosity'],
    position: components.length + 1,
    notes: 'Final CTA that redirects to offer',
  });

  const quizStepNumbers = Array.from({ length: quizSteps }, (_, i) => i + 2);
  const sections: ComponentAnalysis['sections'] = [
    { type: 'hook', stepNumbers: [1], description: 'Opening hook with headline', components: [] },
    { type: 'quiz', stepNumbers: quizStepNumbers, description: 'Quiz/qualification questions', components: [] },
    { type: 'cta', stepNumbers: [totalSteps], description: 'Final call-to-action', components: [] },
  ];

  return {
    id: uuidv4(),
    sourceUrl: undefined,
    analyzedAt: new Date(),
    components,
    sections,
    flow: {
      type: 'multi-step',
      totalSteps,
      hasProgressIndicator: true,
    },
    vertical: vertical as ComponentAnalysis['vertical'],
    tone: 'playful-seductive',
    trackingUrl: options.ctaUrlOverride || '',
    images: [],
    originalImages: [],
    strategySummary: {
      mainHook: 'Find Your Perfect Match Tonight',
      valueProposition: 'Connect with local singles',
      conversionMechanism: 'Quiz funnel',
      keyPersuasionTactics: ['curiosity', 'commitment-consistency'],
    },
    rawCheerioData: {
      headlines: [],
      buttons: [],
      images: [],
      forms: 0,
    },
  };
}
