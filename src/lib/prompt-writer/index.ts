import { getLLMProvider } from '@/lib/llm';
import type {
  ComponentAnalysis,
  AnalyzedComponent,
  BuilderPrompt,
  DatingVertical,
  LPTone,
  DEFAULT_PROMPT_RULES,
} from '@/types/component-analysis';

/**
 * Prompt Writer Agent
 * Takes the component analysis and writes a custom prompt for the builder
 */
export async function writeBuilderPrompt(
  analysis: ComponentAnalysis,
  customRules?: Partial<typeof DEFAULT_PROMPT_RULES>
): Promise<BuilderPrompt> {
  const llm = getLLMProvider('grok');

  // Get critical and important components
  const criticalComponents = analysis.components.filter(c => c.importance === 'critical');
  const importantComponents = analysis.components.filter(c => c.importance === 'important');
  const optionalComponents = analysis.components.filter(c => c.importance === 'optional');

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

**CRITICAL COMPONENTS (Must Include):**
${criticalComponents.map(c => formatComponentForPrompt(c)).join('\n')}

**IMPORTANT COMPONENTS (Should Include):**
${importantComponents.map(c => formatComponentForPrompt(c)).join('\n')}

**OPTIONAL COMPONENTS (Can Reimagine):**
${optionalComponents.slice(0, 5).map(c => formatComponentForPrompt(c)).join('\n')}

**ORIGINAL IMAGES AVAILABLE:**
${analysis.originalImages.slice(0, 5).map(img => `- ${img}`).join('\n')}

## YOUR TASK:

Write a builder prompt with these sections:

1. **SYSTEM_CONTEXT**: Set up what the builder is creating (2-3 sentences)

2. **REQUIREMENTS**: List MUST-HAVE elements:
   - The flow structure
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
   - Mobile responsiveness
   - Inline styles (no external CSS)

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

    // Combine into full prompt
    const fullPrompt = assembleFullPrompt(parsed, analysis);

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
  analysis: ComponentAnalysis
): string {
  return `${parts.systemContext}

## REQUIREMENTS (Must Have)

${parts.requirements}

## CREATIVE SUGGESTIONS (Be Creative!)

${parts.suggestions}

## COMPONENT INSTRUCTIONS

${parts.componentInstructions}

## TECHNICAL REQUIREMENTS

${parts.technicalRequirements}

## CRITICAL URLS

- **Tracking/Redirect URL**: ${analysis.trackingUrl || '[TRACKING_URL_REQUIRED]'}
- All CTAs must point to this URL
- Multi-step flows MUST redirect to this URL after the last step

## IMAGES TO USE

${analysis.originalImages.length > 0
  ? `Use these images from the original:\n${analysis.originalImages.slice(0, 5).map(img => `- ${img}`).join('\n')}`
  : 'Use appropriate placeholder images for the vertical'}

## OUTPUT

Generate a complete, single HTML file with:
- All CSS inline (no external stylesheets)
- All JavaScript inline (for multi-step pages)
- Proper viewport meta tag for mobile
- Start with <!DOCTYPE html> and end with </html>`;
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
2. ${isMultiStep ? `${analysis.flow.totalSteps} quiz steps with Yes/No or multiple choice` : 'Clear value proposition'}
3. CTA buttons throughout
4. Final redirect to: ${analysis.trackingUrl || '[TRACKING_URL]'}
${isMultiStep ? '5. Progress indicator showing current step' : ''}
${isMultiStep ? '6. Only ONE step visible at a time (JS-controlled)' : ''}`;

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
const questionList = [...];
const REDIRECT_URL = "${analysis.trackingUrl || '[TRACKING_URL]'}";
let activeIndex = 0;

function showStep(index) { /* show only step[index] */ }
function nextStep() {
  activeIndex++;
  if (activeIndex >= questionList.length) {
    window.location.href = REDIRECT_URL;
  } else {
    showStep(activeIndex);
  }
}`
    : `Single page with clear CTA flow to: ${analysis.trackingUrl}`;

  const fullPrompt = assembleFullPrompt(
    { systemContext, requirements, suggestions, componentInstructions, technicalRequirements },
    analysis
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
