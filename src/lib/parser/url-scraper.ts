import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { v4 as uuidv4 } from 'uuid';
import type { ParsedLandingPage, Asset } from '@/types';
import { extractTextBlocks } from './text-extractor';
import { detectLinks } from './link-detector';
import { detectTrackingCodes } from './tracking-detector';
import { extractForms } from './form-extractor';

/**
 * Scrape and parse a landing page from a URL
 * Downloads and inlines CSS/JS for self-contained output
 */
export async function scrapeLandingPageFromUrl(url: string): Promise<ParsedLandingPage> {
  // Fetch the HTML
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Use the resolved URL (after redirects) for base URL computation
  const resolvedUrl = response.url;
  const urlObj = new URL(resolvedUrl);
  const pathParts = urlObj.pathname.split('/');
  pathParts.pop(); // Remove last segment (file or empty)
  const baseUrl = urlObj.origin + pathParts.join('/');

  return parseHtmlContent(html, { sourceUrl: url, resolvedUrl, baseUrl, fetchAssets: true });
}

/**
 * Parse HTML content into a structured landing page
 */
export async function parseHtmlContent(
  html: string,
  options: { sourceUrl?: string; resolvedUrl?: string; sourceFileName?: string; baseUrl?: string; fetchAssets?: boolean }
): Promise<ParsedLandingPage> {
  const $ = cheerio.load(html);
  const baseUrl = options.baseUrl || '';

  // If fetching from URL, inline CSS and JS
  if (options.fetchAssets && baseUrl) {
    await inlineExternalCSS($, baseUrl);
    await inlineExternalJS($, baseUrl);
    makeImageUrlsAbsolute($, baseUrl);
  }

  // Extract basic metadata
  const title = $('title').text().trim() || 'Untitled';
  const description = $('meta[name="description"]').attr('content') || '';

  // Get the modified HTML with inlined assets
  const modifiedHtml = $.html();

  // Extract all assets (for reference)
  const assets = extractAssetReferences($, baseUrl);

  // Extract text blocks
  const textContent = extractTextBlocks($);

  // Detect links
  const links = detectLinks($, baseUrl);

  // Detect tracking codes
  const trackingCodes = detectTrackingCodes($);

  // Extract forms
  const forms = extractForms($);

  return {
    id: uuidv4(),
    sourceUrl: options.sourceUrl,
    resolvedUrl: options.resolvedUrl,
    sourceFileName: options.sourceFileName,
    html: modifiedHtml,
    title,
    description,
    textContent,
    assets,
    links,
    trackingCodes,
    forms,
    parsedAt: new Date(),
    originalSize: html.length,
  };
}

/**
 * Fetch and inline external CSS files
 */
async function inlineExternalCSS($: cheerio.CheerioAPI, baseUrl: string): Promise<void> {
  const cssLinks: Array<{ el: cheerio.Cheerio<Element>; href: string }> = [];

  // Match both quoted and unquoted rel=stylesheet
  $('link[rel="stylesheet"], link[rel=stylesheet]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    if (href && !href.startsWith('data:')) {
      cssLinks.push({ el: $el, href: resolveUrl(href, baseUrl) });
    }
  });

  // Fetch all CSS in parallel
  const cssPromises = cssLinks.map(async ({ el, href }) => {
    try {
      const cssContent = await fetchText(href);
      if (cssContent) {
        // Fix relative URLs in CSS (for fonts, images)
        const cssBaseUrl = href.substring(0, href.lastIndexOf('/') + 1);
        const fixedCss = fixCssUrls(cssContent, cssBaseUrl);

        // Replace link with inline style
        el.replaceWith(`<style>/* Source: ${href} */\n${fixedCss}</style>`);
      }
    } catch (err) {
      console.error(`Failed to fetch CSS: ${href}`, err);
      // Keep the original link if fetch fails
    }
  });

  await Promise.all(cssPromises);
}

/**
 * Fetch and inline external JS files
 */
