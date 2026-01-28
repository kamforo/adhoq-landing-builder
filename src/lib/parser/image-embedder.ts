import * as cheerio from 'cheerio';

const IMAGE_TIMEOUT_MS = 2000;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * Download external images in HTML and embed them as base64 data URIs.
 * Handles <img src>, <source srcset>, and inline CSS background-image urls.
 * On download failure, keeps the original URL (graceful degradation).
 */
export async function embedExternalImages(html: string): Promise<string> {
  const $ = cheerio.load(html);

  // Collect all unique external URLs to download once
  const urlMap = new Map<string, string>(); // url -> data URI (filled after download)

  // --- Collect from <img src> ---
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src && isExternalUrl(src)) {
      urlMap.set(src, src);
    }
  });

  // --- Collect from <img srcset> and <source srcset> ---
  $('img[srcset], source[srcset]').each((_, el) => {
    const srcset = $(el).attr('srcset');
    if (srcset) {
      for (const part of srcset.split(',')) {
        const url = part.trim().split(/\s+/)[0];
        if (url && isExternalUrl(url)) {
          urlMap.set(url, url);
        }
      }
    }
  });

  // --- Collect from inline style background-image ---
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const matches = style.matchAll(/url\(['"]?(https?:\/\/[^'")\s]+)['"]?\)/g);
    for (const match of matches) {
      urlMap.set(match[1], match[1]);
    }
  });

  // --- Collect from <style> blocks ---
  $('style').each((_, el) => {
    const css = $(el).html() || '';
    const matches = css.matchAll(/url\(['"]?(https?:\/\/[^'")\s]+)['"]?\)/g);
    for (const match of matches) {
      urlMap.set(match[1], match[1]);
    }
  });

  if (urlMap.size === 0) {
    return html;
  }

  console.log(`Image embedder: found ${urlMap.size} external image URL(s) to embed`);

  // Download all images in parallel
  const downloadPromises = Array.from(urlMap.keys()).map(async (url) => {
    const dataUri = await downloadAsDataUri(url);
    if (dataUri) {
      urlMap.set(url, dataUri);
    }
    // On failure, urlMap retains the original URL (no replacement)
  });

  await Promise.all(downloadPromises);

  // Count how many were embedded
  let embeddedCount = 0;
  for (const [url, value] of urlMap) {
    if (value !== url) embeddedCount++;
  }
  console.log(`Image embedder: embedded ${embeddedCount}/${urlMap.size} image(s)`);

  // --- Replace in <img src> ---
  $('img').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src');
    if (src && urlMap.has(src) && urlMap.get(src) !== src) {
      $el.attr('src', urlMap.get(src)!);
    }
  });

  // --- Replace in <img srcset> and <source srcset> ---
  $('img[srcset], source[srcset]').each((_, el) => {
    const $el = $(el);
    const srcset = $el.attr('srcset');
    if (srcset) {
      const fixed = srcset.split(',').map(part => {
        const parts = part.trim().split(/\s+/);
        const url = parts[0];
        if (url && urlMap.has(url) && urlMap.get(url) !== url) {
          parts[0] = urlMap.get(url)!;
        }
        return parts.join(' ');
      }).join(', ');
      $el.attr('srcset', fixed);
    }
  });

  // --- Replace in inline style background-image ---
  $('[style]').each((_, el) => {
    const $el = $(el);
    const style = $el.attr('style') || '';
    const fixed = style.replace(/url\(['"]?(https?:\/\/[^'")\s]+)['"]?\)/g, (match, url) => {
      if (urlMap.has(url) && urlMap.get(url) !== url) {
        return `url('${urlMap.get(url)}')`;
      }
      return match;
    });
    $el.attr('style', fixed);
  });

  // --- Replace in <style> blocks ---
  $('style').each((_, el) => {
    const $el = $(el);
    const css = $el.html() || '';
    const fixed = css.replace(/url\(['"]?(https?:\/\/[^'")\s]+)['"]?\)/g, (match, url) => {
      if (urlMap.has(url) && urlMap.get(url) !== url) {
        return `url('${urlMap.get(url)}')`;
      }
      return match;
    });
    $el.html(fixed);
  });

  return $.html();
}

function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

async function downloadAsDataUri(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`Image embedder: failed to fetch ${url} (${response.status})`);
      return null;
    }

    // Check content-length if available
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
      console.warn(`Image embedder: skipping ${url} (too large: ${contentLength} bytes)`);
      return null;
    }

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > MAX_IMAGE_SIZE) {
      console.warn(`Image embedder: skipping ${url} (too large: ${buffer.byteLength} bytes)`);
      return null;
    }

    const mimeType = response.headers.get('content-type') || guessMimeFromUrl(url);
    const base64 = Buffer.from(buffer).toString('base64');

    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.warn(`Image embedder: timeout fetching ${url}`);
    } else {
      console.warn(`Image embedder: error fetching ${url}:`, error);
    }
    return null;
  }
}

function guessMimeFromUrl(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || '';
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    ico: 'image/x-icon',
    avif: 'image/avif',
  };
  return mimeTypes[ext] || 'image/png';
}
