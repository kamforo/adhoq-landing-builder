import * as cheerio from 'cheerio';
import type { TrackingCode, GenerationOptions, ChangeLog } from '@/types';

/**
 * Process tracking codes based on generation options
 */
export function processTrackingCodes(
  $: cheerio.CheerioAPI,
  trackingCodes: TrackingCode[],
  options: GenerationOptions
): ChangeLog[] {
  const changes: ChangeLog[] = [];

  for (const tracking of trackingCodes) {
    // Check if this tracking code should be removed
    if (options.removeTrackingCodes || tracking.shouldRemove) {
      const change = removeTrackingCode($, tracking);
      if (change) {
        changes.push(change);
      }
      continue;
    }

    // Check if this tracking code should be replaced
    if (tracking.shouldReplace && tracking.replacementCode) {
      const change = replaceTrackingCode($, tracking, tracking.replacementCode);
      if (change) {
        changes.push(change);
      }
      continue;
    }

    // Check against replacement rules
    const replacement = findReplacementForTracking(tracking, options);
    if (replacement) {
      const change = replaceTrackingCode($, tracking, replacement);
      if (change) {
        changes.push(change);
      }
    }
  }

  return changes;
}

/**
 * Remove a tracking code from the HTML
 */
function removeTrackingCode(
  $: cheerio.CheerioAPI,
  tracking: TrackingCode
): ChangeLog | null {
  let removed = false;

  // Try to find by selector
  if (tracking.selector) {
    const $el = $(tracking.selector);
    if ($el.length > 0) {
      $el.remove();
      removed = true;
    }
  }

  // Also try to find by code content
  if (!removed && tracking.code) {
    // For script tags with src
    if (tracking.code.startsWith('http') || tracking.code.startsWith('//')) {
      $(`script[src*="${extractDomainFromUrl(tracking.code)}"]`).remove();
      removed = true;
    } else {
      // For inline scripts, try to find by content
      $('script').each((_, el) => {
        const $script = $(el);
        const content = $script.html() || '';
        if (content.includes(tracking.code.substring(0, 50))) {
          $script.remove();
          removed = true;
        }
      });
    }
  }

  // Remove noscript fallbacks for this tracking type
  if (tracking.type === 'facebook-pixel') {
    $('noscript').each((_, el) => {
      const $noscript = $(el);
      const content = $noscript.html() || '';
      if (content.includes('facebook.com/tr')) {
        $noscript.remove();
        removed = true;
      }
    });
  }

  // Remove related meta tags
  if (tracking.type === 'facebook-pixel') {
    $('meta[name="facebook-domain-verification"]').remove();
  }
  if (tracking.type === 'google-analytics') {
    $('meta[name="google-site-verification"]').remove();
  }

  if (removed) {
    return {
      type: 'tracking',
      selector: tracking.selector || 'script',
      originalValue: tracking.code.substring(0, 100),
      newValue: '[removed]',
      reason: `Removed ${tracking.type} tracking code`,
    };
  }

  return null;
}

/**
 * Replace a tracking code with new code
 */
function replaceTrackingCode(
  $: cheerio.CheerioAPI,
  tracking: TrackingCode,
  replacementCode: string
): ChangeLog | null {
  let replaced = false;

  // Try to find by selector
  if (tracking.selector) {
    const $el = $(tracking.selector);
    if ($el.length > 0) {
      if ($el.is('script')) {
        // If it's a script tag, replace the content
        const src = $el.attr('src');
        if (src) {
          // External script - replace src
          $el.attr('src', replacementCode);
        } else {
          // Inline script - replace content
          $el.html(replacementCode);
        }
        replaced = true;
      } else {
        // Replace the entire element
        $el.replaceWith(replacementCode);
        replaced = true;
      }
    }
  }

  // Fallback: find by content
  if (!replaced && tracking.code) {
    $('script').each((_, el) => {
      const $script = $(el);
      const content = $script.html() || '';
      const src = $script.attr('src') || '';

      if (
        content.includes(tracking.code.substring(0, 50)) ||
        src.includes(extractDomainFromUrl(tracking.code))
      ) {
        if (src) {
          $script.attr('src', replacementCode);
        } else {
          $script.html(replacementCode);
        }
        replaced = true;
      }
    });
  }

  if (replaced) {
    return {
      type: 'tracking',
      selector: tracking.selector || 'script',
      originalValue: tracking.code.substring(0, 100),
      newValue: replacementCode.substring(0, 100),
      reason: `Replaced ${tracking.type} tracking code`,
    };
  }

  return null;
}

/**
 * Find a replacement rule for a tracking code
 */
function findReplacementForTracking(
  tracking: TrackingCode,
  options: GenerationOptions
): string | null {
  for (const rule of options.trackingCodeReplacements) {
    if (rule.originalType === tracking.type) {
      return rule.replacementCode;
    }
  }
  return null;
}

/**
 * Extract domain from URL for matching
 */
function extractDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('//') ? `https:${url}` : url);
    return urlObj.hostname;
  } catch {
    const match = url.match(/\/\/([^/]+)/);
    return match ? match[1] : url.substring(0, 30);
  }
}

/**
 * Add new tracking code to the page
 */
export function addTrackingCode(
  $: cheerio.CheerioAPI,
  code: string,
  location: 'head' | 'body-start' | 'body-end' = 'head'
): void {
  const $code = $(`<script>${code}</script>`);

  switch (location) {
    case 'head':
      $('head').append($code);
      break;
    case 'body-start':
      $('body').prepend($code);
      break;
    case 'body-end':
      $('body').append($code);
      break;
  }
}

/**
 * Add Facebook Pixel code
 */
export function addFacebookPixel($: cheerio.CheerioAPI, pixelId: string): void {
  const code = `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
`;
  addTrackingCode($, code, 'head');
}

/**
 * Add Google Analytics 4 code
 */
export function addGoogleAnalytics($: cheerio.CheerioAPI, measurementId: string): void {
  // Add the gtag.js script
  $('head').append(`
<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${measurementId}');
</script>
`);
}
