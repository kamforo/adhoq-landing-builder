import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { v4 as uuidv4 } from 'uuid';
import type { PersuasionElement, PersuasionType } from '@/types';

// Patterns for detecting persuasion elements
const PERSUASION_PATTERNS: Record<PersuasionType, { text: RegExp[]; class: RegExp[] }> = {
  urgency: {
    text: [
      /limited\s+time/i,
      /act\s+(now|fast|quickly)/i,
      /don'?t\s+(miss|wait)/i,
      /hurry/i,
      /ends?\s+(soon|today|tonight)/i,
      /last\s+chance/i,
      /before\s+it'?s?\s+too\s+late/i,
      /only\s+\d+\s+(hours?|days?|minutes?)\s+left/i,
      /expires?\s+(soon|today)/i,
    ],
    class: [/urgent/i, /hurry/i, /limited/i],
  },
  scarcity: {
    text: [
      /only\s+\d+\s+(left|remaining|available|spots?)/i,
      /\d+\s+(people\s+)?(viewing|watching)/i,
      /selling\s+fast/i,
      /almost\s+(sold\s+out|gone)/i,
      /limited\s+(spots?|seats?|availability|stock)/i,
      /few\s+(left|remaining)/i,
      /low\s+stock/i,
      /high\s+demand/i,
    ],
    class: [/scarcity/i, /stock/i, /inventory/i],
  },
  'social-proof': {
    text: [
      /\d+[,\.]?\d*\+?\s*(customers?|users?|clients?|people|members?|subscribers?)/i,
      /join\s+\d+[,\.]?\d*/i,
      /trusted\s+by/i,
      /used\s+by/i,
      /loved\s+by/i,
      /\d+\s*\+?\s*(reviews?|ratings?|testimonials?)/i,
      /\d+(\.\d+)?\s*(out\s+of\s+\d+\s+)?stars?/i,
      /★+/,
      /⭐+/,
    ],
    class: [/testimonial/i, /review/i, /social-proof/i, /customer/i, /rating/i],
  },
  authority: {
    text: [
      /as\s+(seen|featured)\s+(on|in)/i,
      /featured\s+in/i,
      /trusted\s+by\s+(leading|top|major)/i,
      /award[- ]?winning/i,
      /certified/i,
      /official/i,
      /expert/i,
      /years?\s+of\s+experience/i,
      /industry\s+leader/i,
    ],
    class: [/authority/i, /press/i, /media/i, /featured/i, /logo-bar/i, /partner/i],
  },
  'trust-badge': {
    text: [
      /secure\s+(checkout|payment|transaction)/i,
      /ssl\s+(secured?|encrypted)/i,
      /100%\s+secure/i,
      /money[- ]?back/i,
      /verified/i,
      /certified/i,
      /protected/i,
      /safe\s+&?\s*secure/i,
    ],
    class: [/trust/i, /badge/i, /secure/i, /ssl/i, /payment-icon/i, /security/i],
  },
  guarantee: {
    text: [
      /money[- ]?back\s+guarantee/i,
      /\d+[- ]?day\s+(money[- ]?back\s+)?guarantee/i,
      /satisfaction\s+guarantee/i,
      /risk[- ]?free/i,
      /no\s+risk/i,
      /full\s+refund/i,
      /100%\s+guarantee/i,
      /no\s+questions?\s+asked/i,
    ],
    class: [/guarantee/i, /refund/i, /risk-free/i],
  },
  fomo: {
    text: [
      /\d+\s+people\s+(are\s+)?(viewing|watching|looking)/i,
      /in\s+your\s+area/i,
      /others?\s+(bought|purchased|ordered)/i,
      /popular\s+choice/i,
      /trending/i,
      /best[- ]?seller/i,
      /most\s+popular/i,
      /don'?t\s+be\s+left\s+(out|behind)/i,
    ],
    class: [/fomo/i, /notification/i, /popup/i, /viewer/i],
  },
  countdown: {
    text: [
      /\d+:\d+:\d+/,
      /\d+\s*:\s*\d+/,
      /timer/i,
      /countdown/i,
      /time\s+remaining/i,
    ],
    class: [/countdown/i, /timer/i, /clock/i, /flipclock/i],
  },
  discount: {
    text: [
      /\d+%\s*off/i,
      /save\s+\$?\d+/i,
      /was\s+\$?\d+.*now\s+\$?\d+/i,
      /special\s+(offer|price|deal)/i,
      /discount/i,
      /sale\s+price/i,
      /reduced/i,
      /original\s+price.*\$?\d+/i,
    ],
    class: [/discount/i, /sale/i, /offer/i, /price-drop/i, /savings/i],
  },
  'free-offer': {
    text: [
      /free\s+(trial|shipping|bonus|gift|download|access)/i,
      /try\s+(it\s+)?free/i,
      /get\s+(it\s+)?free/i,
      /no\s+(credit\s+card|payment)\s+required/i,
      /\$0/i,
      /at\s+no\s+cost/i,
      /complimentary/i,
      /bonus\s*:/i,
    ],
    class: [/free/i, /bonus/i, /trial/i, /gift/i],
  },
};

