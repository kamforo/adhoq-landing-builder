import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { getLLMProvider } from '@/lib/llm';
import type {
  ParsedLandingPage,
  GenerationOptions,
  GenerationResult,
  ChangeLog,
  LLMProviderName,
} from '@/types';
import { modifyTextBatch } from './text-modifier';
import { processLinks } from './link-processor';
import { processTrackingCodes } from './tracking-processor';
import { modifyStyles } from './style-modifier';

/**
 * Generate variations of a landing page
 */
export async function generateVariations(
  sourcePage: ParsedLandingPage,
  options: GenerationOptions
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = [];
  const llm = getLLMProvider(options.llmProvider as LLMProviderName);

  for (let i = 0; i < options.variationCount; i++) {
    const result = await generateSingleVariation(sourcePage, options, i + 1, llm);
    results.push(result);
  }

  return results;
}

/**
 * Generate a single variation of the landing page
 * Optimized: Only makes AI calls when text rewriting is requested
 */
async function generateSingleVariation(
  sourcePage: ParsedLandingPage,
  options: GenerationOptions,
  variationNumber: number,
  llm: ReturnType<typeof getLLMProvider>
): Promise<GenerationResult> {
  const $ = cheerio.load(sourcePage.html);
  const changes: ChangeLog[] = [];

  // 1. Process links based on handling option (fast, no AI)
  if (options.linkHandling !== 'keep') {
    const linkChanges = processLinks($, sourcePage.links, options);
    changes.push(...linkChanges);
  }

  // 2. Process tracking codes (fast, no AI)
  if (options.removeTrackingCodes || options.trackingCodeReplacements.length > 0) {
    const trackingChanges = processTrackingCodes(
      $,
      sourcePage.trackingCodes,
      options
    );
    changes.push(...trackingChanges);
  }

  // 3. Process images if needed (fast, no AI)
  if (options.imageHandling === 'placeholder') {
    const imageChanges = processImagesAsPlaceholders($, sourcePage.assets);
    changes.push(...imageChanges);
  }

  // 4. Only call AI if text rewriting is explicitly requested
  if (options.textHandling !== 'keep') {
    // Use batch rewriting for efficiency (single API call)
    const textChanges = await modifyTextBatch($, sourcePage.textContent, options, llm);
    changes.push(...textChanges);
  }

  // 5. Modify styles if requested
  if (options.styleHandling && options.styleHandling !== 'keep') {
    const styleChanges = await modifyStyles($, options, llm);
    changes.push(...styleChanges);
  }

  // Get the final HTML
  const finalHtml = $.html();

  return {
    id: uuidv4(),
    sourcePageId: sourcePage.id,
    variationNumber,
    html: finalHtml,
    assets: sourcePage.assets.map((asset) => ({
      originalPath: asset.originalUrl,
      newPath: asset.localPath || asset.originalUrl,
      isModified: false,
    })),
    changes,
    generatedAt: new Date(),
  };
}

/**
 * Replace images with placeholders
 */
function processImagesAsPlaceholders(
  $: cheerio.CheerioAPI,
  assets: ParsedLandingPage['assets']
): ChangeLog[] {
  const changes: ChangeLog[] = [];

  $('img').each((_, el) => {
    const $img = $(el);
    const src = $img.attr('src');
    if (!src || src.startsWith('data:')) return;

    // Get image dimensions if available
    const width = $img.attr('width') || '400';
    const height = $img.attr('height') || '300';

    // Create placeholder URL
    const placeholderUrl = `https://placehold.co/${width}x${height}/EEE/999?text=Image`;

    $img.attr('src', placeholderUrl);
    $img.attr('data-original-src', src);

    changes.push({
      type: 'asset',
      selector: `img[src="${src}"]`,
      originalValue: src,
      newValue: placeholderUrl,
      reason: 'Replaced with placeholder',
    });
  });

  // Also handle background images
  $('[style*="background"]').each((_, el) => {
    const $el = $(el);
    const style = $el.attr('style') || '';
    const urlMatch = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);

    if (urlMatch && urlMatch[1] && !urlMatch[1].startsWith('data:')) {
      const newStyle = style.replace(
        /url\(['"]?[^'")\s]+['"]?\)/g,
        'url("https://placehold.co/600x400/EEE/999?text=Background")'
      );
      $el.attr('style', newStyle);

      changes.push({
        type: 'asset',
        selector: '[style*="background"]',
        originalValue: urlMatch[1],
        newValue: 'placeholder',
        reason: 'Background replaced with placeholder',
      });
    }
  });

  return changes;
}