async function inlineExternalJS($: cheerio.CheerioAPI, baseUrl: string): Promise<void> {
  const jsScripts: Array<{ el: cheerio.Cheerio<Element>; src: string }> = [];

  $('script[src]').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src');
    if (src && !src.startsWith('data:')) {
      jsScripts.push({ el: $el, src: resolveUrl(src, baseUrl) });
    }
  });

  // Fetch all JS in parallel
  const jsPromises = jsScripts.map(async ({ el, src }) => {
    try {
      const jsContent = await fetchText(src);
      if (jsContent) {
        // Replace script src with inline script
        el.removeAttr('src');
        el.html(`/* Source: ${src} */\n${jsContent}`);
      }
    } catch (err) {
      console.error(`Failed to fetch JS: ${src}`, err);
      // Keep the original src if fetch fails
    }
  });

  await Promise.all(jsPromises);
}

/**
 * Make all image URLs absolute
 */
function makeImageUrlsAbsolute($: cheerio.CheerioAPI, baseUrl: string): void {
  // Fix img src
  $('img').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src');
    if (src && !src.startsWith('data:') && !src.startsWith('http')) {
      $el.attr('src', resolveUrl(src, baseUrl));
    }
  });

  // Fix srcset
  $('img[srcset], source[srcset]').each((_, el) => {
    const $el = $(el);
    const srcset = $el.attr('srcset');
    if (srcset) {
      const fixed = srcset.split(',').map(part => {
        const [url, descriptor] = part.trim().split(/\s+/);
        if (url && !url.startsWith('data:') && !url.startsWith('http')) {
          return `${resolveUrl(url, baseUrl)} ${descriptor || ''}`.trim();
        }
        return part;
      }).join(', ');
      $el.attr('srcset', fixed);
    }
  });

  // Fix background images in style attributes
  $('[style*="url("]').each((_, el) => {
    const $el = $(el);
    const style = $el.attr('style') || '';
    const fixed = style.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (match, url) => {
      if (url.startsWith('data:') || url.startsWith('http')) return match;
      return `url('${resolveUrl(url, baseUrl)}')`;
    });
    $el.attr('style', fixed);
  });
}

/**
 * Fix relative URLs in CSS content
 */
function fixCssUrls(css: string, baseUrl: string): string {
  return css.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (match, url) => {
    if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('//')) {
      return match;
    }
    return `url('${resolveUrl(url, baseUrl)}')`;
  });
}

/**
 * Fetch text content from URL
 */
async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Extract asset references (for tracking, not for content)
 */
function extractAssetReferences($: cheerio.CheerioAPI, baseUrl: string): Asset[] {
  const assets: Asset[] = [];

  // Extract images
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      const absoluteUrl = resolveUrl(src, baseUrl);
      assets.push({
        id: uuidv4(),
        type: 'image',
        originalUrl: absoluteUrl,
        fileName: getFileNameFromUrl(absoluteUrl),
        mimeType: guessMimeType(absoluteUrl),
      });
    }
  });

  // Deduplicate assets by URL
  const seen = new Set<string>();
  return assets.filter((asset) => {
    if (seen.has(asset.originalUrl)) return false;
    seen.add(asset.originalUrl);
    return true;
  });
}

/**
 * Resolve a relative URL to absolute
 */
function resolveUrl(url: string, baseUrl: string): string {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  // Handle ./ relative paths
  if (url.startsWith('./')) {
    url = url.substring(2);
  }

  if (url.startsWith('/')) {
    // Get origin only (protocol + host)
    try {
      const urlObj = new URL(baseUrl);
      return `${urlObj.origin}${url}`;
    } catch {
      return `${baseUrl}${url}`;
    }
  }

  // For relative paths, append to baseUrl (which should include path)
  // Remove trailing slash from baseUrl if present
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  return `${base}${url}`;
}

/**
 * Get filename from URL
 */
function getFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const fileName = path.split('/').pop() || 'unknown';
    return fileName.split('?')[0];
  } catch {
    return 'unknown';
  }
}

/**
 * Guess MIME type from URL/extension
 */
function guessMimeType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || '';
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    ico: 'image/x-icon',
    css: 'text/css',
    js: 'application/javascript',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
