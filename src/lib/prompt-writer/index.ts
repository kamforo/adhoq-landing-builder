import { getLLMProvider } from '@/lib/llm';
import type {
  ComponentAnalysis,
  AnalyzedComponent,
  BuilderPrompt,
  DatingVertical,
  LPTone,
  DEFAULT_PROMPT_RULES,
} from '@/types/component-analysis';
import type { ColorScheme, LayoutStyle, LinkHandling, CustomColors, ToneStyle, TargetAgeGroup } from '@/types/generation-options';
import type { AddElementOptions } from '@/types/builder';
import type { LanguageCode, CountryCode } from '@/types/languages';
import { LANGUAGES, COUNTRIES, LANGUAGE_GUIDELINES } from '@/types/languages';

/**
 * Styling options for the builder
 */
export interface BuilderStylingOptions {
  colorScheme?: ColorScheme;
  customColors?: CustomColors;
  layoutStyle?: LayoutStyle;
  linkHandling?: LinkHandling;
  textHandling?: string;
  tone?: ToneStyle;
  targetAge?: TargetAgeGroup;
  language?: LanguageCode;
  country?: CountryCode;
  creativity?: number;
  customInstructions?: string;
  addElements?: AddElementOptions;
  brief?: string;
}

/**
 * Prompt Writer Agent
 * Takes the component analysis and writes a custom prompt for the builder
 */
