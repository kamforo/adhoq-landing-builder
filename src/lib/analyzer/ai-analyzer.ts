import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { getLLMProvider } from '@/lib/llm';
import type {
  ComponentAnalysis,
  AnalyzedComponent,
  DatingVertical,
  LPTone,
  ComponentRole,
  ComponentImportance,
  PersuasionTechnique,
} from '@/types/component-analysis';

/**
 * AI-Powered Analyzer Agent
 * Uses Cheerio for extraction + Grok AI for understanding
 */
export async function analyzeWithAI(
  html: string,
  sourceUrl?: string
): Promise<ComponentAnalysis> {
  const $ = cheerio.load(html);

  // Step 1: Extract raw data with Cheerio
  const rawData = extractRawData($);

  // Step 2: Detect tracking URL
  const trackingUrl = detectTrackingUrl($, html);

  // Step 3: Use AI to analyze components and their roles
  const llm = getLLMProvider('grok');
  const aiAnalysis = await getAIAnalysis(llm, rawData, html);

  return {
    id: uuidv4(),
    sourceUrl,
    analyzedAt: new Date(),
    components: aiAnalysis.components,
    flow: aiAnalysis.flow,
    vertical: aiAnalysis.vertical,
    tone: aiAnalysis.tone,
    trackingUrl,
    originalImages: rawData.images,
    strategySummary: aiAnalysis.strategySummary,
    rawCheerioData: {
      headlines: rawData.headlines,
      buttons: rawData.buttons,
      images: rawData.images,
      forms: rawData.forms.length,
    },
  };
}

/**
 * Extract raw data using Cheerio
 */
function extractRawData($: cheerio.CheerioAPI) {
  // Headlines
  const headlines: string[] = [];
  $('h1, h2, h3, h4').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 2) {
      headlines.push(text);
    }
  });

  // Buttons
  const buttons: string[] = [];
  $('button, a.btn, a.button, [class*="btn"], [class*="cta"], input[type="submit"]').each((_, el) => {
    const text = $(el).text().trim() || $(el).attr('value') || '';
    if (text && text.length > 1) {
      buttons.push(text);
    }
  });

  // Also get links that look like buttons
  $('a').each((_, el) => {
    const classes = $(el).attr('class') || '';
    const text = $(el).text().trim();
    if ((classes.includes('btn') || classes.includes('button') || classes.includes('cta')) && text) {
      if (!buttons.includes(text)) {
        buttons.push(text);
      }
    }
  });

  // Images
  const images: string[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && !src.includes('data:image') && !src.includes('pixel') && !src.includes('tracking')) {
      images.push(src);
    }
  });

  // Background images
  $('[style*="background"]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
    if (match && match[1]) {
      images.push(match[1]);
    }
  });

  // Forms
  const forms: { action?: string; fields: string[] }[] = [];
  $('form').each((_, el) => {
    const fields: string[] = [];
    $(el).find('input, select, textarea').each((_, field) => {
      const name = $(field).attr('name') || $(field).attr('placeholder') || '';
      if (name) fields.push(name);
    });
    forms.push({
      action: $(el).attr('action'),
      fields,
    });
  });

  // Body text (paragraphs)
  const paragraphs: string[] = [];
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 20) {
      paragraphs.push(text.slice(0, 200));
    }
  });

  // Lists
  const lists: string[] = [];
  $('ul, ol').each((_, el) => {
    const items: string[] = [];
    $(el).find('li').each((_, li) => {
      const text = $(li).text().trim();
      if (text) items.push(text.slice(0, 100));
    });
    if (items.length > 0) {
      lists.push(items.join(' | '));
    }
  });

  // Detect if multi-step (JS-based)
  const jsContent = $('script').text();
  const isMultiStep = /step|question|quiz|slide|activeIndex|currentStep|showStep|nextStep/i.test(jsContent);

  return {
    headlines,
    buttons,
    images,
    forms,
    paragraphs,
    lists,
    isMultiStep,
    jsContent: jsContent.slice(0, 2000), // First 2000 chars for context
  };
}

/**
 * Detect tracking/redirect URL
 */
function detectTrackingUrl($: cheerio.CheerioAPI, html: string): string {
  // Check JS for redirect URL
  const jsRedirectMatch = html.match(/(?:window\.location\.href|location\.href|redirect(?:Url|URL)?|REDIRECT_URL)\s*=\s*["']([^"']+)["']/);
  if (jsRedirectMatch && jsRedirectMatch[1] && jsRedirectMatch[1] !== '#') {
    return jsRedirectMatch[1];
  }

  // Check for tracking links
  const trackingPatterns = [
    'a[href*="click"]',
    'a[href*="track"]',
    'a[href*="go."]',
    'a[href*="redirect"]',
    'a[href*="?sub"]',
    'a[href*="?ref"]',
    'a[href*="?aff"]',
  ];

  for (const pattern of trackingPatterns) {
    const href = $(pattern).first().attr('href');
    if (href && href !== '#' && href.startsWith('http')) {
      return href;
    }
  }

  // Check CTA buttons
  const ctaLink = $('a').filter((_, el) => {
    const text = $(el).text().toLowerCase();
    const href = $(el).attr('href') || '';
    return /continue|next|submit|start|sign.?up|register|join|yes|find/i.test(text) && href !== '#' && href.startsWith('http');
  }).first().attr('href');

  if (ctaLink) return ctaLink;

  // Form action
  const formAction = $('form[action]').first().attr('action');
  if (formAction && formAction !== '#' && formAction.startsWith('http')) {
    return formAction;
  }

  return '';
}

