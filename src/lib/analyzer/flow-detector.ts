import type { Element } from 'domhandler';
import * as cheerio from 'cheerio';
import type {
  LPFlow,
  FlowStage,
  PageSection,
  ComponentMap,
  PersuasionElement,
  SectionType,
} from '@/types/analyzer';

/**
 * Detect the LP Flow (persuasion journey) from the page
 */
export function detectLPFlow(
  $: cheerio.CheerioAPI,
  sections: PageSection[],
  components: ComponentMap,
  persuasionElements: PersuasionElement[]
): LPFlow {
  // First check for JS-driven multi-step flows
  const jsFlow = detectJSMultiStepFlow($);

  if (jsFlow) {
    return jsFlow;
  }

  // Detect flow type from HTML
  const flowType = detectFlowType($, sections);

  // Build flow stages from sections
  const stages = buildFlowStages(sections, components);

  // Detect framework (AIDA, PAS, etc.)
  const framework = detectFramework(stages, persuasionElements);

  // Analyze CTA strategy
  const ctaStrategy = analyzeCTAStrategy(components, sections);

  // Extract messaging flow
  const messagingFlow = extractMessagingFlow($, components, persuasionElements);

  return {
    type: flowType,
    stages,
    framework,
    ctaStrategy,
    messagingFlow,
  };
}

/**
 * Detect JavaScript-driven multi-step flows
 * Many LPs use JS to render questions/steps dynamically
 */
function detectJSMultiStepFlow($: cheerio.CheerioAPI): LPFlow | null {
  // Get all script content (inline and referenced patterns)
  let jsContent = '';
  $('script').each((_, el) => {
    const script = $(el).html() || '';
    jsContent += script + '\n';
  });

  // Also check for common JS patterns in HTML attributes
  const htmlContent = $.html();

  // Pattern 1: Question arrays (questionList, questions, steps)
  const questionArrayMatch = jsContent.match(
    /(?:questionList|questions|steps|formSteps|quizSteps)\s*=\s*\[([^\]]+)\]/
  );

  // Pattern 2: Count question objects
  const questionObjects = jsContent.match(/\{[^}]*(?:question|title|englishQuestion)[^}]*\}/g) || [];

  // Pattern 3: Look for step indicators in HTML
  const stepIndicators = htmlContent.match(/(?:step|question)\s*(?:\d+|\s*\/\s*\d+)/gi) || [];

  // Pattern 4: Look for activeIndex or currentStep patterns
  const hasActiveIndex = /activeIndex|currentStep|stepIndex|questionIndex/.test(jsContent);

  // Pattern 5: Look for yesNoHandler, nextStep, prevStep functions
  const hasStepHandlers = /yesNoHandler|nextStep|prevStep|goToStep|handleNext/.test(jsContent);

  // Pattern 6: Count distinct question texts in JS
  const questionTexts = jsContent.match(/(?:question|englishQuestion)\s*:\s*["']([^"']+)["']/g) || [];

  // Estimate total steps
  let estimatedSteps = 0;

  if (questionObjects.length > 0) {
    estimatedSteps = questionObjects.length;
  } else if (questionTexts.length > 0) {
    estimatedSteps = questionTexts.length;
  } else if (stepIndicators.length > 0) {
    // Parse "Question X/Y" patterns
    const maxStep = stepIndicators.reduce((max, indicator) => {
      const match = indicator.match(/(\d+)\s*\/\s*(\d+)/);
      if (match) return Math.max(max, parseInt(match[2]));
      const singleMatch = indicator.match(/(\d+)/);
      if (singleMatch) return Math.max(max, parseInt(singleMatch[1]));
      return max;
    }, 0);
    estimatedSteps = maxStep;
  }

  // If we detected a multi-step flow
  if (estimatedSteps >= 2 || (hasActiveIndex && hasStepHandlers)) {
    // Extract unique questions (dedupe since question/englishQuestion often have same value)
    const extractedQuestions: string[] = [];
    const seenQuestions = new Set<string>();
    questionTexts.forEach(q => {
      const match = q.match(/["']([^"']+)["']/);
      if (match && !seenQuestions.has(match[1])) {
        seenQuestions.add(match[1]);
        extractedQuestions.push(match[1]);
      }
    });

    // Use unique question count for step estimation
    const steps = Math.max(extractedQuestions.length || estimatedSteps, 2);

    // Build stages for multi-step flow
    const stages: FlowStage[] = [];

    // Add intro/warning stage
    stages.push({
      order: 1,
      sectionId: 'step-intro',
      sectionType: 'hero',
      purpose: 'attention',
      hasCtaButton: true,
      keyMessage: extractedQuestions[0] || 'Introduction',
    });

    // Add question stages
    for (let i = 1; i < steps; i++) {
      stages.push({
        order: i + 1,
        sectionId: `step-${i + 1}`,
        sectionType: i < steps - 1 ? 'form' : 'cta',
        purpose: i < steps - 1 ? 'interest' : 'action',
        hasCtaButton: true,
        keyMessage: extractedQuestions[i] || `Step ${i + 1}`,
      });
    }

    // Detect CTA text from HTML
    const primaryCtaText =
      $('[id*="continue"], [class*="continue"], [onclick*="continue"]').first().text().trim() ||
      $('a, button').filter((_, el) => /continue|next|submit|yes/i.test($(el).text())).first().text().trim() ||
      'Continue';

    // Detect CTA URL - check multiple sources
    let primaryCtaUrl: string | undefined;

    // 1. Look for redirect URL in JavaScript
    const jsRedirectMatch = jsContent.match(/(?:window\.location\.href|location\.href|redirect(?:Url|URL)?)\s*=\s*["']([^"']+)["']/);
    if (jsRedirectMatch && jsRedirectMatch[1] && jsRedirectMatch[1] !== '#') {
      primaryCtaUrl = jsRedirectMatch[1];
    }

    // 2. Look for tracking/affiliate links in HTML
    if (!primaryCtaUrl) {
      const trackingLink = $('a[href*="click"], a[href*="track"], a[href*="go."], a[href*="redirect"], a[href*="?sub"], a[href*="?ref"], a[href*="?aff"]').first().attr('href');
      if (trackingLink && trackingLink !== '#') {
        primaryCtaUrl = trackingLink;
      }
    }

    // 3. Look for CTA buttons with href
    if (!primaryCtaUrl) {
      const ctaLink = $('a[href]').filter((_, el) => {
        const text = $(el).text().toLowerCase();
        const href = $(el).attr('href') || '';
        return /continue|next|submit|start|sign.?up|register|join/i.test(text) && href !== '#' && href !== '';
      }).first().attr('href');
      if (ctaLink) {
        primaryCtaUrl = ctaLink;
      }
    }

    // 4. Look for any external link (not #, not javascript:)
    if (!primaryCtaUrl) {
      const anyLink = $('a[href]').filter((_, el) => {
        const href = $(el).attr('href') || '';
        return href !== '#' && !href.startsWith('javascript:') && href.length > 1;
      }).first().attr('href');
      if (anyLink) {
        primaryCtaUrl = anyLink;
      }
    }

    // 5. Look for form action URLs
    if (!primaryCtaUrl) {
      const formAction = $('form[action]').first().attr('action');
      if (formAction && formAction !== '#') {
        primaryCtaUrl = formAction;
      }
    }

    return {
      type: 'multi-step',
      stages,
      framework: 'custom',
      ctaStrategy: {
        primaryCta: primaryCtaText,
        primaryCtaUrl,
        ctaFrequency: 'repeated',
        ctaPositions: stages.filter(s => s.hasCtaButton).map(s => s.sectionType),
      },
      messagingFlow: {
        hook: extractedQuestions[0],
        benefits: extractedQuestions.slice(1, 4),
      },
    };
  }

  return null;
}

