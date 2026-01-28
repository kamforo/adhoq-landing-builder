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
  DetectedSection,
  DetectedImage,
  LPSectionType,
  ImageType,
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

  // Step 4: Categorize images
  const categorizedImages = categorizeImages(rawData.images, rawData.backgroundImages, aiAnalysis.flow.totalSteps);

  return {
    id: uuidv4(),
    sourceUrl,
    analyzedAt: new Date(),
    components: aiAnalysis.components,
    sections: aiAnalysis.sections,
    flow: aiAnalysis.flow,
    vertical: aiAnalysis.vertical,
    tone: aiAnalysis.tone,
    trackingUrl,
    images: categorizedImages,
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

  // Images (separate regular images from background images)
  const images: string[] = [];
  const backgroundImages: string[] = [];

  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && !src.includes('data:image') && !src.includes('pixel') && !src.includes('tracking')) {
      images.push(src);
    }
  });

  // Background images (tracked separately)
  $('[style*="background"]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
    if (match && match[1]) {
      backgroundImages.push(match[1]);
    }
  });

  // Also check CSS for background images
  $('style').each((_, el) => {
    const css = $(el).text();
    const matches = css.matchAll(/url\(['"]?([^'")\s]+)['"]?\)/g);
    for (const match of matches) {
      if (match[1] && !match[1].includes('data:image')) {
        backgroundImages.push(match[1]);
      }
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

  // Extract all JavaScript content
  const jsContent = $('script').text();

  // Detect if multi-step (JS-based)
  const isMultiStep = /step|question|quiz|slide|activeIndex|currentStep|showStep|nextStep/i.test(jsContent);

  // Extract quiz questions from JavaScript
  const jsQuizData = extractQuizDataFromJS(jsContent);

  return {
    headlines,
    buttons,
    images,
    backgroundImages,
    forms,
    paragraphs,
    lists,
    isMultiStep,
    jsContent: jsContent.slice(0, 2000), // First 2000 chars for context
    jsQuizData, // Extracted quiz questions and answers from JS
  };
}

/**
 * Extract quiz questions and answers from JavaScript code
 * Parses common patterns used in landing page quizzes
 */
function extractQuizDataFromJS(jsContent: string): {
  questions: Array<{ question: string; answers: string[] }>;
  titles: string[];
  hookTexts: string[];
} {
  const questions: Array<{ question: string; answers: string[] }> = [];
  const titles: string[] = [];
  const hookTexts: string[] = [];

  // Pattern 1: Question objects with question/Question property
  // e.g., {question:"What type of body turns you on?", answerList:[...]}
  const questionObjectPattern = /\{[^{}]*(?:question|Question)\s*:\s*["'`]([^"'`]+)["'`][^{}]*\}/g;
  let match;
  while ((match = questionObjectPattern.exec(jsContent)) !== null) {
    const questionText = match[1].trim();
    if (questionText.length > 10 && !questions.some(q => q.question === questionText)) {
      // Try to extract answers from the same object
      const fullMatch = match[0];
      const answers: string[] = [];

      // Look for answerList, options, choices patterns
      const answerPatterns = [
        /answerList\s*:\s*\[([\s\S]*?)\]/,
        /options\s*:\s*\[([\s\S]*?)\]/,
        /choices\s*:\s*\[([\s\S]*?)\]/,
        /answers\s*:\s*\[([\s\S]*?)\]/,
      ];

      for (const answerPattern of answerPatterns) {
        const answerMatch = fullMatch.match(answerPattern);
        if (answerMatch) {
          // Extract answer names/texts
          const answerNamePattern = /(?:name|text|label|LangName)\s*:\s*["'`]([^"'`]+)["'`]/g;
          let answerName;
          while ((answerName = answerNamePattern.exec(answerMatch[1])) !== null) {
            if (!answers.includes(answerName[1])) {
              answers.push(answerName[1]);
            }
          }
          break;
        }
      }

      questions.push({ question: questionText, answers });
    }
  }

  // Pattern 2: Array of question strings
  // e.g., questions = ["Question 1?", "Question 2?"]
  const questionArrayPattern = /(?:questions?|quizQuestions?)\s*=\s*\[([^\]]+)\]/gi;
  while ((match = questionArrayPattern.exec(jsContent)) !== null) {
    const arrayContent = match[1];
    const stringPattern = /["'`]([^"'`]+\??)["'`]/g;
    let strMatch;
    while ((strMatch = stringPattern.exec(arrayContent)) !== null) {
      const text = strMatch[1].trim();
      if (text.length > 10 && text.includes('?') && !questions.some(q => q.question === text)) {
        questions.push({ question: text, answers: [] });
      }
    }
  }

  // Pattern 3: Title/headline assignments
  // e.g., title:"Important", landingPageContent="..."
  const titlePatterns = [
    /(?:title|headline|mainTitle|pageTitle)\s*[=:]\s*["'`]([^"'`]+)["'`]/gi,
    /landingPageContent\w*\s*=\s*["'`]([^"'`]+)["'`]/gi,
  ];

  for (const pattern of titlePatterns) {
    while ((match = pattern.exec(jsContent)) !== null) {
      const text = match[1].trim();
      if (text.length > 3 && text.length < 200 && !titles.includes(text)) {
        titles.push(text);
      }
    }
  }

  // Pattern 4: Hook/intro text - longer descriptive text
  // e.g., "Before we can show you a list..."
  const hookPattern = /(?:description|intro|hookText|message)\s*[=:]\s*["'`]([^"'`]{30,})["'`]/gi;
  while ((match = hookPattern.exec(jsContent)) !== null) {
    const text = match[1].trim().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    if (text.length > 30 && !hookTexts.includes(text)) {
      hookTexts.push(text);
    }
  }

  // Pattern 5: innerHTML assignments with question content
  const innerHtmlPattern = /getElementById\s*\(\s*["'`](?:actualQuestion|question|questionText)["'`]\s*\)[^=]*=\s*["'`]([^"'`]+)["'`]/gi;
  while ((match = innerHtmlPattern.exec(jsContent)) !== null) {
    const text = match[1].trim().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    if (text.length > 10) {
      hookTexts.push(text);
    }
  }

  // Pattern 6: Look for question list variable definitions
  // e.g., var questionListForSecondModal = [{...}, {...}]
  const questionListPattern = /(?:var|let|const)\s+\w*(?:question|quiz|step)\w*\s*=\s*\[([\s\S]*?)\];/gi;
  while ((match = questionListPattern.exec(jsContent)) !== null) {
    const listContent = match[1];
    // Extract questions from the list
    const objQuestionPattern = /(?:englishQuestion|question|Question|text)\s*:\s*["'`]([^"'`]+)["'`]/g;
    let qMatch;
    while ((qMatch = objQuestionPattern.exec(listContent)) !== null) {
      const questionText = qMatch[1].trim();
      if (questionText.length > 10 && !questions.some(q => q.question === questionText)) {
        questions.push({ question: questionText, answers: [] });
      }
    }
  }

  console.log('[JS Parser] Extracted from JavaScript:', {
    questions: questions.length,
    titles: titles.length,
    hookTexts: hookTexts.length,
  });

  return { questions, titles, hookTexts };
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
  sections: DetectedSection[];
  flow: ComponentAnalysis['flow'];
  vertical: DatingVertical;
  tone: LPTone;
  strategySummary: ComponentAnalysis['strategySummary'];
}> {
  // Format JS-extracted quiz data for the prompt
  const jsQuizSection = rawData.jsQuizData.questions.length > 0 ? `
**Quiz Questions (extracted from JavaScript):**
${rawData.jsQuizData.questions.map((q, i) => {
  const answersStr = q.answers.length > 0 ? ` [Answers: ${q.answers.join(', ')}]` : '';
  return `${i + 1}. "${q.question}"${answersStr}`;
}).join('\n')}
` : '';

  const jsTitlesSection = rawData.jsQuizData.titles.length > 0 ? `
**Titles (from JavaScript):**
${rawData.jsQuizData.titles.map((t, i) => `${i + 1}. "${t}"`).join('\n')}
` : '';

  const jsHooksSection = rawData.jsQuizData.hookTexts.length > 0 ? `
**Hook/Intro Texts (from JavaScript):**
${rawData.jsQuizData.hookTexts.map((t, i) => `${i + 1}. "${t}"`).join('\n')}
` : '';

  const prompt = `You are an expert landing page analyst specializing in high-converting dating/adult funnels.

Analyze this landing page and break down each component with its role and importance.

## RAW DATA EXTRACTED:

**Headlines:**
${rawData.headlines.length > 0 ? rawData.headlines.map((h, i) => `${i + 1}. "${h}"`).join('\n') : '(none found in static HTML)'}

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
${jsQuizSection}${jsTitlesSection}${jsHooksSection}
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

## SECTION DETECTION:
Identify distinct sections in the LP:
- **hook**: The opening section (usually step 1) with headline, hero image, initial hook
- **quiz**: Question/answer sections where users make selections
- **cta**: Final conversion section with the main call-to-action
- **testimonial**: Social proof sections with reviews/testimonials
- **benefits**: Feature/benefit listing sections

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

    const totalSteps = parsed.flow?.totalSteps || rawData.headlines.length || 5;

    // Validate and clean up the response
    return {
      components: validateComponents(parsed.components || []),
      sections: validateSections(parsed.sections, totalSteps, rawData.isMultiStep),
      flow: {
        type: parsed.flow?.type || (rawData.isMultiStep ? 'multi-step' : 'single-page'),
        totalSteps,
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
export function validateComponents(components: unknown[]): AnalyzedComponent[] {
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

export function validateVertical(vertical: unknown): DatingVertical {
  const valid: DatingVertical[] = ['adult', 'casual', 'mainstream'];
  return valid.includes(vertical as DatingVertical) ? (vertical as DatingVertical) : 'casual';
}

export function validateTone(tone: unknown): LPTone {
  const valid: LPTone[] = ['playful-seductive', 'urgent-exciting', 'professional-trustworthy', 'friendly-approachable', 'bold-confident', 'intimate-personal', 'fun-lighthearted'];
  return valid.includes(tone as LPTone) ? (tone as LPTone) : 'playful-seductive';
}

export function validateSections(sections: unknown, totalSteps: number, isMultiStep: boolean): DetectedSection[] {
  // If AI provided valid sections, use them
  if (Array.isArray(sections) && sections.length > 0) {
    return sections.map(s => {
      const section = s as Record<string, unknown>;
      const validTypes: LPSectionType[] = ['hook', 'quiz', 'cta', 'testimonial', 'benefits', 'unknown'];
      const type = validTypes.includes(section.type as LPSectionType)
        ? (section.type as LPSectionType)
        : 'unknown';

      return {
        type,
        stepNumbers: Array.isArray(section.stepNumbers) ? section.stepNumbers as number[] : [1],
        description: String(section.description || ''),
        components: Array.isArray(section.components) ? section.components as string[] : [],
      };
    });
  }

  // Generate default sections
  if (!isMultiStep) {
    return [{ type: 'hook', stepNumbers: [1], description: 'Single page', components: [] }];
  }

  // Default multi-step structure: Hook (1), Quiz (2 to N-1), CTA (N)
  const quizSteps = Array.from({ length: Math.max(totalSteps - 2, 1) }, (_, i) => i + 2);
  return [
    { type: 'hook', stepNumbers: [1], description: 'Opening hook with headline', components: [] },
    { type: 'quiz', stepNumbers: quizSteps, description: 'Quiz/qualification questions', components: [] },
    { type: 'cta', stepNumbers: [totalSteps], description: 'Final call-to-action', components: [] },
  ];
}

/**
 * Fallback analysis if AI fails
 */
function getFallbackAnalysis(rawData: ReturnType<typeof extractRawData>): {
  components: AnalyzedComponent[];
  sections: DetectedSection[];
  flow: ComponentAnalysis['flow'];
  vertical: DatingVertical;
  tone: LPTone;
  strategySummary: ComponentAnalysis['strategySummary'];
} {
  const components: AnalyzedComponent[] = [];
  let position = 1;

  // Add headlines (prefer JS-extracted titles if HTML headlines are empty)
  const headlines = rawData.headlines.length > 0
    ? rawData.headlines
    : rawData.jsQuizData.titles;

  headlines.forEach((h, i) => {
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

  // Add JS-extracted quiz questions as components
  rawData.jsQuizData.questions.forEach((q, i) => {
    components.push({
      id: `quiz-question-${i}`,
      type: 'quiz-question',
      content: q.question,
      role: 'engagement',
      importance: 'important',
      persuasionTechniques: ['commitment-consistency', 'curiosity'],
      position: position++,
      notes: q.answers.length > 0
        ? `Quiz question with answers: ${q.answers.join(', ')}`
        : 'Quiz question for user engagement',
    });
  });

  // Add hook texts as body-text components
  rawData.jsQuizData.hookTexts.forEach((h, i) => {
    components.push({
      id: `hook-text-${i}`,
      type: 'body-text',
      content: h,
      role: i === 0 ? 'attention-grabber' : 'desire-creator',
      importance: i === 0 ? 'critical' : 'important',
      persuasionTechniques: ['curiosity', 'personalization'],
      position: position++,
      notes: 'Hook/intro text to engage visitors',
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

  // Detect vertical from content (include JS-extracted content)
  const jsQuestionText = rawData.jsQuizData.questions.map(q => q.question).join(' ');
  const jsHookText = rawData.jsQuizData.hookTexts.join(' ');
  const allText = [...rawData.headlines, ...rawData.buttons, ...rawData.paragraphs, jsQuestionText, jsHookText].join(' ').toLowerCase();

  let vertical: DatingVertical = 'casual';
  if (/hookup|nsa|affair|milf|cougar|sex|fuck|horny|nude|discreet/i.test(allText)) {
    vertical = 'adult';
  } else if (/love|relationship|soulmate|marriage|serious|meaningful/i.test(allText)) {
    vertical = 'mainstream';
  }

  // Calculate total steps based on JS quiz questions
  const jsQuestionCount = rawData.jsQuizData.questions.length;
  const totalSteps = rawData.isMultiStep
    ? Math.max(jsQuestionCount + 2, rawData.headlines.length, 3) // +2 for hook and CTA
    : 1;

  const sections: DetectedSection[] = rawData.isMultiStep ? [
    { type: 'hook', stepNumbers: [1], description: 'Initial hook with headline', components: [] },
    { type: 'quiz', stepNumbers: Array.from({ length: Math.max(totalSteps - 2, 1) }, (_, i) => i + 2), description: 'Quiz questions', components: [] },
    { type: 'cta', stepNumbers: [totalSteps], description: 'Final CTA', components: [] },
  ] : [
    { type: 'hook', stepNumbers: [1], description: 'Single page with hook and CTA', components: [] },
  ];

  // Determine main hook from available content
  const mainHook = rawData.headlines[0]
    || rawData.jsQuizData.titles[0]
    || rawData.jsQuizData.hookTexts[0]?.slice(0, 50)
    || 'Find matches';

  return {
    components,
    sections,
    flow: {
      type: rawData.isMultiStep ? 'multi-step' : 'single-page',
      totalSteps,
      hasProgressIndicator: rawData.isMultiStep,
    },
    vertical,
    tone: 'playful-seductive',
    strategySummary: {
      mainHook,
      valueProposition: rawData.jsQuizData.hookTexts[0]?.slice(0, 100) || 'Connect with local singles',
      conversionMechanism: rawData.isMultiStep ? 'Quiz funnel' : 'Direct CTA',
      keyPersuasionTactics: ['curiosity', 'locality'],
    },
  };
}

/**
 * Categorize images as hero, background, or decorative
 */
function categorizeImages(
  images: string[],
  backgroundImages: string[],
  totalSteps: number
): DetectedImage[] {
  const result: DetectedImage[] = [];

  // Background images are always categorized as background
  backgroundImages.forEach(url => {
    result.push({
      url,
      type: 'background',
      description: 'Background/decorative image',
      position: 'background',
      isRequired: false,
    });
  });

  // Categorize regular images
  images.forEach((url, index) => {
    const lowerUrl = url.toLowerCase();

    // Detect image type based on URL patterns
    let type: ImageType = 'unknown';
    let position: DetectedImage['position'] = 'hook';
    let isRequired = false;
    let description = 'Image';

    // Check for common patterns
    if (/model|woman|girl|man|person|profile|avatar|photo/i.test(lowerUrl)) {
      type = 'hero';
      position = 'hook';
      isRequired = true;
      description = 'Hero/model image';
    } else if (/icon|badge|check|star|verified|trust|secure/i.test(lowerUrl)) {
      type = 'badge';
      position = 'cta';
      isRequired = false;
      description = 'Trust badge or icon';
    } else if (/leaf|snow|pattern|bg|background|decor/i.test(lowerUrl)) {
      type = 'decorative';
      position = 'background';
      isRequired = false;
      description = 'Decorative element';
    } else if (/logo/i.test(lowerUrl)) {
      type = 'icon';
      position = 'hook';
      isRequired = false;
      description = 'Logo';
    } else if (index === 0 && images.length > 0) {
      // First image is often the hero
      type = 'hero';
      position = 'hook';
      isRequired = true;
      description = 'Primary image (likely hero)';
    } else {
      type = 'decorative';
      position = 'floating';
      isRequired = false;
      description = 'Supporting image';
    }

    result.push({ url, type, description, position, isRequired });
  });

  return result;
}
