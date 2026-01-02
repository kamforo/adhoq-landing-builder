import { getLLMProvider } from '@/lib/llm';
import type { ComponentAnalysis, LPTone, PersuasionTechnique } from '@/types/component-analysis';
import type { BuilderStylingOptions } from '@/lib/prompt-writer';

/**
 * Section types in the LP blueprint
 */
export type BlueprintSectionType = 'hook' | 'quiz' | 'cta';

/**
 * A single element within a section
 */
export interface BlueprintElement {
  type: 'headline' | 'subheadline' | 'image' | 'text' | 'button' | 'options' | 'progress' | 'countdown' | 'scarcity' | 'social-proof';
  content: string;           // The actual text or description
  purpose: string;           // Why this element exists
  style?: {
    emphasis?: 'high' | 'medium' | 'low';
    color?: string;
    size?: 'large' | 'medium' | 'small';
  };
}

/**
 * A single step/section in the blueprint
 */
export interface BlueprintSection {
  stepNumber: number;
  type: BlueprintSectionType;
  title: string;             // Internal title for this section
  elements: BlueprintElement[];
  transition: {
    action: 'next-step' | 'redirect';
    target?: string;         // URL for redirect
  };
  notes: string;             // Architect's notes about this section
}

/**
 * The complete LP blueprint - the Architect's plan
 */
export interface LPBlueprint {
  id: string;
  createdAt: Date;

  // Metadata
  vertical: 'adult' | 'casual' | 'mainstream';
  tone: LPTone;
  targetAudience: string;

  // Structure
  totalSteps: number;
  sections: BlueprintSection[];

  // Visual direction
  visualDirection: {
    colorPalette: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
    };
    typography: {
      headlineStyle: string;
      bodyStyle: string;
    };
    imagery: {
      heroImage?: string;     // URL to use
      backgroundStyle: string;
    };
  };

  // Conversion strategy
  conversionStrategy: {
    mainHook: string;
    valueProposition: string;
    primaryPersuasion: PersuasionTechnique[];
    urgencyTactics: string[];
  };

  // Technical requirements
  technical: {
    trackingUrl: string;
    requiresCountdown: boolean;
    requiresScarcity: boolean;
    requiresSocialProof: boolean;
  };

  // The full prompt for the builder (assembled from blueprint)
  builderPrompt: string;
}

/**
 * Architect Agent
 * Plans the LP structure before the builder creates it
 */
