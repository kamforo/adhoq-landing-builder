import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { v4 as uuidv4 } from 'uuid';
import type { PageSection, SectionType } from '@/types';

// Patterns for detecting section types
const SECTION_PATTERNS: Record<SectionType, RegExp[]> = {
  header: [/header/i, /nav/i, /navbar/i, /top-bar/i],
  hero: [/hero/i, /banner/i, /jumbotron/i, /masthead/i, /splash/i, /above-fold/i],
  features: [/feature/i, /benefit/i, /service/i, /what-we/i, /why-choose/i],
  benefits: [/benefit/i, /advantage/i, /why-us/i, /value/i],
  testimonials: [/testimonial/i, /review/i, /feedback/i, /customer-say/i, /success-stor/i],
  'social-proof': [/social-proof/i, /trust/i, /client/i, /partner/i, /logo/i, /brand/i],
  pricing: [/pricing/i, /price/i, /plan/i, /package/i, /cost/i],
  faq: [/faq/i, /question/i, /accordion/i, /ask/i],
  cta: [/cta/i, /call-to-action/i, /signup/i, /register/i, /get-started/i, /join/i],
  footer: [/footer/i, /bottom/i, /copyright/i],
  form: [/form/i, /contact/i, /subscribe/i, /newsletter/i, /signup-form/i],
  gallery: [/gallery/i, /portfolio/i, /showcase/i, /work/i],
  video: [/video/i, /demo/i, /watch/i, /player/i],
  unknown: [],
};

// Content-based detection patterns
const CONTENT_PATTERNS: Partial<Record<SectionType, RegExp[]>> = {
  testimonials: [/"[^"]{20,}"/, /said\s/i, /\d+\s*stars?/i, /★/],
  faq: [/\?\s*$/, /frequently\s+asked/i],
  pricing: [/\$\d+/, /€\d+/, /£\d+/, /per\s+month/i, /\/mo/i, /free\s+trial/i],
  cta: [/sign\s*up/i, /get\s+started/i, /join\s+now/i, /register/i, /subscribe/i],
};

/**
 * Detect and classify sections in the page
 */
export function detectSections($: cheerio.CheerioAPI): PageSection[] {
  const sections: PageSection[] = [];
  let order = 0;

  // Common section-like elements
  const sectionSelectors = [
    'header',
    'nav',
    'main',
    'section',
    'article',
    'aside',
    'footer',
    'div[class*="section"]',
    'div[class*="container"]',
    'div[class*="wrapper"]',
    'div[id*="section"]',
  ];

  // First pass: detect semantic elements
  $('header').each((_, el) => {
    sections.push(createSection($, el, 'header', order++));
  });

  $('nav:not(header nav)').each((_, el) => {
    if (!isInsideExisting(sections, el)) {
      sections.push(createSection($, el, 'header', order++));
    }
  });

  // Main content sections
  $('main section, body > section, body > div > section').each((_, el) => {
    if (!isInsideExisting(sections, el)) {
      const type = detectSectionType($, el);
      sections.push(createSection($, el, type, order++));
    }
  });

  // Detect major divs that look like sections
  $('body > div, main > div, .container > div').each((_, el) => {
    const $el = $(el);

    // Skip if too small or already processed
    if ($el.children().length < 2) return;
    if (isInsideExisting(sections, el)) return;

    // Check if it looks like a section
    const classes = $el.attr('class') || '';
    const id = $el.attr('id') || '';

    if (looksLikeSection(classes, id, $el)) {
      const type = detectSectionType($, el);
      sections.push(createSection($, el, type, order++));
    }
  });

  // Footer
  $('footer').each((_, el) => {
    if (!isInsideExisting(sections, el)) {
      sections.push(createSection($, el, 'footer', order++));
    }
  });

  // If we found very few sections, try a more aggressive approach
  if (sections.length < 3) {
    return detectSectionsFallback($);
  }

  return sections.sort((a, b) => a.order - b.order);
}

/**
 * Fallback: detect sections by visual breaks in the page
 */
function detectSectionsFallback($: cheerio.CheerioAPI): PageSection[] {
  const sections: PageSection[] = [];
  let order = 0;

  // Look for any major container divs
  $('body > div, body > main, body > article').each((_, el) => {
    const $el = $(el);
    const html = $el.html() || '';

    // Skip tiny elements
    if (html.length < 100) return;

    const type = detectSectionType($, el);
    sections.push(createSection($, el, type, order++));
  });

  // If still nothing, treat the whole body as one section
  if (sections.length === 0) {
    sections.push({
      id: uuidv4(),
      type: 'unknown',
      selector: 'body',
      order: 0,
      components: [],
      html: $('body').html() || '',
    });
  }

  return sections;
}

/**
 * Create a section object
 */
function createSection(
  $: cheerio.CheerioAPI,
  el: Element,
  type: SectionType,
  order: number
): PageSection {
  const $el = $(el);

  return {
    id: uuidv4(),
    type,
    selector: generateSelector($, el),
    order,
    components: [],
    html: $.html(el),
  };
}

/**
 * Detect the type of a section based on classes, ID, and content
 */
function detectSectionType($: cheerio.CheerioAPI, el: Element): SectionType {
  const $el = $(el);
  const classes = ($el.attr('class') || '').toLowerCase();
  const id = ($el.attr('id') || '').toLowerCase();
  const text = $el.text().toLowerCase().substring(0, 500);

  // Check class and ID patterns
  for (const [type, patterns] of Object.entries(SECTION_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(classes) || pattern.test(id)) {
        return type as SectionType;
      }
    }
  }

  // Check content patterns
  for (const [type, patterns] of Object.entries(CONTENT_PATTERNS)) {
    for (const pattern of patterns || []) {
      if (pattern.test(text)) {
        return type as SectionType;
      }
    }
  }

  // Heuristics based on content
  if ($el.find('form').length > 0) return 'form';
  if ($el.find('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length > 0) return 'video';
  if ($el.find('img').length > 3) return 'gallery';

  // Check for hero (usually first major section with big heading)
  if ($el.find('h1').length > 0 && $el.index() < 3) return 'hero';

  return 'unknown';
}

/**
 * Check if element looks like a section
 */
function looksLikeSection(classes: string, id: string, $el: cheerio.Cheerio<Element>): boolean {
  const combined = (classes + ' ' + id).toLowerCase();

  // Check for section-like patterns
  if (/section|container|wrapper|block|area|zone|row|module/i.test(combined)) {
    return true;
  }

  // Check if it has substantial content
  const text = $el.text().trim();
  if (text.length > 100 && $el.find('h1, h2, h3, p, img, form').length > 0) {
    return true;
  }

  return false;
}

/**
 * Check if element is inside an existing section
 */
function isInsideExisting(sections: PageSection[], el: Element): boolean {
  // Simple check - in production would use proper DOM traversal
  return false; // For now, allow all
}

/**
 * Generate a CSS selector for an element
 */
function generateSelector($: cheerio.CheerioAPI, el: Element): string {
  const $el = $(el);

  // Try ID first
  const id = $el.attr('id');
  if (id) return `#${id}`;

  // Try unique class combination
  const classes = ($el.attr('class') || '').split(/\s+/).filter(Boolean).slice(0, 2);
  if (classes.length > 0) {
    const tagName = el.tagName?.toLowerCase() || 'div';
    return `${tagName}.${classes.join('.')}`;
  }

  // Fallback to tag with index
  const tagName = el.tagName?.toLowerCase() || 'div';
  const index = $el.index();
  return `${tagName}:nth-child(${index + 1})`;
}
