import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { getLLMProvider } from '@/lib/llm';
import type { BuildOptions, BuildResult, BuildChange } from '@/types/builder';
import type { LLMProviderName } from '@/types';
import { applyTextModifications } from './text-builder';
import { applyStyleModifications } from './style-builder';
import { injectElements } from './element-injector';

/**
 * Builder Agent - Builds new landing pages from analysis
 */
export async function buildLandingPage(
  options: BuildOptions
): Promise<BuildResult[]> {
  const results: BuildResult[] = [];
  const llm = getLLMProvider('grok' as LLMProviderName);

  for (let i = 0; i < options.variationCount; i++) {
    const result = await buildSingleVariation(options, llm, i + 1);
    results.push(result);
  }

  return results;
}

/**
 * Build a single variation of the landing page
 */
async function buildSingleVariation(
  options: BuildOptions,
  llm: ReturnType<typeof getLLMProvider>,
  variationNumber: number
): Promise<BuildResult> {
  const $ = cheerio.load(options.sourceAnalysis.html);
  const changes: BuildChange[] = [];
  const addedElements: string[] = [];

  // 1. Filter sections if needed
  if (options.excludeSections && options.excludeSections.length > 0) {
    filterSections($, options, changes);
  }

  // 2. Handle components
  applyComponentOptions($, options.componentOptions, changes);

  // 3. Apply text modifications
  if (options.textOptions.handling !== 'keep') {
    const textChanges = await applyTextModifications(
      $,
      options.sourceAnalysis,
      options.textOptions,
      llm
    );
    changes.push(...textChanges);
  }

  // 4. Apply style modifications
  if (options.styleOptions.colorScheme !== 'keep' || options.styleOptions.fontHandling !== 'keep') {
    const styleChanges = await applyStyleModifications(
      $,
      options.sourceAnalysis,
      options.styleOptions,
      llm
    );
    changes.push(...styleChanges);
  }

  // 5. Inject new elements
  const injectedElements = injectElements($, options.addElements);
  addedElements.push(...injectedElements.map(e => e.type));
  changes.push(...injectedElements.map(e => ({
    type: 'element' as const,
    description: `Added ${e.type}`,
    selector: e.selector,
    after: e.html.substring(0, 100),
  })));

  return {
    id: uuidv4(),
    html: $.html(),
    changes,
    addedElements,
    sourceAnalysisId: options.sourceAnalysis.id,
    builtAt: new Date(),
  };
}

/**
 * Filter out excluded sections
 */
function filterSections(
  $: cheerio.CheerioAPI,
  options: BuildOptions,
  changes: BuildChange[]
): void {
  if (!options.excludeSections) return;

  for (const section of options.sourceAnalysis.sections) {
    if (options.excludeSections.includes(section.id) ||
        options.excludeSections.includes(section.type)) {
      $(section.selector).remove();
      changes.push({
        type: 'structure',
        description: `Removed section: ${section.type}`,
        selector: section.selector,
      });
    }
  }
}

/**
 * Apply component options (show/hide, modify)
 */
function applyComponentOptions(
  $: cheerio.CheerioAPI,
  options: BuildOptions['componentOptions'],
  changes: BuildChange[]
): void {
  // Handle images
  if (options.imageHandling === 'placeholder') {
    $('img').each((_, el) => {
      const $img = $(el);
      const src = $img.attr('src');
      if (src && !src.startsWith('data:')) {
        const width = $img.attr('width') || '400';
        const height = $img.attr('height') || '300';
        $img.attr('src', `https://placehold.co/${width}x${height}/EEE/999?text=Image`);
        $img.attr('data-original-src', src);
      }
    });
    changes.push({
      type: 'component',
      description: 'Replaced images with placeholders',
    });
  } else if (options.imageHandling === 'remove') {
    $('img').remove();
    changes.push({
      type: 'component',
      description: 'Removed all images',
    });
  }

  // Override button text/URL if specified
  if (options.buttonText || options.buttonUrl) {
    $('a.btn, a.button, a[class*="btn"], a[class*="cta"], button').each((_, el) => {
      const $btn = $(el);
      if (options.buttonText) {
        $btn.text(options.buttonText);
      }
      if (options.buttonUrl && $btn.is('a')) {
        $btn.attr('href', options.buttonUrl);
      }
    });
    changes.push({
      type: 'component',
      description: 'Modified button text/URL',
      after: options.buttonText || options.buttonUrl,
    });
  }

  // Remove components if disabled
  if (!options.includeForms) {
    $('form').remove();
    changes.push({ type: 'component', description: 'Removed forms' });
  }

  if (!options.includeVideos) {
    $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').remove();
    changes.push({ type: 'component', description: 'Removed videos' });
  }

  if (!options.includeLists) {
    $('ul:not(nav ul):not(header ul):not(footer ul), ol').remove();
    changes.push({ type: 'component', description: 'Removed lists' });
  }
}

export { applyTextModifications } from './text-builder';
export { applyStyleModifications } from './style-builder';
export { injectElements } from './element-injector';