export async function writeBuilderPrompt(
  analysis: ComponentAnalysis,
  stylingOptions?: BuilderStylingOptions,
  customRules?: Partial<typeof DEFAULT_PROMPT_RULES>
): Promise<BuilderPrompt> {
  const llm = getLLMProvider('grok');

  // Get critical and important components
  const criticalComponents = analysis.components.filter(c => c.importance === 'critical');
  const importantComponents = analysis.components.filter(c => c.importance === 'important');
  const optionalComponents = analysis.components.filter(c => c.importance === 'optional');

  // Build styling instructions
  const stylingInstructions = buildStylingInstructions(stylingOptions);

  const prompt = `You are an expert prompt engineer specializing in landing page generation prompts.

Your task: Write a detailed, actionable prompt that another AI will use to BUILD a new landing page based on this analysis.

## ANALYSIS DATA:

**Page Type:** ${analysis.flow.type}
**Total Steps:** ${analysis.flow.totalSteps}
**Vertical:** ${analysis.vertical.toUpperCase()} dating
**Tone:** ${analysis.tone}
**Tracking URL:** ${analysis.trackingUrl || 'MUST BE PROVIDED'}

**Strategy Summary:**
- Main Hook: ${analysis.strategySummary.mainHook}
- Value Proposition: ${analysis.strategySummary.valueProposition}
- Conversion Mechanism: ${analysis.strategySummary.conversionMechanism}
- Key Tactics: ${analysis.strategySummary.keyPersuasionTactics.join(', ')}

## STYLING PREFERENCES (User Selected):

${stylingInstructions}

**CRITICAL COMPONENTS (Must Include):**
${criticalComponents.map(c => formatComponentForPrompt(c)).join('\n')}

**IMPORTANT COMPONENTS (Should Include):**
${importantComponents.map(c => formatComponentForPrompt(c)).join('\n')}

**OPTIONAL COMPONENTS (Can Reimagine):**
${optionalComponents.slice(0, 5).map(c => formatComponentForPrompt(c)).join('\n')}

**ORIGINAL IMAGES AVAILABLE:**
${analysis.originalImages.slice(0, 5).map(img => `- ${img}`).join('\n')}

## LANDING PAGE STRUCTURE (CRITICAL - FOLLOW THIS EXACTLY):

Multi-step LPs have THREE distinct section types:

### 1. HOOK SECTION (Step 1 only)
- Attention-grabbing headline
- Hero image (if available from original images)
- Brief hook text or urgency message
- Single "Continue" or "Start" button to begin quiz
- This is the ONLY step that should have a standalone CTA button

### 2. QUIZ SECTION (Steps 2 to N-1)
- Question headline
- 2-4 answer options as buttons
- CRITICAL: When answer options call nextStep(), do NOT add a separate "Continue/Next" button!
- The answer buttons ARE the navigation - clicking an answer advances to next step
- No hero images in quiz steps (keep them simple and focused)

### 3. CTA SECTION (Final Step ONLY - Step N)
- Final conversion message/headline
- Urgency/scarcity elements (countdown, spots remaining, etc.)
- Single prominent CTA button that redirects to tracking URL
- There should be ONLY ONE final CTA step, not multiple

## YOUR TASK:

Write a builder prompt with these sections:

1. **SYSTEM_CONTEXT**: Set up what the builder is creating (2-3 sentences)

2. **REQUIREMENTS**: List MUST-HAVE elements:
   - The flow structure following HOOK → QUIZ → CTA pattern
   - Critical components that must exist
   - The redirect URL behavior
   - Technical requirements (JS structure for multi-step, etc.)

3. **SUGGESTIONS**: Creative guidance (NOT strict rules):
   - Color/style ideas based on the vertical
   - Layout possibilities
   - Animation/interaction ideas
   - Tone suggestions

4. **COMPONENT_INSTRUCTIONS**: For each critical/important component, explain:
   - What it should do
   - How to adapt it creatively
   - What makes it effective

5. **TECHNICAL_REQUIREMENTS**: Specific code requirements:
   - For multi-step: JS structure with showStep, nextStep, etc.
   - Final redirect to tracking URL
   - QUIZ STEPS: Answer options call nextStep() - NO separate Continue button!
   - RESPONSIVE DESIGN (critical):
     * Must work on BOTH mobile AND desktop
     * Use min-height: 100vh (NEVER max-height)
     * NEVER use overflow: hidden on body or containers
     * Use px/rem for fonts (NEVER vw - it breaks on desktop)
     * Add max-width: 600px container for desktop centering
   - Inline styles with media queries for responsive adjustments

## VERTICAL GUIDANCE:

${getVerticalGuidance(analysis.vertical)}

## TONE GUIDANCE:

${getToneGuidance(analysis.tone)}

## OUTPUT FORMAT:

Return a JSON object:
{
  "systemContext": "...",
  "requirements": "...",
  "suggestions": "...",
  "componentInstructions": "...",
  "technicalRequirements": "..."
}

Write prompts that are:
- Specific but allow creativity
- Clear about what's required vs optional
- Focused on conversion and user experience
- Appropriate for the ${analysis.vertical} vertical

Return ONLY the JSON.`;

  try {
    const response = await llm.generateText(prompt, {
      temperature: 0.5,
      maxTokens: 3000,
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Combine into full prompt (include styling options)
    const fullPrompt = assembleFullPrompt(parsed, analysis, stylingOptions);

    return {
      systemContext: parsed.systemContext || '',
      requirements: parsed.requirements || '',
      suggestions: parsed.suggestions || '',
      componentInstructions: parsed.componentInstructions || '',
      technicalRequirements: parsed.technicalRequirements || '',
      fullPrompt,
    };
  } catch (error) {
    console.error('Prompt writer failed, using fallback:', error);
    return getFallbackPrompt(analysis);
  }
}

/**
 * Build styling instructions based on user options
 */
function buildStylingInstructions(options?: BuilderStylingOptions): string {
  if (!options) {
    return 'Use defaults: Generate matching color palette, mobile-optimized layout, replace all links with tracking URL.';
  }

  const parts: string[] = [];

  // Color scheme
  switch (options.colorScheme) {
    case 'keep':
      parts.push('**Colors:** Keep the original color scheme from the source page.');
      break;
    case 'custom':
      if (options.customColors) {
        const colors = options.customColors;
        parts.push(`**Colors (Custom):**
- Primary color: ${colors.primary || '#e91e63'}
- CTA button color: ${colors.cta || '#ff3366'}
- Background color: ${colors.background || '#1a1a2e'}
- Text color: ${colors.text || '#ffffff'}
USE THESE EXACT COLORS in the generated page.`);
      } else {
        parts.push('**Colors:** Generate a color palette that matches the vertical.');
      }
      break;
    default:
      parts.push('**Colors:** Generate a color palette that matches the vertical and creates high contrast for CTAs.');
  }

  // Layout style
  switch (options.layoutStyle) {
    case 'keep-structure':
      parts.push('**Layout:** Maintain the original page structure and flow as closely as possible.');
      break;
    case 'generate-new':
      parts.push('**Layout:** Create a completely new and creative layout design. Feel free to experiment.');
      break;
    default:
      parts.push(`**Layout:** Mobile-first responsive design:
- Use min-height: 100vh (NOT max-height) so content can scroll if needed
- NEVER use overflow: hidden on body or steps
- CTAs should be easily reachable on mobile (large touch targets, 48px minimum)
- Centered content with proper padding
- CRITICAL: Must work on BOTH mobile AND desktop
- Desktop: max-width container (600px), centered, readable font sizes
- Mobile: full-width, appropriately sized text
- Use px or rem for font sizes (NOT vw which breaks on desktop)
- Recommended sizes: headlines 24-32px, body 16-18px, buttons 16-18px`);
  }

  // Link handling
  switch (options.linkHandling) {
    case 'keep':
      parts.push('**Links:** Keep all original links unchanged.');
      break;
    case 'remove-non-cta':
      parts.push('**Links:** Remove all links except CTA buttons. Only CTAs should be clickable.');
      break;
    default:
      parts.push('**Links:** ALL clickable elements (buttons, links, images) must point to the tracking URL.');
  }

  // Text handling
  if (options.textHandling === 'keep') {
    parts.push('**Text:** Keep the original text content as-is.');
  } else if (options.textHandling === 'rewrite-complete') {
    parts.push('**Text:** Completely rewrite all text content while maintaining the same meaning and persuasion techniques.');
  } else {
    parts.push('**Text:** Slightly rewrite text for uniqueness while preserving the core message.');
  }

  // Tone/Voice
  if (options.tone && options.tone !== 'auto') {
    const toneDescriptions: Record<string, string> = {
      'playful-flirty': 'Use a playful, flirty, teasing tone. Light-hearted and fun with witty language.',
      'urgent-exciting': 'Create urgency and excitement. High energy, FOMO-inducing, "act now" messaging.',
      'intimate-seductive': 'Use intimate, seductive language. Personal, sensual, direct and alluring.',
      'friendly-casual': 'Keep it friendly and casual. Warm, approachable, like talking to a friend.',
      'bold-confident': 'Be bold and confident. Strong statements, assertive, powerful messaging.',
      'romantic-emotional': 'Use romantic, emotional language. Heartfelt, focus on connection and feelings.',
      'mysterious-intriguing': 'Create mystery and intrigue. Curiosity-driven, secretive, leave them wanting more.',
    };
    parts.push(`**Tone/Voice:** ${toneDescriptions[options.tone] || options.tone}`);
  }

  // Target Age Group
  if (options.targetAge && options.targetAge !== 'all') {
    const ageDescriptions: Record<string, string> = {
      '30+': 'Target mature adults (30+). Professional yet warm, focus on genuine connections and life experience.',
      '40+': 'Target adults 40 and older. Emphasize maturity, experience, and quality over quantity.',
      '50+': 'Target adults 50 and older. Focus on companionship, shared values, and meaningful connections.',
      '60+': 'Target seniors (60+). Warm, respectful, focus on companionship, shared interests, and life wisdom.',
    };
    parts.push(`**Target Audience:** ${ageDescriptions[options.targetAge] || `Age group: ${options.targetAge}`}`);
  }

  // Language & Country
  if (options.language && options.language !== 'en') {
    const langConfig = LANGUAGES[options.language];
    const countryConfig = options.country ? COUNTRIES[options.country] : null;
    const guidelines = LANGUAGE_GUIDELINES[options.language] || '';

    parts.push(`**LANGUAGE: ${langConfig.name.toUpperCase()} (${langConfig.nativeName})**

CRITICAL: ALL text content MUST be written in ${langConfig.name}.
${countryConfig ? `Target country: ${countryConfig.name} (${countryConfig.flag})` : ''}

Language Guidelines:
${guidelines}

${langConfig.direction === 'rtl' ? `
RTL SUPPORT REQUIRED:
- Add dir="rtl" to the HTML element
- Use CSS: direction: rtl; text-align: right;
- Ensure all layout elements respect RTL flow
` : ''}
DO NOT use English except for:
- Technical code/JavaScript variable names
- URLs and tracking links
- HTML attributes

Translate/localize:
- All headlines and body text
- Button text (CTAs)
- Quiz questions and answers
- Urgency/scarcity messages
- Social proof text
- Error messages (if any)

Make it sound NATURAL in ${langConfig.name}, not like a translation.`);
  } else if (options.language === 'en' && options.country && options.country !== 'US') {
    // English but different country
    const countryConfig = COUNTRIES[options.country];
    if (countryConfig) {
      const regionalNotes: Record<string, string> = {
        'GB': 'Use British English spellings (colour, favourite, centre). Avoid Americanisms.',
        'AU': 'Use Australian English. Can use casual/informal tone. Include local references if relevant.',
        'NZ': 'Use New Zealand English. Similar to Australian but with local nuances.',
        'CA': 'Use Canadian English (mix of British/American). Be polite and friendly.',
        'ZA': 'Use South African English. Can be slightly more formal.',
        'IE': 'Use Irish English. Warm and friendly tone.',
      };
      parts.push(`**Regional English: ${countryConfig.name} ${countryConfig.flag}**
${regionalNotes[options.country] || 'Adapt English for the local audience.'}`);
    }
  }

  // Custom instructions
  if (options.customInstructions) {
    parts.push(`**Custom Instructions:** ${options.customInstructions}`);
  }

  // Conversion Elements (dynamic text generation with positions)
  if (options.addElements) {
    const elements = options.addElements;
    const conversionParts: string[] = [];

    if (elements.countdown?.enabled) {
      conversionParts.push(`- **Countdown Timer**
  POSITION: Fixed bar at TOP of the CTA section (final step) - NOT in quiz steps
  FORMAT: Horizontal bar with contrasting background color
  Generate text examples: "Offer expires in: 4:59" | "Access closes in: 4:59" | "Her pics disappear in: 4:59"`);
    }

    if (elements.scarcity?.enabled) {
      conversionParts.push(`- **Scarcity Indicator**
  POSITION: Directly ABOVE the CTA button (small text, not a bar)
  FORMAT: Single line of highlighted text (yellow/gold color recommended)
  Generate text examples: "Only 3 spots left tonight" | "2 women nearby waiting" | "Limited: 5 slots remaining"`);
    }

    if (elements.socialProof?.enabled) {
      conversionParts.push(`- **Social Proof**
  POSITION: BELOW the main headline in Hook section OR as floating toast notification
  FORMAT: Either inline text below headline OR animated toast popup in corner
  Generate text examples: "47 people matched this hour" | "Sarah just found a match!" | "23 people viewing now"`);
    }

    if (conversionParts.length > 0) {
      parts.push(`**Conversion Elements to Add:**
IMPORTANT: Each element has a SPECIFIC position - do NOT place them all together!

${conversionParts.join('\n\n')}

PLACEMENT SUMMARY:
- Countdown: TOP bar in CTA section only
- Scarcity: Small text directly above CTA button
- Social Proof: Below headline OR floating toast (different location than others)`);
    }
  }

  return parts.join('\n\n');
}

/**
 * Format a component for the prompt
 */
function formatComponentForPrompt(component: AnalyzedComponent): string {
  return `- **${component.type}** [${component.role}]: "${component.content.slice(0, 100)}"
    - Importance: ${component.importance}
    - Techniques: ${component.persuasionTechniques.join(', ')}
    - Notes: ${component.notes}`;
}

/**
 * Get vertical-specific guidance
 */
function getVerticalGuidance(vertical: DatingVertical): string {
  switch (vertical) {
    case 'adult':
      return `ADULT DATING:
- Content CAN be explicit and sexually suggestive
- Use seductive, intimate language
- Images should be provocative (but use original images or appropriate placeholders)
- Create a sense of excitement and naughtiness
- Words like "hookup", "no strings", "discreet" are appropriate`;

    case 'casual':
      return `CASUAL DATING:
- Content is sexy but NOT explicit
- Flirty, playful, fun tone
- Suggestive but stays SFW-ish
- Focus on meeting, dating, fun connections
- Can be a bit cheeky but not crude`;

    case 'mainstream':
      return `MAINSTREAM DATING:
- Completely SFW, family-friendly
- Focus on love, relationships, meaningful connections
- Professional, trustworthy feel
- Romantic but not sexual
- Words like "find love", "soulmate", "relationship" are key`;
  }
}

/**
 * Get tone-specific guidance
 */
function getToneGuidance(tone: LPTone): string {
  const tones: Record<LPTone, string> = {
    'playful-seductive': 'Use flirty, teasing language. Create intrigue and anticipation.',
    'urgent-exciting': 'High energy! Create FOMO and excitement. "Don\'t miss out!"',
    'professional-trustworthy': 'Clean, credible, reassuring. Build trust with social proof.',
    'friendly-approachable': 'Warm, welcoming tone. Like talking to a friend.',
    'bold-confident': 'Strong statements. Assertive and powerful. "This WILL work for you."',
    'intimate-personal': 'Direct, one-on-one feel. "I created this for YOU."',
    'fun-lighthearted': 'Casual, fun, doesn\'t take itself too seriously. Emoji-friendly.',
  };
  return tones[tone] || tones['playful-seductive'];
}

/**
 * Assemble the full prompt from parts
 */
function assembleFullPrompt(
  parts: {
    systemContext: string;
    requirements: string;
    suggestions: string;
    componentInstructions: string;
    technicalRequirements: string;
  },
  analysis: ComponentAnalysis,
  stylingOptions?: BuilderStylingOptions
): string {
  // Ensure all parts are strings
  const stringify = (val: unknown): string => {
    if (typeof val === 'string') return val;
    if (val === null || val === undefined) return '';
    return JSON.stringify(val, null, 2);
  };

  // Build styling section
  const stylingSection = stylingOptions ? buildStylingInstructions(stylingOptions) : '';

  return `${stringify(parts.systemContext)}

## REQUIREMENTS (Must Have)

${stringify(parts.requirements)}

## CREATIVE SUGGESTIONS (Be Creative!)

${stringify(parts.suggestions)}

## STYLING PREFERENCES (User Selected)

${stylingSection || 'Use defaults: Generate matching colors, mobile-optimized layout.'}

## COMPONENT INSTRUCTIONS

${stringify(parts.componentInstructions)}

## TECHNICAL REQUIREMENTS

${stringify(parts.technicalRequirements)}

## CRITICAL URLS

- **Tracking/Redirect URL**: ${analysis.trackingUrl || '[TRACKING_URL_REQUIRED]'}
- All CTAs must point to this URL
- Multi-step flows MUST redirect to this URL after the last step

## IMAGES TO USE

${analysis.originalImages.length > 0
  ? `Use these images from the original:\n${analysis.originalImages.slice(0, 5).map(img => `- ${img}`).join('\n')}`
  : 'NO IMAGES AVAILABLE — Do NOT use any <img> tags or image URLs. Design the page using colors, gradients, and typography only. No placeholder or stock images.'}

## OUTPUT

Generate a complete, single HTML file with:
- All CSS inline (no external stylesheets)
- All JavaScript inline (for multi-step pages)
- Proper viewport meta tag for mobile
- Start with <!DOCTYPE html> and end with </html>

## CRITICAL RULES (DO NOT IGNORE)

**Structure Rules:**
1. HOOK section (Step 1): ${analysis.originalImages.length > 0 ? 'Hero image + headline' : 'Headline (no images available)'} + single Continue button
2. QUIZ sections: Answer options ONLY - NO separate Continue/Next button when answers advance
3. CTA section (Final Step): ONE final step only, with conversion elements and final CTA

**Responsive Rules:**
4. NEVER use overflow: hidden on body or step containers
5. NEVER use max-height: 100vh (use min-height instead)
6. NEVER use vw units for font sizes (they break on desktop)
7. ALWAYS center content with max-width: 600px on desktop
8. Use font sizes in px or rem: headlines 24-32px, body 16-18px
9. Buttons must be at least 48px tall for touch targets

**Image Rules:**
${analysis.originalImages.length > 0
  ? `10. Use hero image from ORIGINAL IMAGES in the Hook section
11. Keep quiz steps image-free for clean, focused UX`
  : `10. NO original images exist — do NOT add any <img> tags or image URLs anywhere
11. Use bold colors, gradients, and strong typography to create visual impact instead`}`;

}

/**
 * Fallback prompt if AI fails
 */
function getFallbackPrompt(analysis: ComponentAnalysis): BuilderPrompt {
  const isMultiStep = analysis.flow.type === 'multi-step';

  const systemContext = `You are building a ${analysis.vertical} dating landing page with a ${analysis.flow.type} flow and ${analysis.tone} tone.`;

  const requirements = `
REQUIRED ELEMENTS:
1. Main headline that grabs attention
2. ${isMultiStep ? `${analysis.flow.totalSteps} steps following HOOK → QUIZ → CTA structure` : 'Clear value proposition'}
3. Final redirect to: ${analysis.trackingUrl || '[TRACKING_URL]'}
${isMultiStep ? `
STRUCTURE FOR MULTI-STEP:
- Step 1 (HOOK): Hero image + headline + Continue button
- Steps 2 to ${analysis.flow.totalSteps - 1} (QUIZ): Questions with answer options ONLY (NO separate Continue button!)
- Step ${analysis.flow.totalSteps} (CTA): Final conversion step with single CTA button` : ''}`;

  const suggestions = `
CREATIVE FREEDOM:
- Try different color schemes appropriate for ${analysis.vertical} dating
- Experiment with layouts (centered, split-screen, card-based)
- Add subtle animations or hover effects
- Match the ${analysis.tone} tone in all copy`;

  const componentInstructions = analysis.components
    .filter(c => c.importance !== 'optional')
    .map(c => `- ${c.type}: ${c.content.slice(0, 50)}... (${c.role})`)
    .join('\n');

  const technicalRequirements = isMultiStep
    ? `
MULTI-STEP JS STRUCTURE:
const REDIRECT_URL = "${analysis.trackingUrl || '[TRACKING_URL]'}";
let currentStep = 1;
const TOTAL_STEPS = ${analysis.flow.totalSteps};

function nextStep() {
  document.getElementById('step' + currentStep).classList.remove('active');
  currentStep++;
  if (currentStep > TOTAL_STEPS) {
    window.location.href = REDIRECT_URL;
  } else {
    document.getElementById('step' + currentStep).classList.add('active');
  }
}

CRITICAL STRUCTURE RULES:
- HOOK (Step 1): Has Continue button
- QUIZ (Steps 2-${analysis.flow.totalSteps - 1}): Answer options call nextStep() - NO separate button!
- CTA (Step ${analysis.flow.totalSteps}): Final button redirects to REDIRECT_URL

CRITICAL RESPONSIVE RULES:
- NEVER use overflow: hidden on body/containers
- Use min-height: 100vh (NOT max-height)
- Use px/rem for fonts (NOT vw)
- max-width: 600px centered container for desktop
- Buttons at least 48px tall`
    : `Single page with clear CTA flow to: ${analysis.trackingUrl}

CRITICAL RESPONSIVE RULES:
- NEVER use overflow: hidden
- Use min-height: 100vh (NOT max-height)
- Use px/rem for fonts (NOT vw)
- max-width: 600px centered container for desktop`;

  const fullPrompt = assembleFullPrompt(
    { systemContext, requirements, suggestions, componentInstructions, technicalRequirements },
    analysis,
    undefined // No styling options in fallback
  );

  return {
    systemContext,
    requirements,
    suggestions,
    componentInstructions,
    technicalRequirements,
    fullPrompt,
  };
}

/**
 * Quick prompt writer without AI (for testing or fallback)
 */
export function writeQuickPrompt(analysis: ComponentAnalysis): BuilderPrompt {
  return getFallbackPrompt(analysis);
}
