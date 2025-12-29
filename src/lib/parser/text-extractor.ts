import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { v4 as uuidv4 } from 'uuid';
import type { TextBlock } from '@/types';

/**
 * Extract text blocks from parsed HTML
 */
export function extractTextBlocks($: cheerio.CheerioAPI): TextBlock[] {
  const textBlocks: TextBlock[] = [];
  const seenTexts = new Set<string>();

  // Helper to add a text block
  const addTextBlock = (
    el: Element,
    type: TextBlock['type']
  ) => {
    const $el = $(el);
    const text = $el.clone().children().remove().end().text().trim();

    if (!text || text.length < 2 || seenTexts.has(text)) return;
    seenTexts.add(text);

    // Generate a CSS selector for this element
    const selector = generateSelector($, el);

    textBlocks.push({
      id: uuidv4(),
      selector,
      tagName: el.tagName?.toLowerCase() || 'unknown',
      originalText: text,
      type,
    });
  };

  // Extract headings
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    addTextBlock(el, 'heading');
  });

  // Extract paragraphs
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 10) {
      addTextBlock(el, 'paragraph');
    }
  });

  // Extract button text
  $('button, .btn, [class*="button"], input[type="submit"], input[type="button"]').each((_, el) => {
    const $el = $(el);
    const text = $el.val()?.toString() || $el.text().trim();
    if (text && text.length > 1) {
      seenTexts.add(text);
      textBlocks.push({
        id: uuidv4(),
        selector: generateSelector($, el),
        tagName: el.tagName?.toLowerCase() || 'button',
        originalText: text,
        type: 'button',
      });
    }
  });

  // Extract link text (CTAs and navigation)
  $('a').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();

    // Skip if already captured or too short
    if (!text || text.length < 2 || seenTexts.has(text)) return;

    // Check if it's a CTA-like link (has button styling or prominent classes)
    const classes = $el.attr('class') || '';
    const isCTA = /btn|button|cta|action/i.test(classes);

    if (isCTA || text.length > 3) {
      seenTexts.add(text);
      textBlocks.push({
        id: uuidv4(),
        selector: generateSelector($, el),
        tagName: 'a',
        originalText: text,
        type: isCTA ? 'button' : 'link',
      });
    }
  });

  // Extract list items
  $('li').each((_, el) => {
    const text = $(el).clone().children('ul, ol').remove().end().text().trim();
    if (text && text.length > 5 && !seenTexts.has(text)) {
      seenTexts.add(text);
      textBlocks.push({
        id: uuidv4(),
        selector: generateSelector($, el),
        tagName: 'li',
        originalText: text,
        type: 'list-item',
      });
    }
  });

  // Extract spans and divs with significant text (but not containers)
  $('span, div').each((_, el) => {
    const $el = $(el);

    // Skip if it has many children (container)
    if ($el.children().length > 2) return;

    // Get direct text only
    const text = $el.clone().children().remove().end().text().trim();

    if (text && text.length > 10 && text.length < 500 && !seenTexts.has(text)) {
      seenTexts.add(text);
      textBlocks.push({
        id: uuidv4(),
        selector: generateSelector($, el),
        tagName: el.tagName?.toLowerCase() || 'div',
        originalText: text,
        type: 'other',
      });
    }
  });

  return textBlocks;
}

/**
 * Generate a CSS selector for an element
 */
function generateSelector($: cheerio.CheerioAPI, el: Element): string {
  const $el = $(el);
  const parts: string[] = [];

  // Try ID first
  const id = $el.attr('id');
  if (id) {
    return `#${id}`;
  }

  // Build selector from tag + classes
  const tagName = el.tagName?.toLowerCase() || 'div';
  parts.push(tagName);

  // Add classes (first 2 meaningful ones)
  const classes = ($el.attr('class') || '')
    .split(/\s+/)
    .filter((c) => c && !c.match(/^(js-|is-|has-)/))
    .slice(0, 2);

  if (classes.length > 0) {
    parts.push(`.${classes.join('.')}`);
  }

  // Add nth-child if needed for uniqueness
  const parent = $el.parent();
  const siblings = parent.children(tagName);
  if (siblings.length > 1) {
    const index = siblings.index($el) + 1;
    parts.push(`:nth-child(${index})`);
  }

  return parts.join('');
}
