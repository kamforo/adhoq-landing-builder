import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { v4 as uuidv4 } from 'uuid';
import type { DetectedLink } from '@/types';

// Known affiliate network domains
const AFFILIATE_DOMAINS = [
  'clickbank.net',
  'shareasale.com',
  'cj.com',
  'awin.com',
  'rakutenmarketing.com',
  'impact.com',
  'partnerize.com',
  'pepperjam.com',
  'flexoffers.com',
  'linkconnector.com',
  'tradedoubler.com',
  'avangate.com',
  'jvzoo.com',
  'warriorplus.com',
  'clickfunnels.com',
  'digistore24.com',
];

// Tracking parameter patterns
const TRACKING_PARAMS = [
  'ref', 'aff', 'aid', 'affid', 'affiliate',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'msclkid', 'ttclid',
  'click_id', 'clickid', 'subid', 'sub_id',
  'source', 'src', 'campaign', 'cid',
  'hop', 'vendor', 'aff_id',
];

// Redirect service domains
const REDIRECT_DOMAINS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly',
  'buff.ly', 'is.gd', 'v.gd', 'shorturl.at',
  'rebrandly.com', 'bl.ink', 'short.io',
  'go.', 'link.', 'click.', 'redirect.',
];

/**
 * Detect and categorize all links in the HTML
 */
export function detectLinks($: cheerio.CheerioAPI, baseUrl: string): DetectedLink[] {
  const links: DetectedLink[] = [];
  const seenUrls = new Set<string>();

  // Helper to add a link
  const addLink = (url: string, $el: cheerio.Cheerio<Element>, el: Element, reason: string) => {
    if (!url || seenUrls.has(url)) return;
    if (url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) return;

    seenUrls.add(url);
    const anchorText = $el.text().trim();
    const selector = generateLinkSelector($, el);
    const detection = analyzeLink(url, $el, baseUrl);

    links.push({
      id: uuidv4(),
      type: detection.type,
      originalUrl: url,
      anchorText: anchorText || undefined,
      selector,
      confidence: detection.confidence,
      detectionReason: reason || detection.reason,
    });
  };

  // 1. Process all anchor tags with href
  $('a[href]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    addLink(href, $el, el, '');
  });

  // 2. Check onclick handlers for URLs
  $('[onclick]').each((_, el) => {
    const $el = $(el);
    const onclick = $el.attr('onclick') || '';

    // Match window.location, location.href, window.open patterns
    const urlMatches = onclick.match(/(?:window\.location|location\.href|window\.open)\s*[=(]\s*['"]([^'"]+)['"]/gi);
    if (urlMatches) {
      for (const match of urlMatches) {
        const urlMatch = match.match(/['"]([^'"]+)['"]/);
        if (urlMatch && urlMatch[1]) {
          addLink(urlMatch[1], $el, el, 'onclick handler');
        }
      }
    }
  });

  // 3. Check data attributes for URLs
  $('[data-href], [data-url], [data-link], [data-target]').each((_, el) => {
    const $el = $(el);
    const dataHref = $el.attr('data-href') || $el.attr('data-url') || $el.attr('data-link') || $el.attr('data-target') || '';
    if (dataHref.startsWith('http') || dataHref.startsWith('/')) {
      addLink(dataHref, $el, el, 'data attribute');
    }
  });

  // 4. Check buttons with formaction
  $('button[formaction], input[formaction]').each((_, el) => {
    const $el = $(el);
    const formaction = $el.attr('formaction') || '';
    addLink(formaction, $el, el, 'form action button');
  });

  // 5. Check form actions
  $('form[action]').each((_, el) => {
    const $el = $(el);
    const action = $el.attr('action') || '';
    if (action && !seenUrls.has(action)) {
      seenUrls.add(action);
      links.push({
        id: uuidv4(),
        type: 'cta',
        originalUrl: action,
        selector: generateLinkSelector($, el),
        confidence: 0.9,
        detectionReason: 'Form action URL',
      });
    }
  });

  // 6. Check iframes
  $('iframe[src]').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src') || '';
    if (src && !src.startsWith('data:')) {
      addLink(src, $el, el, 'iframe source');
    }
  });

  // 7. Look for URLs in inline scripts (tracking pixels, redirects)
  $('script:not([src])').each((_, el) => {
    const scriptContent = $(el).html() || '';
    // Find URLs that look like tracking or redirect endpoints
    const urlPattern = /['"]((https?:\/\/[^'"]+))['"]/g;
    let match;
    while ((match = urlPattern.exec(scriptContent)) !== null) {
      const url = match[1];
      // Only include if it looks like a tracking/API endpoint
      if (url.includes('track') || url.includes('click') || url.includes('pixel') ||
          url.includes('api') || url.includes('redirect') || url.includes('go.')) {
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          links.push({
            id: uuidv4(),
            type: 'tracking',
            originalUrl: url,
            selector: 'script',
            confidence: 0.7,
            detectionReason: 'URL in script',
          });
        }
      }
    }
  });

  return links;
}