/**
 * Detect the type of landing page flow
 */
function detectFlowType(
  $: cheerio.CheerioAPI,
  sections: PageSection[]
): LPFlow['type'] {
  // Check for video sales letter
  const hasVideoInHero = sections.some(
    s => s.type === 'hero' && s.html.includes('<video') || s.html.includes('youtube') || s.html.includes('vimeo')
  );
  if (hasVideoInHero && sections.length <= 5) {
    return 'video-sales';
  }

  // Check for multi-step (forms with progress indicators, multiple pages)
  const hasProgressIndicator = $('[class*="step"], [class*="progress"], [class*="wizard"]').length > 0;
  const hasMultipleFormSteps = $('form').length > 1 || $('[data-step]').length > 0;
  if (hasProgressIndicator || hasMultipleFormSteps) {
    return 'multi-step';
  }

  // Long-form if many sections
  if (sections.length > 8) {
    return 'long-form';
  }

  return 'single-page';
}

/**
 * Build flow stages from sections
 */
function buildFlowStages(
  sections: PageSection[],
  components: ComponentMap
): FlowStage[] {
  return sections.map((section, index) => {
    const purpose = mapSectionToPurpose(section.type, index, sections.length);
    const hasCtaButton = components.buttons.some(
      b => b.sectionId === section.id && (b.type === 'cta' || b.type === 'submit')
    );
    const headline = components.headlines.find(h => h.sectionId === section.id);

    return {
      order: index + 1,
      sectionId: section.id,
      sectionType: section.type,
      purpose,
      hasCtaButton,
      keyMessage: headline?.text,
    };
  });
}