/**
 * Use Grok AI to analyze components and understand their roles
 */
async function getAIAnalysis(
  llm: ReturnType<typeof getLLMProvider>,
  rawData: ReturnType<typeof extractRawData>,
  html: string
): Promise<{
  components: AnalyzedComponent[];
  flow: ComponentAnalysis['flow'];
  vertical: DatingVertical;
  tone: LPTone;
  strategySummary: ComponentAnalysis['strategySummary'];
}> {
  const prompt = `You are an expert landing page analyst specializing in high-converting dating/adult funnels.

Analyze this landing page and break down each component with its role and importance.

## RAW DATA EXTRACTED:

**Headlines:**
${rawData.headlines.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

**Buttons/CTAs:**
${rawData.buttons.map((b, i) => `${i + 1}. "${b}"`).join('\n')}

**Images:** ${rawData.images.length} images found
${rawData.images.slice(0, 5).map(img => `- ${img}`).join('\n')}

**Forms:** ${rawData.forms.length} forms
${rawData.forms.map(f => `- Fields: ${f.fields.join(', ')}`).join('\n')}

**Key Text:**
${rawData.paragraphs.slice(0, 3).join('\n')}

**Lists:**
${rawData.lists.slice(0, 2).join('\n')}

**Is Multi-Step:** ${rawData.isMultiStep ? 'Yes (JS-driven quiz/funnel)' : 'No (static page)'}

## ANALYSIS REQUIRED:

Return a JSON object with this exact structure:
{
  "components": [
    {
      "id": "unique-id",
      "type": "headline|subheadline|body-text|image|button|quiz-question|testimonial|badge|list|progress-indicator|logo|footer",
      "content": "The actual content or description",
      "role": "attention-grabber|qualifier|engagement|trust-builder|desire-creator|objection-handler|action-driver|urgency-creator|value-demonstrator|brand-element|visual-support|navigation|redirect",
      "importance": "critical|important|optional",
      "persuasionTechniques": ["curiosity", "urgency", "social-proof", "micro-commitment", etc.],
      "position": 1,
      "notes": "Why this component works and its purpose"
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

## VERTICAL DETECTION RULES:
- **adult**: Explicit language, suggestive content, words like "hookup", "NSA", "discreet", "affair", "milf", "cougar"
- **casual**: Sexy but not explicit, "date", "flirt", "meet singles", "fun", suggestive but SFW
- **mainstream**: Completely SFW, "find love", "relationship", "meaningful connection", "soulmate"

## IMPORTANCE RULES:
- **critical**: Must be in the rebuilt page (main headline, CTA, final redirect)
- **important**: Should be included (supporting headlines, trust elements, quiz questions)
- **optional**: Nice to have but can be reimagined (secondary images, decorative elements)

## ROLE DEFINITIONS:
- **attention-grabber**: First thing users see, hooks them in
- **qualifier**: Filters/segments users (age gate, gender selection, location)
- **engagement**: Keeps users interacting (quiz questions, selections)
- **trust-builder**: Social proof, testimonials, badges
- **desire-creator**: Benefits, features, what they get
- **action-driver**: CTAs, buttons that move to next step
- **redirect**: Final step that sends to offer

Return ONLY valid JSON, no explanation.`;

  try {
    const response = await llm.generateText(prompt, {
      temperature: 0.3, // Low temperature for consistent analysis
      maxTokens: 4000,
    });

    // Parse the JSON response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and clean up the response
    return {
      components: validateComponents(parsed.components || []),
      flow: {
        type: parsed.flow?.type || (rawData.isMultiStep ? 'multi-step' : 'single-page'),
        totalSteps: parsed.flow?.totalSteps || rawData.headlines.length,
        hasProgressIndicator: parsed.flow?.hasProgressIndicator ?? rawData.isMultiStep,
      },
      vertical: validateVertical(parsed.vertical),
      tone: validateTone(parsed.tone),
      strategySummary: {
        mainHook: parsed.strategySummary?.mainHook || rawData.headlines[0] || 'Unknown',
        valueProposition: parsed.strategySummary?.valueProposition || 'Find matches',
        conversionMechanism: parsed.strategySummary?.conversionMechanism || 'Quiz funnel',
        keyPersuasionTactics: parsed.strategySummary?.keyPersuasionTactics || ['curiosity'],
      },
    };
  } catch (error) {
    console.error('AI analysis failed, using fallback:', error);
    return getFallbackAnalysis(rawData);
  }
}

/**
 * Validate and clean component data
 */