/**
 * Analyze a link to determine its type
 */
function analyzeLink(
  href: string,
  $el: cheerio.Cheerio<Element>,
  baseUrl: string
): { type: DetectedLink['type']; confidence: number; reason: string } {
  const hrefLower = href.toLowerCase();
  const classes = ($el.attr('class') || '').toLowerCase();

  // Check for CTA patterns
  if (isCTALink($el, classes)) {
    return { type: 'cta', confidence: 0.9, reason: 'CTA styling or button classes detected' };
  }

  // Check for affiliate links
  const affiliateCheck = checkAffiliate(href);
  if (affiliateCheck.isAffiliate) {
    return { type: 'affiliate', confidence: affiliateCheck.confidence, reason: affiliateCheck.reason };
  }

  // Check for redirect/shortener services
  const redirectCheck = checkRedirect(href);
  if (redirectCheck.isRedirect) {
    return { type: 'redirect', confidence: redirectCheck.confidence, reason: redirectCheck.reason };
  }

  // Check for tracking links (has tracking params)
  const trackingCheck = checkTracking(href);
  if (trackingCheck.hasTracking) {
    return { type: 'tracking', confidence: trackingCheck.confidence, reason: trackingCheck.reason };
  }

  // Check if internal or external
  try {
    const linkUrl = new URL(href, baseUrl);
    const baseUrlObj = new URL(baseUrl);

    if (linkUrl.hostname === baseUrlObj.hostname) {
      // Check if it's navigation
      if (isNavLink($el, classes)) {
        return { type: 'navigation', confidence: 0.8, reason: 'Navigation element detected' };
      }
      return { type: 'internal', confidence: 0.9, reason: 'Same domain link' };
    }

    return { type: 'external', confidence: 0.9, reason: 'Different domain link' };
  } catch {
    // If URL parsing fails, check if it starts with / or #
    if (href.startsWith('/') || href.startsWith('#')) {
      return { type: 'internal', confidence: 0.8, reason: 'Relative path' };
    }
    return { type: 'external', confidence: 0.5, reason: 'Unknown URL format' };
  }
}

/**
 * Check if link is styled as a CTA
 */
function isCTALink($el: cheerio.Cheerio<Element>, classes: string): boolean {
  // Check class names
  if (/btn|button|cta|action|submit|signup|register|buy|order|get-started|download/i.test(classes)) {
    return true;
  }

  // Check parent for button-like styling
  const parentClasses = ($el.parent().attr('class') || '').toLowerCase();
  if (/btn|button|cta/i.test(parentClasses)) {
    return true;
  }

  // Check text content
  const text = $el.text().toLowerCase().trim();
  if (/^(buy|order|get|start|sign up|register|download|subscribe|join|try)/i.test(text)) {
    return true;
  }

  return false;
}