export async function planLandingPage(
  analysis: ComponentAnalysis,
  stylingOptions?: BuilderStylingOptions
): Promise<LPBlueprint> {
  const llm = getLLMProvider('grok');

  const prompt = `You are an expert Landing Page Architect. Your job is to create a detailed BLUEPRINT for a landing page based on this analysis.

## SOURCE ANALYSIS:

**Page Type:** ${analysis.flow.type}
**Steps:** ${analysis.flow.totalSteps}
**Vertical:** ${analysis.vertical.toUpperCase()} dating
**Tone:** ${analysis.tone}
**Tracking URL:** ${analysis.trackingUrl || 'https://example.com/track'}

**Strategy:**
- Hook: ${analysis.strategySummary.mainHook}
- Value: ${analysis.strategySummary.valueProposition}
- Mechanism: ${analysis.strategySummary.conversionMechanism}
- Tactics: ${analysis.strategySummary.keyPersuasionTactics.join(', ')}

**Original Images:**
${analysis.originalImages.slice(0, 3).map(img => `- ${img}`).join('\n') || '- No images available'}

**User Styling Preferences:**
${stylingOptions ? formatStylingPreferences(stylingOptions) : 'Use defaults'}

## YOUR TASK:

Create a detailed blueprint with EXACTLY this structure:

1. **HOOK Section (Step 1)**
   - Attention-grabbing headline
   - Hero image (from original or suggestion)
   - Short hook text
   - Single "Continue/Start" button

2. **QUIZ Section (Steps 2 to N-1)**
   - Each step has: Question headline + 2-4 answer options
   - NO separate continue button - answers advance
   - Keep focused, no images

3. **CTA Section (Final Step N)**
   - Final conversion headline
   - Urgency/scarcity elements
   - Single CTA button that redirects

## OUTPUT FORMAT (JSON):

{
  "vertical": "adult|casual|mainstream",
  "tone": "${analysis.tone}",
  "targetAudience": "description of target user",
  "totalSteps": ${analysis.flow.totalSteps},
  "sections": [
    {
      "stepNumber": 1,
      "type": "hook",
      "title": "Attention Hook",
      "elements": [
        {"type": "headline", "content": "Exact headline text", "purpose": "grab attention"},
        {"type": "image", "content": "image url or description", "purpose": "visual hook"},
        {"type": "text", "content": "hook paragraph", "purpose": "build curiosity"},
        {"type": "button", "content": "Start Now", "purpose": "begin journey"}
      ],
      "transition": {"action": "next-step"},
      "notes": "Why this hook works"
    },
    {
      "stepNumber": 2,
      "type": "quiz",
      "title": "Quiz Question 1",
      "elements": [
        {"type": "headline", "content": "Question text?", "purpose": "engage user"},
        {"type": "options", "content": "Option 1|Option 2|Option 3", "purpose": "micro-commitment"}
      ],
      "transition": {"action": "next-step"},
      "notes": "Why this question works"
    }
  ],
  "visualDirection": {
    "colorPalette": {
      "primary": "#hex",
      "secondary": "#hex",
      "accent": "#hex",
      "background": "#hex",
      "text": "#hex"
    },
    "typography": {
      "headlineStyle": "Bold, impactful, 28-32px",
      "bodyStyle": "Clean, readable, 16-18px"
    },
    "imagery": {
      "heroImage": "url or null",
      "backgroundStyle": "gradient/solid/image description"
    }
  },
  "conversionStrategy": {
    "mainHook": "The primary hook/promise",
    "valueProposition": "What they get",
    "primaryPersuasion": ["curiosity", "urgency"],
    "urgencyTactics": ["countdown", "limited spots"]
  },
  "technical": {
    "trackingUrl": "${analysis.trackingUrl || 'https://example.com/track'}",
    "requiresCountdown": true,
    "requiresScarcity": true,
    "requiresSocialProof": false
  }
}

IMPORTANT:
- Write ACTUAL headline and text content, not placeholders
- Match the ${analysis.vertical} vertical appropriately
- Use the ${analysis.tone} tone throughout
- Keep quiz sections focused (question + options only)
- Final CTA should feel urgent and compelling

Return ONLY valid JSON.`;

  try {
    const response = await llm.generateText(prompt, {
      temperature: 0.6,
      maxTokens: 4000,
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON in Architect response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Generate the builder prompt from the blueprint
    const builderPrompt = generateBuilderPromptFromBlueprint(parsed, analysis);

    return {
      id: `blueprint-${Date.now()}`,
      createdAt: new Date(),
      vertical: parsed.vertical || analysis.vertical,
      tone: parsed.tone || analysis.tone,
      targetAudience: parsed.targetAudience || 'Adult singles seeking connections',
      totalSteps: parsed.totalSteps || analysis.flow.totalSteps,
      sections: parsed.sections || [],
      visualDirection: parsed.visualDirection || getDefaultVisualDirection(analysis.vertical),
      conversionStrategy: parsed.conversionStrategy || {
        mainHook: analysis.strategySummary.mainHook,
        valueProposition: analysis.strategySummary.valueProposition,
        primaryPersuasion: analysis.strategySummary.keyPersuasionTactics,
        urgencyTactics: ['countdown', 'limited spots'],
      },
      technical: {
        trackingUrl: analysis.trackingUrl || 'https://example.com/track',
        requiresCountdown: parsed.technical?.requiresCountdown ?? true,
        requiresScarcity: parsed.technical?.requiresScarcity ?? true,
        requiresSocialProof: parsed.technical?.requiresSocialProof ?? false,
      },
      builderPrompt,
    };
  } catch (error) {
    console.error('Architect failed, using fallback:', error);
    return getFallbackBlueprint(analysis);
  }
}

/**
 * Format styling preferences for the prompt
 */
function formatStylingPreferences(options: BuilderStylingOptions): string {
  const parts: string[] = [];

  if (options.colorScheme === 'custom' && options.customColors) {
    parts.push(`Custom colors: Primary ${options.customColors.primary}, CTA ${options.customColors.cta}`);
  }
  if (options.tone && options.tone !== 'auto') {
    parts.push(`Tone: ${options.tone}`);
  }
  if (options.targetAge && options.targetAge !== 'all') {
    parts.push(`Target age: ${options.targetAge}`);
  }
  if (options.language && options.language !== 'en') {
    parts.push(`Language: ${options.language}`);
  }
  if (options.customInstructions) {
    parts.push(`Custom: ${options.customInstructions}`);
  }

  return parts.length > 0 ? parts.join('\n') : 'Use defaults';
}

/**
 * Generate builder prompt from blueprint
 */
function generateBuilderPromptFromBlueprint(
  blueprint: Partial<LPBlueprint>,
  analysis: ComponentAnalysis
): string {
  const sections = blueprint.sections || [];

  let stepInstructions = '';
  for (const section of sections) {
    stepInstructions += `\n### Step ${section.stepNumber} (${section.type.toUpperCase()}): ${section.title}\n`;
    for (const el of section.elements || []) {
      stepInstructions += `- ${el.type}: "${el.content}" (${el.purpose})\n`;
    }
    stepInstructions += `Transition: ${section.transition?.action}${section.transition?.target ? ` to ${section.transition.target}` : ''}\n`;
  }

  const colors = blueprint.visualDirection?.colorPalette || getDefaultVisualDirection(analysis.vertical).colorPalette;

  return `You are building a ${analysis.vertical} dating landing page.

## EXACT STRUCTURE TO BUILD:

Total Steps: ${blueprint.totalSteps || analysis.flow.totalSteps}
${stepInstructions}

## VISUAL DIRECTION:

Colors:
- Primary: ${colors.primary}
- Secondary: ${colors.secondary}
- Accent/CTA: ${colors.accent}
- Background: ${colors.background}
- Text: ${colors.text}

Typography:
- Headlines: ${blueprint.visualDirection?.typography?.headlineStyle || 'Bold, 28-32px'}
- Body: ${blueprint.visualDirection?.typography?.bodyStyle || 'Clean, 16-18px'}

## CONVERSION ELEMENTS:

${blueprint.technical?.requiresCountdown ? '- Add countdown timer in final CTA step (top bar)' : ''}
${blueprint.technical?.requiresScarcity ? '- Add scarcity text above CTA button' : ''}
${blueprint.technical?.requiresSocialProof ? '- Add social proof below hook headline' : ''}

## TRACKING URL:

All CTAs redirect to: ${analysis.trackingUrl || blueprint.technical?.trackingUrl}

## TECHNICAL REQUIREMENTS:

1. Single HTML file with inline CSS and JS
2. Mobile-first responsive design
3. Use min-height: 100vh (never max-height)
4. Never use overflow: hidden on body/containers
5. Font sizes in px/rem (not vw)
6. Desktop: center with max-width 600px
7. Touch targets at least 48px

MULTI-STEP JS STRUCTURE:
\`\`\`javascript
const REDIRECT_URL = "${analysis.trackingUrl || blueprint.technical?.trackingUrl}";
const TOTAL_STEPS = ${blueprint.totalSteps || analysis.flow.totalSteps};
let currentStep = 1;

function nextStep() {
  document.getElementById('step' + currentStep).classList.remove('active');
  currentStep++;
  if (currentStep > TOTAL_STEPS) {
    window.location.href = REDIRECT_URL;
  } else {
    document.getElementById('step' + currentStep).classList.add('active');
  }
}
\`\`\`

## CRITICAL RULES:

1. HOOK (Step 1): Hero + headline + Continue button
2. QUIZ (Middle steps): Question + answer options ONLY - answers call nextStep()
3. CTA (Final step): Urgency + final button that redirects
4. Follow the EXACT content provided in the blueprint above

Generate complete HTML starting with <!DOCTYPE html>`;
}

/**
 * Get default visual direction based on vertical
 */
function getDefaultVisualDirection(vertical: string) {
  const directions: Record<string, LPBlueprint['visualDirection']> = {
    adult: {
      colorPalette: {
        primary: '#e91e63',
        secondary: '#9c27b0',
        accent: '#ff1744',
        background: '#1a1a2e',
        text: '#ffffff',
      },
      typography: {
        headlineStyle: 'Bold, seductive, 28-32px',
        bodyStyle: 'Clean, 16-18px',
      },
      imagery: {
        backgroundStyle: 'Dark gradient with subtle pattern',
      },
    },
    casual: {
      colorPalette: {
        primary: '#ff6b6b',
        secondary: '#4ecdc4',
        accent: '#ffd93d',
        background: '#2d3436',
        text: '#ffffff',
      },
      typography: {
        headlineStyle: 'Playful, bold, 28-32px',
        bodyStyle: 'Friendly, 16-18px',
      },
      imagery: {
        backgroundStyle: 'Gradient with warm tones',
      },
    },
    mainstream: {
      colorPalette: {
        primary: '#667eea',
        secondary: '#764ba2',
        accent: '#f093fb',
        background: '#ffffff',
        text: '#333333',
      },
      typography: {
        headlineStyle: 'Clean, professional, 28-32px',
        bodyStyle: 'Readable, 16-18px',
      },
      imagery: {
        backgroundStyle: 'Light, clean, professional',
      },
    },
  };

  return directions[vertical] || directions.casual;
}

/**
 * Fallback blueprint if AI fails
 */
function getFallbackBlueprint(analysis: ComponentAnalysis): LPBlueprint {
  const sections: BlueprintSection[] = [];

  // Hook section
  sections.push({
    stepNumber: 1,
    type: 'hook',
    title: 'Attention Hook',
    elements: [
      { type: 'headline', content: analysis.strategySummary.mainHook || 'Find Your Perfect Match', purpose: 'grab attention' },
      { type: 'text', content: analysis.strategySummary.valueProposition || 'Connect with singles near you', purpose: 'build interest' },
      { type: 'button', content: 'Start Now', purpose: 'begin journey' },
    ],
    transition: { action: 'next-step' },
    notes: 'Hook based on original analysis',
  });

  // Quiz sections
  const quizCount = Math.max(1, analysis.flow.totalSteps - 2);
  for (let i = 0; i < quizCount; i++) {
    sections.push({
      stepNumber: i + 2,
      type: 'quiz',
      title: `Quiz Question ${i + 1}`,
      elements: [
        { type: 'headline', content: `Question ${i + 1}?`, purpose: 'engage user' },
        { type: 'options', content: 'Option A|Option B|Option C', purpose: 'micro-commitment' },
      ],
      transition: { action: 'next-step' },
      notes: 'Quiz step for engagement',
    });
  }

  // CTA section
  sections.push({
    stepNumber: analysis.flow.totalSteps,
    type: 'cta',
    title: 'Final Conversion',
    elements: [
      { type: 'headline', content: 'Your Match is Waiting!', purpose: 'create urgency' },
      { type: 'scarcity', content: 'Only 3 spots left', purpose: 'urgency' },
      { type: 'button', content: 'See Matches Now', purpose: 'convert' },
    ],
    transition: { action: 'redirect', target: analysis.trackingUrl },
    notes: 'Final conversion step',
  });

  const visualDirection = getDefaultVisualDirection(analysis.vertical);

  return {
    id: `blueprint-fallback-${Date.now()}`,
    createdAt: new Date(),
    vertical: analysis.vertical,
    tone: analysis.tone,
    targetAudience: 'Singles seeking connections',
    totalSteps: analysis.flow.totalSteps,
    sections,
    visualDirection,
    conversionStrategy: {
      mainHook: analysis.strategySummary.mainHook,
      valueProposition: analysis.strategySummary.valueProposition,
      primaryPersuasion: analysis.strategySummary.keyPersuasionTactics,
      urgencyTactics: ['countdown', 'limited spots'],
    },
    technical: {
      trackingUrl: analysis.trackingUrl || 'https://example.com/track',
      requiresCountdown: true,
      requiresScarcity: true,
      requiresSocialProof: false,
    },
    builderPrompt: generateBuilderPromptFromBlueprint({ sections, totalSteps: analysis.flow.totalSteps, visualDirection }, analysis),
  };
}

export type { BuilderStylingOptions };
