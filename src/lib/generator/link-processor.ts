import * as cheerio from 'cheerio';
import type { DetectedLink, GenerationOptions, ChangeLog } from '@/types';

/**
 * Process links based on generation options
 */
export function processLinks(
  $: cheerio.CheerioAPI,
  links: DetectedLink[],
  options: GenerationOptions
): ChangeLog[] {
  const changes: ChangeLog[] = [];

  for (const link of links) {
    const change = processLink($, link, options);
    if (change) {
      changes.push(change);
    }
  }

  return changes;
}

/**
 * Process a single link
 */
function processLink(
  $: cheerio.CheerioAPI,
  link: DetectedLink,
  options: GenerationOptions
): ChangeLog | null {
  // If link already has a replacement set, use it
  if (link.replacementUrl) {
    return applyLinkReplacement($, link, link.replacementUrl, 'User-specified replacement');
  }

  // Handle based on link handling option
  switch (options.linkHandling) {
    case 'keep':
      return null;

    case 'remove-tracking':
      return removeTrackingFromLink($, link);

    case 'replace-custom':
      return applyCustomReplacement($, link, options);

    default:
      return null;
  }
}

/**
 * Remove tracking parameters from a link
 */
function removeTrackingFromLink(
  $: cheerio.CheerioAPI,
  link: DetectedLink
): ChangeLog | null {
  // Only process tracking or affiliate links
  if (!['tracking', 'affiliate'].includes(link.type)) {
    return null;
  }

  try {
    const url = new URL(link.originalUrl);
    const paramsToRemove = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'gclid', 'fbclid', 'msclkid', 'ttclid',
      'ref', 'aff', 'aid', 'affid', 'affiliate',
      'click_id', 'clickid', 'subid', 'sub_id',
      'source', 'src', 'campaign', 'cid',
    ];

    let modified = false;
    for (const param of paramsToRemove) {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        modified = true;
      }
    }

    if (!modified) return null;

    const cleanUrl = url.toString();
    return applyLinkReplacement($, link, cleanUrl, 'Removed tracking parameters');
  } catch {
    return null;
  }
}

/**
 * Apply custom replacement rules
 */
function applyCustomReplacement(
  $: cheerio.CheerioAPI,
  link: DetectedLink,
  options: GenerationOptions
): ChangeLog | null {
  // Find matching replacement rule
  for (const rule of options.linkReplacements) {
    // Check if types match (if specified)
    if (rule.applyToTypes && rule.applyToTypes.length > 0) {
      if (!rule.applyToTypes.includes(link.type)) {
        continue;
      }
    }

    // Check if pattern matches
    try {
      const pattern = new RegExp(rule.originalPattern);
      if (pattern.test(link.originalUrl)) {
        return applyLinkReplacement(
          $,
          link,
          rule.replacementUrl,
          `Matched replacement rule: ${rule.originalPattern}`
        );
      }
    } catch {
      // If regex is invalid, try exact match
      if (link.originalUrl.includes(rule.originalPattern)) {
        return applyLinkReplacement(
          $,
          link,
          rule.replacementUrl,
          `Matched replacement pattern: ${rule.originalPattern}`
        );
      }
    }
  }

  return null;
}

/**
 * Apply a link replacement in the HTML
 */
function applyLinkReplacement(
  $: cheerio.CheerioAPI,
  link: DetectedLink,
  newUrl: string,
  reason: string
): ChangeLog | null {
  // Find and update the link
  const $links = $(`a[href="${link.originalUrl}"]`);

  if ($links.length === 0) {
    // Try to find by selector
    const $el = $(link.selector);
    if ($el.length > 0 && $el.attr('href') === link.originalUrl) {
      $el.attr('href', newUrl);
      $el.attr('data-original-href', link.originalUrl);
    } else {
      return null;
    }
  } else {
    $links.each((_, el) => {
      $(el).attr('href', newUrl);
      $(el).attr('data-original-href', link.originalUrl);
    });
  }

  return {
    type: 'link',
    selector: link.selector,
    originalValue: link.originalUrl,
    newValue: newUrl,
    reason,
  };
}

/**
 * Replace all links matching a pattern
 */
export function replaceLinksMatchingPattern(
  $: cheerio.CheerioAPI,
  pattern: string | RegExp,
  replacement: string
): ChangeLog[] {
  const changes: ChangeLog[] = [];
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  $('a[href]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';

    if (regex.test(href)) {
      $el.attr('href', replacement);
      $el.attr('data-original-href', href);

      changes.push({
        type: 'link',
        selector: `a[href="${href}"]`,
        originalValue: href,
        newValue: replacement,
        reason: `Pattern match: ${pattern}`,
      });
    }
  });

  return changes;
}

/**
 * Update form actions
 */
export function updateFormActions(
  $: cheerio.CheerioAPI,
  pattern: string | RegExp,
  replacement: string
): ChangeLog[] {
  const changes: ChangeLog[] = [];
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  $('form[action]').each((_, el) => {
    const $form = $(el);
    const action = $form.attr('action') || '';

    if (regex.test(action)) {
      $form.attr('action', replacement);
      $form.attr('data-original-action', action);

      changes.push({
        type: 'link',
        selector: `form[action="${action}"]`,
        originalValue: action,
        newValue: replacement,
        reason: `Form action pattern match: ${pattern}`,
      });
    }
  });

  return changes;
}
