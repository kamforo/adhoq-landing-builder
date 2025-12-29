import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import type { ParsedLandingPage, Asset } from '@/types';
import { parseHtmlContent } from './url-scraper';

/**
 * Parse a landing page from an uploaded HTML file
 */
export async function parseHtmlFile(
  content: string,
  fileName: string
): Promise<ParsedLandingPage> {
  return parseHtmlContent(content, { sourceFileName: fileName });
}

/**
 * Parse a landing page from an uploaded ZIP file
 * The ZIP should contain an index.html and optionally assets
 */
export async function parseZipFile(
  buffer: ArrayBuffer,
  fileName: string
): Promise<ParsedLandingPage> {
  const zip = await JSZip.loadAsync(buffer);

  // Find the main HTML file
  const htmlFiles = Object.keys(zip.files).filter(
    (name) => name.endsWith('.html') || name.endsWith('.htm')
  );

  // Prioritize index.html, then any HTML file at root level
  let mainHtmlPath = htmlFiles.find((f) => f.toLowerCase() === 'index.html');
  if (!mainHtmlPath) {
    mainHtmlPath = htmlFiles.find((f) => !f.includes('/'));
  }
  if (!mainHtmlPath && htmlFiles.length > 0) {
    mainHtmlPath = htmlFiles[0];
  }

  if (!mainHtmlPath) {
    throw new Error('No HTML file found in ZIP archive');
  }

  // Read the HTML content
  const htmlContent = await zip.files[mainHtmlPath].async('string');

  // Parse the HTML first
  const parsed = await parseHtmlContent(htmlContent, { sourceFileName: fileName });

  // Extract and process assets from the ZIP
  const assetsFromZip = await extractAssetsFromZip(zip, mainHtmlPath);

  // Merge assets - prefer ZIP assets over URL-referenced ones
  const mergedAssets = mergeAssets(parsed.assets, assetsFromZip);

  return {
    ...parsed,
    assets: mergedAssets,
  };
}

/**
 * Extract assets from a ZIP file
 */
async function extractAssetsFromZip(
  zip: JSZip,
  mainHtmlPath: string
): Promise<Asset[]> {
  const assets: Asset[] = [];
  const basePath = mainHtmlPath.includes('/')
    ? mainHtmlPath.substring(0, mainHtmlPath.lastIndexOf('/') + 1)
    : '';

  for (const [path, file] of Object.entries(zip.files)) {
    // Skip directories and the main HTML file
    if (file.dir || path === mainHtmlPath) continue;

    // Determine asset type
    const type = getAssetType(path);
    if (type === 'unknown') continue;

    // Read file content as base64
    const content = await file.async('base64');

    assets.push({
      id: uuidv4(),
      type: type as Asset['type'],
      originalUrl: path.startsWith(basePath) ? path.substring(basePath.length) : path,
      localPath: path,
      base64Data: content,
      fileName: path.split('/').pop() || path,
      mimeType: getMimeType(path),
      size: content.length,
    });
  }

  return assets;
}

/**
 * Determine asset type from file path
 */
function getAssetType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';

  const typeMap: Record<string, string> = {
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    svg: 'image',
    webp: 'image',
    ico: 'image',
    css: 'css',
    js: 'js',
    woff: 'font',
    woff2: 'font',
    ttf: 'font',
    eot: 'font',
    otf: 'font',
    mp4: 'video',
    webm: 'video',
    mp3: 'other',
    json: 'other',
  };

  return typeMap[ext] || 'unknown';
}

/**
 * Get MIME type from file path
 */
function getMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';

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
    json: 'application/json',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    eot: 'application/vnd.ms-fontobject',
    otf: 'font/otf',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Merge assets from HTML parsing and ZIP extraction
 */
function mergeAssets(htmlAssets: Asset[], zipAssets: Asset[]): Asset[] {
  const merged = new Map<string, Asset>();

  // Add ZIP assets first (they have actual content)
  for (const asset of zipAssets) {
    merged.set(asset.fileName, asset);
  }

  // Add HTML assets if not already present
  for (const asset of htmlAssets) {
    if (!merged.has(asset.fileName)) {
      merged.set(asset.fileName, asset);
    }
  }

  return Array.from(merged.values());
}

/**
 * Parse multiple files (batch processing)
 */
export async function parseMultipleFiles(
  files: Array<{ name: string; content: string | ArrayBuffer; type: string }>
): Promise<ParsedLandingPage[]> {
  const results: ParsedLandingPage[] = [];

  for (const file of files) {
    if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
      const parsed = await parseZipFile(file.content as ArrayBuffer, file.name);
      results.push(parsed);
    } else if (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
      const parsed = await parseHtmlFile(file.content as string, file.name);
      results.push(parsed);
    }
  }

  return results;
}