/**
 * Check if link is a navigation element
 */
function isNavLink($el: cheerio.Cheerio<Element>, classes: string): boolean {
  // Check if inside nav element
  if ($el.closest('nav, header, footer, [class*="nav"], [class*="menu"]').length > 0) {
    return true;
  }

  // Check class names
  if (/nav|menu|header|footer/i.test(classes)) {
    return true;
  }

  return false;
}

/**
 * Check for affiliate link patterns
 */
function checkAffiliate(href: string): { isAffiliate: boolean; confidence: number; reason: string } {
  const hrefLower = href.toLowerCase();

  // Check against known affiliate domains
  for (const domain of AFFILIATE_DOMAINS) {
    if (hrefLower.includes(domain)) {
      return { isAffiliate: true, confidence: 0.95, reason: `Known affiliate network: ${domain}` };
    }
  }

  // Check for affiliate parameters
  try {
    const url = new URL(href.startsWith('http') ? href : `https://example.com${href}`);
    const params = url.searchParams;

    for (const [key] of params.entries()) {
      const keyLower = key.toLowerCase();
      if (['ref', 'aff', 'affid', 'aid', 'affiliate', 'hop', 'vendor'].includes(keyLower)) {
        return { isAffiliate: true, confidence: 0.85, reason: `Affiliate parameter: ${key}` };
      }
    }
  } catch {
    // URL parsing failed
  }

  // Check for common affiliate URL patterns
  if (/\/(aff|affiliate|partner|ref)\//.test(hrefLower)) {
    return { isAffiliate: true, confidence: 0.75, reason: 'Affiliate URL path pattern' };
  }

  return { isAffiliate: false, confidence: 0, reason: '' };
}

/**
 * Check for redirect/URL shortener
 */
function checkRedirect(href: string): { isRedirect: boolean; confidence: number; reason: string } {
  const hrefLower = href.toLowerCase();

  for (const domain of REDIRECT_DOMAINS) {
    if (hrefLower.includes(domain)) {
      return { isRedirect: true, confidence: 0.9, reason: `URL shortener/redirect service: ${domain}` };
    }
  }

  // Check for redirect patterns in path
  if (/\/(redirect|go|out|click|track)\//.test(hrefLower)) {
    return { isRedirect: true, confidence: 0.7, reason: 'Redirect pattern in URL path' };
  }

  return { isRedirect: false, confidence: 0, reason: '' };
}

/**
 * Check for tracking parameters
 */
function checkTracking(href: string): { hasTracking: boolean; confidence: number; reason: string } {
  try {
    const url = new URL(href.startsWith('http') ? href : `https://example.com${href}`);
    const params = url.searchParams;
    const foundParams: string[] = [];

    for (const [key] of params.entries()) {
      const keyLower = key.toLowerCase();
      if (TRACKING_PARAMS.some((p) => keyLower.includes(p))) {
        foundParams.push(key);
      }
    }

    if (foundParams.length > 0) {
      return {
        hasTracking: true,
        confidence: Math.min(0.9, 0.5 + foundParams.length * 0.15),
        reason: `Tracking parameters: ${foundParams.join(', ')}`,
      };
    }
  } catch {
    // URL parsing failed
  }

  return { hasTracking: false, confidence: 0, reason: '' };
}

/**
 * Generate a selector for a link element
 */
function generateLinkSelector($: cheerio.CheerioAPI, el: Element): string {
  const $el = $(el);

  // Try ID
  const id = $el.attr('id');
  if (id) return `#${id}`;

  // Try href as unique identifier
  const href = $el.attr('href');
  if (href) {
    return `a[href="${href.replace(/"/g, '\\"')}"]`;
  }

  // Fallback to tag with classes
  const classes = ($el.attr('class') || '').split(/\s+/).filter(Boolean).slice(0, 2);
  if (classes.length > 0) {
    return `a.${classes.join('.')}`;
  }

  return 'a';
}