/**
 * Detect persuasion elements on the page
 */
export function detectPersuasionElements($: cheerio.CheerioAPI): PersuasionElement[] {
  const elements: PersuasionElement[] = [];
  const seen = new Set<string>(); // Avoid duplicates

  // Check all text-containing elements
  $('p, span, div, h1, h2, h3, h4, h5, h6, li, a, button, label').each((_, el) => {
    const $el = $(el);

    // Skip if inside script or style
    if ($el.closest('script, style, noscript').length > 0) return;

    const text = $el.text().trim();
    const classes = $el.attr('class') || '';

    if (!text && !classes) return;

    // Check each persuasion type
    for (const [type, patterns] of Object.entries(PERSUASION_PATTERNS)) {
      // Check text patterns
      for (const pattern of patterns.text) {
        if (pattern.test(text)) {
          const key = `${type}-${text.substring(0, 50)}`;
          if (!seen.has(key)) {
            seen.add(key);
            elements.push(createPersuasionElement($, el, type as PersuasionType, text, 'text'));
          }
          break;
        }
      }

      // Check class patterns
      for (const pattern of patterns.class) {
        if (pattern.test(classes)) {
          const key = `${type}-class-${classes.substring(0, 50)}`;
          if (!seen.has(key)) {
            seen.add(key);
            elements.push(createPersuasionElement($, el, type as PersuasionType, text || classes, 'class'));
          }
          break;
        }
      }
    }
  });

  // Special detection for countdown timers
  detectCountdownTimers($, elements);

  // Special detection for trust badges (images)
  detectTrustBadgeImages($, elements);

  return elements;
}

/**
 * Create a persuasion element object
 */
function createPersuasionElement(
  $: cheerio.CheerioAPI,
  el: Element,
  type: PersuasionType,
  content: string,
  matchedBy: 'text' | 'class'
): PersuasionElement {
  return {
    id: uuidv4(),
    type,
    selector: generateSelector($, el),
    content: content.substring(0, 200),
    strength: determineStrength(type, content, matchedBy),
  };
}

/**
 * Determine the strength of a persuasion element
 */
function determineStrength(
  type: PersuasionType,
  content: string,
  matchedBy: 'text' | 'class'
): PersuasionElement['strength'] {
  // Class matches are usually intentional = strong
  if (matchedBy === 'class') return 'strong';

  // Specific number claims are stronger
  if (/\d{3,}/.test(content)) return 'strong'; // Large numbers
  if (/\d+%/.test(content)) return 'strong'; // Percentages

  // Type-specific strength
  switch (type) {
    case 'countdown':
    case 'guarantee':
      return 'strong';
    case 'scarcity':
    case 'urgency':
      return content.length > 30 ? 'strong' : 'medium';
    case 'social-proof':
      return /★|⭐|\d{4,}/.test(content) ? 'strong' : 'medium';
    default:
      return 'medium';
  }
}

/**
 * Detect countdown timer elements
 */
function detectCountdownTimers($: cheerio.CheerioAPI, elements: PersuasionElement[]): void {
  // Look for common countdown libraries and patterns
  $('[class*="countdown"], [class*="timer"], [id*="countdown"], [id*="timer"], [data-countdown]').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();

    elements.push({
      id: uuidv4(),
      type: 'countdown',
      selector: generateSelector($, el),
      content: text || 'Countdown timer',
      strength: 'strong',
    });
  });
}

/**
 * Detect trust badge images
 */
function detectTrustBadgeImages($: cheerio.CheerioAPI, elements: PersuasionElement[]): void {
  $('img').each((_, el) => {
    const $el = $(el);
    const src = ($el.attr('src') || '').toLowerCase();
    const alt = ($el.attr('alt') || '').toLowerCase();
    const classes = ($el.attr('class') || '').toLowerCase();

    const trustKeywords = ['trust', 'secure', 'ssl', 'verified', 'badge', 'guarantee', 'mcafee', 'norton', 'stripe', 'paypal', 'visa', 'mastercard'];

    const isTrustBadge = trustKeywords.some(kw =>
      src.includes(kw) || alt.includes(kw) || classes.includes(kw)
    );

    if (isTrustBadge) {
      elements.push({
        id: uuidv4(),
        type: 'trust-badge',
        selector: generateSelector($, el),
        content: alt || 'Trust badge image',
        strength: 'strong',
      });
    }
  });
}

/**
 * Generate a CSS selector for an element
 */
function generateSelector($: cheerio.CheerioAPI, el: Element): string {
  const $el = $(el);

  const id = $el.attr('id');
  if (id) return `#${id}`;

  const classes = ($el.attr('class') || '').split(/\s+/).filter(Boolean).slice(0, 2);
  const tagName = el.tagName?.toLowerCase() || 'div';

  if (classes.length > 0) {
    return `${tagName}.${classes.join('.')}`;
  }

  return `${tagName}:nth-child(${$el.index() + 1})`;
}