/**
 * Map section type to funnel purpose
 */
function mapSectionToPurpose(
  sectionType: SectionType,
  index: number,
  totalSections: number
): FlowStage['purpose'] {
  switch (sectionType) {
    case 'hero':
      return 'attention';
    case 'features':
    case 'benefits':
      return 'interest';
    case 'testimonials':
    case 'social-proof':
      return 'trust';
    case 'pricing':
    case 'cta':
      return 'action';
    case 'faq':
      return 'objection-handling';
    case 'gallery':
    case 'video':
      return index < totalSections / 2 ? 'interest' : 'desire';
    default:
      // Position-based fallback
      if (index === 0) return 'attention';
      if (index < totalSections * 0.3) return 'interest';
      if (index < totalSections * 0.7) return 'desire';
      return 'action';
  }
}

/**
 * Detect marketing framework used
 */
function detectFramework(
  stages: FlowStage[],
  persuasionElements: PersuasionElement[]
): LPFlow['framework'] {
  const purposes = stages.map(s => s.purpose);
  const hasUrgency = persuasionElements.some(p => p.type === 'urgency' || p.type === 'scarcity');

  // AIDA: Attention → Interest → Desire → Action
  const hasAIDA = purposes.includes('attention') &&
    purposes.includes('interest') &&
    purposes.includes('desire') &&
    purposes.includes('action');

  // PAS: Problem → Agitate → Solution (look for problem-focused content)
  const hasProblemContent = stages.some(s =>
    s.keyMessage?.toLowerCase().includes('problem') ||
    s.keyMessage?.toLowerCase().includes('struggling') ||
    s.keyMessage?.toLowerCase().includes('tired of')
  );

  if (hasProblemContent && hasUrgency) {
    return 'PAS';
  }

  if (hasAIDA) {
    return 'AIDA';
  }

  return 'custom';
}

/**
 * Analyze CTA strategy
 */
function analyzeCTAStrategy(
  components: ComponentMap,
  sections: PageSection[]
): LPFlow['ctaStrategy'] {
  const ctaButtons = components.buttons.filter(b => b.type === 'cta' || b.type === 'submit');

  // Find primary CTA (most prominent, likely first or in hero)
  const primaryCta = ctaButtons[0];

  // Determine CTA frequency
  let ctaFrequency: 'single' | 'repeated' | 'progressive' = 'single';
  if (ctaButtons.length > 3) {
    // Check if CTA text changes (progressive) or stays same (repeated)
    const uniqueTexts = new Set(ctaButtons.map(b => b.text.toLowerCase()));
    ctaFrequency = uniqueTexts.size > 2 ? 'progressive' : 'repeated';
  } else if (ctaButtons.length > 1) {
    ctaFrequency = 'repeated';
  }

  // Find which sections have CTAs
  const ctaPositions = sections
    .filter(s => ctaButtons.some(b => b.sectionId === s.id))
    .map(s => s.type);

  return {
    primaryCta: primaryCta?.text || 'Get Started',
    primaryCtaUrl: primaryCta?.href,
    ctaFrequency,
    ctaPositions,
  };
}

/**
 * Extract the messaging flow
 */
function extractMessagingFlow(
  $: cheerio.CheerioAPI,
  components: ComponentMap,
  persuasionElements: PersuasionElement[]
): LPFlow['messagingFlow'] {
  const headlines = components.headlines;
  const mainHeadline = headlines.find(h => h.isMainHeadline) || headlines[0];

  // Extract hook (main headline)
  const hook = mainHeadline?.text;

  // Look for problem/pain point language
  const problemHeadline = headlines.find(h =>
    /problem|struggle|tired|frustrat|pain|difficult|challenge/i.test(h.text)
  );

  // Look for solution language
  const solutionHeadline = headlines.find(h =>
    /solution|introducing|discover|finally|answer|secret/i.test(h.text)
  );

  // Extract benefits from lists
  const benefitsList = components.lists.find(l => l.type === 'check' || l.type === 'bullet');
  const benefits = benefitsList?.items.slice(0, 5);

  // Extract social proof summary
  const socialProof = persuasionElements.find(p => p.type === 'social-proof');

  // Extract urgency
  const urgencyElement = persuasionElements.find(p => p.type === 'urgency' || p.type === 'scarcity');

  // Extract guarantee
  const guaranteeElement = persuasionElements.find(p => p.type === 'guarantee');

  return {
    hook,
    problem: problemHeadline?.text,
    solution: solutionHeadline?.text,
    benefits,
    proof: socialProof?.content,
    urgency: urgencyElement?.content,
    guarantee: guaranteeElement?.content,
  };
}
