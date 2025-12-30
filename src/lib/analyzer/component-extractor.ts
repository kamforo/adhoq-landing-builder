import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { v4 as uuidv4 } from 'uuid';
import type {
  PageSection,
  ComponentMap,
  HeadlineComponent,
  TextComponent,
  ButtonComponent,
  ImageComponent,
  FormComponent,
  ListComponent,
  VideoComponent,
} from '@/types';
import type { AnalyzerFormField } from '@/types/analyzer';

// Urgency keywords for buttons
const URGENCY_WORDS = [
  'now', 'today', 'limited', 'hurry', 'fast', 'instant', 'immediately',
  'don\'t miss', 'last chance', 'ending soon', 'act fast', 'urgent',
];

/**
 * Extract all components from the page
 */
export function extractComponents(
  $: cheerio.CheerioAPI,
  sections: PageSection[]
): ComponentMap {
  return {
    headlines: extractHeadlines($, sections),
    subheadlines: extractSubheadlines($),
    paragraphs: extractParagraphs($),
    buttons: extractButtons($),
    images: extractImages($),
    forms: extractForms($),
    lists: extractLists($),
    videos: extractVideos($),
  };
}

/**
 * Extract headlines (h1-h6)
 */
function extractHeadlines($: cheerio.CheerioAPI, sections: PageSection[]): HeadlineComponent[] {
  const headlines: HeadlineComponent[] = [];
  let foundMainHeadline = false;

  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();

    if (!text || text.length < 2) return;

    const tagName = el.tagName.toLowerCase();
    const level = parseInt(tagName.charAt(1)) as 1 | 2 | 3 | 4 | 5 | 6;

    // First h1 is usually the main headline
    const isMainHeadline = level === 1 && !foundMainHeadline;
    if (isMainHeadline) foundMainHeadline = true;

    // Find which section this belongs to
    const sectionId = findParentSection($, el, sections);

    headlines.push({
      id: uuidv4(),
      selector: generateSelector($, el),
      sectionId,
      text,
      level,
      isMainHeadline,
    });
  });

  return headlines;
}

/**
 * Extract subheadlines (text that follows headlines)
 */
function extractSubheadlines($: cheerio.CheerioAPI): TextComponent[] {
  const subheadlines: TextComponent[] = [];

  // Look for elements that typically follow headlines
  $('h1 + p, h2 + p, h1 + .subheadline, h2 + .subheadline, [class*="subhead"], [class*="tagline"], [class*="subtitle"]').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();

    if (!text || text.length < 10 || text.length > 300) return;

    subheadlines.push({
      id: uuidv4(),
      selector: generateSelector($, el),
      text,
      wordCount: text.split(/\s+/).length,
    });
  });

  return subheadlines;
}

/**
 * Extract paragraphs
 */
function extractParagraphs($: cheerio.CheerioAPI): TextComponent[] {
  const paragraphs: TextComponent[] = [];

  $('p').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();

    // Skip empty or very short paragraphs
    if (!text || text.length < 20) return;

    // Skip if inside a form or button
    if ($el.closest('form, button, a').length > 0) return;

    paragraphs.push({
      id: uuidv4(),
      selector: generateSelector($, el),
      text,
      wordCount: text.split(/\s+/).length,
    });
  });

  return paragraphs;
}

/**
 * Extract buttons and CTAs
 */
function extractButtons($: cheerio.CheerioAPI): ButtonComponent[] {
  const buttons: ButtonComponent[] = [];
  const seen = new Set<string>();

  // Button elements and links styled as buttons
  $('button, a.btn, a.button, a[class*="btn"], a[class*="cta"], input[type="submit"], [role="button"]').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim() || $el.attr('value') || '';

    if (!text || text.length < 2) return;

    // Deduplicate
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    const href = $el.attr('href');
    const type = determineButtonType($el, text);
    const hasUrgency = URGENCY_WORDS.some(word =>
      text.toLowerCase().includes(word)
    );

    buttons.push({
      id: uuidv4(),
      selector: generateSelector($, el),
      text,
      href,
      type,
      hasUrgency,
    });
  });

  return buttons;
}

/**
 * Determine button type
 */
function determineButtonType(
  $el: cheerio.Cheerio<Element>,
  text: string
): ButtonComponent['type'] {
  const textLower = text.toLowerCase();
  const classes = ($el.attr('class') || '').toLowerCase();

  // CTA patterns
  if (/sign\s*up|register|get\s+started|buy|order|subscribe|join|download|start/i.test(textLower)) {
    return 'cta';
  }

  // Submit button
  if ($el.is('input[type="submit"]') || $el.is('button[type="submit"]')) {
    return 'submit';
  }

  // Navigation
  if ($el.closest('nav, header, footer').length > 0) {
    return 'navigation';
  }

  // Check for CTA styling
  if (/cta|primary|main|action/i.test(classes)) {
    return 'cta';
  }

  return 'secondary';
}

/**
 * Extract images
 */
