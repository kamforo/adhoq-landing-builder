import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import type { TrackingCode } from '@/types';

/**
 * Patterns for detecting various tracking codes
 */
const TRACKING_PATTERNS: {
  type: TrackingCode['type'];
  patterns: RegExp[];
  extractor?: (match: RegExpMatchArray, fullCode: string) => string;
}[] = [
  {
    type: 'facebook-pixel',
    patterns: [
      /fbq\s*\(\s*['"]init['"]/i,
      /connect\.facebook\.net.*fbevents\.js/i,
      /facebook\.com\/tr\?/i,
      /fbq\s*\(/i,
    ],
  },
  {
    type: 'google-analytics',
    patterns: [
      /gtag\s*\(\s*['"]config['"]\s*,\s*['"]G-/i,
      /gtag\s*\(\s*['"]config['"]\s*,\s*['"]UA-/i,
      /google-analytics\.com\/analytics\.js/i,
      /googletagmanager\.com\/gtag\/js/i,
      /ga\s*\(\s*['"]create['"]/i,
      /_gaq\.push/i,
    ],
  },
  {
    type: 'google-tag-manager',
    patterns: [
      /googletagmanager\.com\/gtm\.js/i,
      /GTM-[A-Z0-9]+/i,
      /gtm\.start/i,
    ],
  },
  {
    type: 'tiktok-pixel',
    patterns: [
      /ttq\.load/i,
      /analytics\.tiktok\.com/i,
      /ttq\s*\(/i,
    ],
  },
  {
    type: 'custom',
    patterns: [
      /hotjar\.com/i,
      /clarity\.ms/i,
      /mixpanel\.com/i,
      /segment\.com/i,
      /heap\.io/i,
      /amplitude\.com/i,
      /intercom\.io/i,
      /crisp\.chat/i,
      /drift\.com/i,
      /livechat\.com/i,
      /zendesk\.com/i,
      /hubspot\.com/i,
      /mailchimp\.com/i,
      /convertkit\.com/i,
      /klaviyo\.com/i,
    ],
  },
];

/**
 * Detect tracking codes and pixels in the HTML
 */
export function detectTrackingCodes($: cheerio.CheerioAPI): TrackingCode[] {
  const trackingCodes: TrackingCode[] = [];
  const seenCodes = new Set<string>();

  // Check all script tags
  $('script').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src') || '';
    const inlineCode = $el.html() || '';
    const fullCode = src + ' ' + inlineCode;

    // Check against all patterns
    for (const tracker of TRACKING_PATTERNS) {
      for (const pattern of tracker.patterns) {
        if (pattern.test(fullCode)) {
          // Create a hash to avoid duplicates
          const codeHash = `${tracker.type}-${fullCode.substring(0, 100)}`;
          if (seenCodes.has(codeHash)) continue;
          seenCodes.add(codeHash);

          // Determine selector
          const selector = src
            ? `script[src*="${extractDomainFromUrl(src)}"]`
            : `script:contains("${extractIdentifier(inlineCode, tracker.type)}")`;

          trackingCodes.push({
            id: uuidv4(),
            type: tracker.type,
            code: src || inlineCode.substring(0, 500),
            selector,
            shouldRemove: false,
            shouldReplace: false,
          });
          break; // Only match once per tracker type per script
        }
      }
    }
  });

  // Check for noscript tracking pixels (like Facebook)
  $('noscript').each((_, el) => {
    const $el = $(el);
    const content = $el.html() || '';

    // Facebook pixel noscript fallback
    if (/facebook\.com\/tr\?/.test(content)) {
      const codeHash = `facebook-pixel-noscript`;
      if (!seenCodes.has(codeHash)) {
        seenCodes.add(codeHash);
        trackingCodes.push({
          id: uuidv4(),
          type: 'facebook-pixel',
          code: content.substring(0, 500),
          selector: 'noscript:contains("facebook.com/tr")',
          shouldRemove: false,
          shouldReplace: false,
        });
      }
    }

    // Generic tracking pixel images
    if (/\?id=|pixel|track|analytics/i.test(content)) {
      const codeHash = `other-noscript-${content.substring(0, 50)}`;
      if (!seenCodes.has(codeHash)) {
        seenCodes.add(codeHash);
        trackingCodes.push({
          id: uuidv4(),
          type: 'other',
          code: content.substring(0, 500),
          selector: 'noscript',
          shouldRemove: false,
          shouldReplace: false,
        });
      }
    }
  });

  // Check for tracking images (1x1 pixels)
  $('img').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src') || '';
    const width = $el.attr('width');
    const height = $el.attr('height');

    // Check if it's a tracking pixel (1x1 or hidden)
    const isTrackingPixel =
      (width === '1' && height === '1') ||
      (width === '0' && height === '0') ||
      /pixel|track|beacon/i.test(src) ||
      /facebook\.com\/tr\?/.test(src);

    if (isTrackingPixel && !seenCodes.has(src)) {
      seenCodes.add(src);
      trackingCodes.push({
        id: uuidv4(),
        type: 'other',
        code: src,
        selector: `img[src*="${extractDomainFromUrl(src)}"]`,
        shouldRemove: false,
        shouldReplace: false,
      });
    }
  });

  // Check meta tags for tracking
  $('meta').each((_, el) => {
    const $el = $(el);
    const name = $el.attr('name') || '';
    const content = $el.attr('content') || '';

    // Facebook domain verification
    if (name === 'facebook-domain-verification') {
      trackingCodes.push({
        id: uuidv4(),
        type: 'facebook-pixel',
        code: `<meta name="facebook-domain-verification" content="${content}">`,
        selector: 'meta[name="facebook-domain-verification"]',
        shouldRemove: false,
        shouldReplace: false,
      });
    }

    // Google site verification
    if (name === 'google-site-verification') {
      trackingCodes.push({
        id: uuidv4(),
        type: 'google-analytics',
        code: `<meta name="google-site-verification" content="${content}">`,
        selector: 'meta[name="google-site-verification"]',
        shouldRemove: false,
        shouldReplace: false,
      });
    }
  });

  return trackingCodes;
}

/**
 * Extract domain from URL for selector
 */
function extractDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('//') ? `https:${url}` : url);
    return urlObj.hostname;
  } catch {
    // Try to extract domain pattern
    const match = url.match(/\/\/([^/]+)/);
    return match ? match[1] : url.substring(0, 30);
  }
}

/**
 * Extract a unique identifier from inline code
 */
function extractIdentifier(code: string, type: TrackingCode['type']): string {
  // Try to find tracking IDs
  const patterns: Record<string, RegExp> = {
    'facebook-pixel': /fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/,
    'google-analytics': /['"]([UG]A?-[A-Z0-9-]+)['"]/,
    'google-tag-manager': /(GTM-[A-Z0-9]+)/,
    'tiktok-pixel': /ttq\.load\s*\(\s*['"]([^'"]+)['"]/,
  };

  const pattern = patterns[type];
  if (pattern) {
    const match = code.match(pattern);
    if (match) return match[1];
  }

  // Fallback to first 30 chars
  return code.replace(/[\n\r\s]+/g, ' ').substring(0, 30);
}