function validateComponents(components: unknown[]): AnalyzedComponent[] {
  if (!Array.isArray(components)) return [];

  return components.map((c, index) => {
    const comp = c as Record<string, unknown>;
    return {
      id: String(comp.id || `component-${index}`),
      type: validateComponentType(comp.type),
      content: String(comp.content || ''),
      role: validateRole(comp.role),
      importance: validateImportance(comp.importance),
      persuasionTechniques: validateTechniques(comp.persuasionTechniques),
      position: Number(comp.position) || index + 1,
      notes: String(comp.notes || ''),
    };
  });
}

function validateComponentType(type: unknown): AnalyzedComponent['type'] {
  const validTypes = ['headline', 'subheadline', 'body-text', 'image', 'video', 'button', 'form', 'quiz-question', 'testimonial', 'badge', 'countdown', 'list', 'icon', 'progress-indicator', 'logo', 'footer', 'divider', 'container'];
  return validTypes.includes(String(type)) ? (type as AnalyzedComponent['type']) : 'container';
}

function validateRole(role: unknown): ComponentRole {
  const validRoles: ComponentRole[] = ['attention-grabber', 'qualifier', 'engagement', 'trust-builder', 'desire-creator', 'objection-handler', 'action-driver', 'urgency-creator', 'value-demonstrator', 'brand-element', 'visual-support', 'navigation', 'redirect', 'unknown'];
  return validRoles.includes(role as ComponentRole) ? (role as ComponentRole) : 'unknown';
}

function validateImportance(importance: unknown): ComponentImportance {
  const valid: ComponentImportance[] = ['critical', 'important', 'optional'];
  return valid.includes(importance as ComponentImportance) ? (importance as ComponentImportance) : 'optional';
}

function validateTechniques(techniques: unknown): PersuasionTechnique[] {
  if (!Array.isArray(techniques)) return ['none'];
  const valid: PersuasionTechnique[] = ['curiosity', 'urgency', 'scarcity', 'social-proof', 'authority', 'reciprocity', 'commitment-consistency', 'liking', 'fear-of-missing-out', 'exclusivity', 'personalization', 'locality', 'transformation', 'pain-agitation', 'benefit-stacking', 'risk-reversal', 'none'];
  return techniques.filter(t => valid.includes(t as PersuasionTechnique)) as PersuasionTechnique[];
}

function validateVertical(vertical: unknown): DatingVertical {
  const valid: DatingVertical[] = ['adult', 'casual', 'mainstream'];
  return valid.includes(vertical as DatingVertical) ? (vertical as DatingVertical) : 'casual';
}

function validateTone(tone: unknown): LPTone {
  const valid: LPTone[] = ['playful-seductive', 'urgent-exciting', 'professional-trustworthy', 'friendly-approachable', 'bold-confident', 'intimate-personal', 'fun-lighthearted'];
  return valid.includes(tone as LPTone) ? (tone as LPTone) : 'playful-seductive';
}

/**
 * Fallback analysis if AI fails
 */
function getFallbackAnalysis(rawData: ReturnType<typeof extractRawData>): {
  components: AnalyzedComponent[];
  flow: ComponentAnalysis['flow'];
  vertical: DatingVertical;
  tone: LPTone;
  strategySummary: ComponentAnalysis['strategySummary'];
} {
  const components: AnalyzedComponent[] = [];
  let position = 1;

  // Add headlines
  rawData.headlines.forEach((h, i) => {
    components.push({
      id: `headline-${i}`,
      type: i === 0 ? 'headline' : 'subheadline',
      content: h,
      role: i === 0 ? 'attention-grabber' : 'engagement',
      importance: i === 0 ? 'critical' : 'important',
      persuasionTechniques: ['curiosity'],
      position: position++,
      notes: i === 0 ? 'Main headline to grab attention' : 'Supporting headline',
    });
  });

  // Add buttons
  rawData.buttons.forEach((b, i) => {
    components.push({
      id: `button-${i}`,
      type: 'button',
      content: b,
      role: 'action-driver',
      importance: 'critical',
      persuasionTechniques: ['urgency'],
      position: position++,
      notes: 'CTA button to drive action',
    });
  });

  // Detect vertical from content
  const allText = [...rawData.headlines, ...rawData.buttons, ...rawData.paragraphs].join(' ').toLowerCase();
  let vertical: DatingVertical = 'casual';
  if (/hookup|nsa|affair|milf|cougar|sex|fuck|horny|nude/i.test(allText)) {
    vertical = 'adult';
  } else if (/love|relationship|soulmate|marriage|serious|meaningful/i.test(allText)) {
    vertical = 'mainstream';
  }

  return {
    components,
    flow: {
      type: rawData.isMultiStep ? 'multi-step' : 'single-page',
      totalSteps: rawData.isMultiStep ? rawData.headlines.length : 1,
      hasProgressIndicator: rawData.isMultiStep,
    },
    vertical,
    tone: 'playful-seductive',
    strategySummary: {
      mainHook: rawData.headlines[0] || 'Find matches',
      valueProposition: 'Connect with local singles',
      conversionMechanism: rawData.isMultiStep ? 'Quiz funnel' : 'Direct CTA',
      keyPersuasionTactics: ['curiosity', 'locality'],
    },
  };
}