function extractImages($: cheerio.CheerioAPI): ImageComponent[] {
  const images: ImageComponent[] = [];

  $('img').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src') || $el.attr('data-src') || '';

    if (!src || src.startsWith('data:image/svg') || src.includes('pixel') || src.includes('spacer')) {
      return;
    }

    const alt = $el.attr('alt');
    const width = parseInt($el.attr('width') || '0');
    const height = parseInt($el.attr('height') || '0');

    // Detect if it's a hero image
    const isHero = $el.closest('[class*="hero"], [class*="banner"], header, .jumbotron').length > 0 ||
                   (width > 600 && $el.index() < 3);

    // Detect if it's an icon
    const isIcon = (width > 0 && width < 64) ||
                   /icon|logo|badge|sprite/i.test(src) ||
                   /icon|logo/i.test($el.attr('class') || '');

    images.push({
      id: uuidv4(),
      selector: generateSelector($, el),
      src,
      alt,
      isHero,
      isIcon,
      dimensions: width && height ? { width, height } : undefined,
    });
  });

  return images;
}

/**
 * Extract forms
 */
function extractForms($: cheerio.CheerioAPI): FormComponent[] {
  const forms: FormComponent[] = [];

  $('form').each((_, el) => {
    const $form = $(el);

    const fields: AnalyzerFormField[] = [];
    $form.find('input, select, textarea').each((_, fieldEl) => {
      const $field = $(fieldEl);
      const type = $field.attr('type') || fieldEl.tagName.toLowerCase();
      const name = $field.attr('name') || '';

      // Skip hidden and submit fields
      if (type === 'hidden' || type === 'submit') return;

      // Try to find label
      const id = $field.attr('id');
      let label = '';
      if (id) {
        label = $(`label[for="${id}"]`).text().trim();
      }
      if (!label) {
        label = $field.attr('placeholder') || '';
      }

      fields.push({
        name,
        type,
        label,
        required: $field.attr('required') !== undefined,
      });
    });

    const submitBtn = $form.find('button[type="submit"], input[type="submit"]').first();
    const submitText = submitBtn.text().trim() || submitBtn.attr('value') || '';

    forms.push({
      id: uuidv4(),
      selector: generateSelector($, el),
      action: $form.attr('action'),
      method: $form.attr('method') || 'GET',
      fields,
      submitButton: submitText,
    });
  });

  return forms;
}

/**
 * Extract lists
 */
function extractLists($: cheerio.CheerioAPI): ListComponent[] {
  const lists: ListComponent[] = [];

  $('ul, ol').each((_, el) => {
    const $list = $(el);

    // Skip navigation lists
    if ($list.closest('nav, header, footer').length > 0) return;

    const items: string[] = [];
    $list.find('> li').each((_, li) => {
      const text = $(li).text().trim();
      if (text) items.push(text);
    });

    if (items.length < 2) return;

    // Determine list type
    let type: ListComponent['type'] = el.tagName.toLowerCase() === 'ol' ? 'numbered' : 'bullet';

    // Check for checkmark or icon lists
    const classes = $list.attr('class') || '';
    const firstLi = $list.find('> li').first();
    if (/check|tick|done/i.test(classes) || firstLi.find('svg, i, .icon').length > 0) {
      type = 'check';
    }

    lists.push({
      id: uuidv4(),
      selector: generateSelector($, el),
      items,
      type,
    });
  });

  return lists;
}

/**
 * Extract videos
 */
function extractVideos($: cheerio.CheerioAPI): VideoComponent[] {
  const videos: VideoComponent[] = [];

  // HTML5 video
  $('video').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src') || $el.find('source').first().attr('src') || '';

    videos.push({
      id: uuidv4(),
      selector: generateSelector($, el),
      src,
      type: 'html5',
      thumbnail: $el.attr('poster'),
    });
  });

  // YouTube/Vimeo embeds
  $('iframe').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src') || '';

    if (src.includes('youtube') || src.includes('youtu.be')) {
      videos.push({
        id: uuidv4(),
        selector: generateSelector($, el),
        src,
        type: 'youtube',
      });
    } else if (src.includes('vimeo')) {
      videos.push({
        id: uuidv4(),
        selector: generateSelector($, el),
        src,
        type: 'vimeo',
      });
    } else if (src.includes('video') || src.includes('player')) {
      videos.push({
        id: uuidv4(),
        selector: generateSelector($, el),
        src,
        type: 'embed',
      });
    }
  });

  return videos;
}

/**
 * Find which section an element belongs to
 */
function findParentSection(
  $: cheerio.CheerioAPI,
  el: Element,
  sections: PageSection[]
): string | undefined {
  // Simple implementation - check if element is within section's selector
  for (const section of sections) {
    if ($(el).closest(section.selector).length > 0) {
      return section.id;
    }
  }
  return undefined;
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
  const tagName = el.tagName?.toLowerCase() || 'div';

  if (classes.length > 0) {
    return `${tagName}.${classes.join('.')}`;
  }

  // Fallback to tag with nth-child
  const index = $el.index();
  return `${tagName}:nth-child(${index + 1})`;
}
