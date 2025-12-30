import * as cheerio from 'cheerio';
import type { PageAnalysis } from '@/types/analyzer';
import type { StyleBuildOptions, BuildChange } from '@/types/builder';
import type { LLMProvider } from '@/lib/llm';

/**
 * Apply style modifications
 */
export async function applyStyleModifications(
  $: cheerio.CheerioAPI,
  analysis: PageAnalysis,
  options: StyleBuildOptions,
  llm: LLMProvider
): Promise<BuildChange[]> {
  const changes: BuildChange[] = [];

  // Handle color scheme
  if (options.colorScheme === 'custom' && options.customColors) {
    applyCustomColors($, analysis.styleInfo.colors, options.customColors, changes);
  } else if (options.colorScheme === 'generate-new') {
    await generateNewColors($, analysis.styleInfo.colors, llm, changes);
  }

  // Handle fonts
  if (options.fontHandling === 'custom' && options.customFonts) {
    applyCustomFonts($, options.customFonts, changes);
  } else if (options.fontHandling === 'modern') {
    applyModernFonts($, changes);
  }

  // Layout adjustments
  if (options.layoutAdjustments) {
    applyLayoutAdjustments($, options.layoutAdjustments, changes);
  }

  return changes;
}

/**
 * Apply custom colors
 */
function applyCustomColors(
  $: cheerio.CheerioAPI,
  currentColors: PageAnalysis['styleInfo']['colors'],
  customColors: NonNullable<StyleBuildOptions['customColors']>,
  changes: BuildChange[]
): void {
  const colorMap: Record<string, string> = {};

  // Map old colors to new ones
  if (customColors.primary && currentColors.primary[0]) {
    colorMap[currentColors.primary[0]] = customColors.primary;
  }
  if (customColors.secondary && currentColors.secondary[0]) {
    colorMap[currentColors.secondary[0]] = customColors.secondary;
  }
  if (customColors.background && currentColors.background[0]) {
    colorMap[currentColors.background[0]] = customColors.background;
  }
  if (customColors.text && currentColors.text[0]) {
    colorMap[currentColors.text[0]] = customColors.text;
  }
  if (customColors.cta && currentColors.cta[0]) {
    colorMap[currentColors.cta[0]] = customColors.cta;
  }

  replaceColors($, colorMap, changes);
}

/**
 * Generate new colors using AI
 */
async function generateNewColors(
  $: cheerio.CheerioAPI,
  currentColors: PageAnalysis['styleInfo']['colors'],
  llm: LLMProvider,
  changes: BuildChange[]
): Promise<void> {
  const allColors = [
    ...currentColors.primary,
    ...currentColors.secondary,
    ...currentColors.cta,
  ].filter(Boolean).slice(0, 8);

  if (allColors.length === 0) return;

  const prompt = `Generate a new harmonious color palette to replace these colors:
${JSON.stringify(allColors)}

Requirements:
- Keep similar contrast ratios
- Create a fresh, modern look
- Maintain similar brightness levels

Return ONLY a JSON object mapping old colors to new:
{"${allColors[0]}": "#newcolor1", ...}`;

  try {
    const response = await llm.generateText(prompt, {
      temperature: 0.8,
      maxTokens: 500,
      systemPrompt: 'You are a color expert. Return only valid JSON.',
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const colorMap = JSON.parse(jsonMatch[0]) as Record<string, string>;
      replaceColors($, colorMap, changes);
    }
  } catch (error) {
    console.error('Color generation failed:', error);
  }
}

/**
 * Replace colors in CSS
 */
function replaceColors(
  $: cheerio.CheerioAPI,
  colorMap: Record<string, string>,
  changes: BuildChange[]
): void {
  if (Object.keys(colorMap).length === 0) return;

  // Replace in style tags
  $('style').each((_, el) => {
    const $style = $(el);
    let css = $style.html() || '';
    let modified = false;

    for (const [oldColor, newColor] of Object.entries(colorMap)) {
      const regex = new RegExp(escapeRegex(oldColor), 'gi');
      if (regex.test(css)) {
        css = css.replace(regex, newColor);
        modified = true;
      }
    }

    if (modified) {
      $style.html(css);
    }
  });

  // Replace in inline styles
  $('[style]').each((_, el) => {
    const $el = $(el);
    let style = $el.attr('style') || '';

    for (const [oldColor, newColor] of Object.entries(colorMap)) {
      const regex = new RegExp(escapeRegex(oldColor), 'gi');
      style = style.replace(regex, newColor);
    }

    $el.attr('style', style);
  });

  changes.push({
    type: 'style',
    description: `Replaced ${Object.keys(colorMap).length} colors`,
  });
}

/**
 * Apply custom fonts
 */
function applyCustomFonts(
  $: cheerio.CheerioAPI,
  fonts: NonNullable<StyleBuildOptions['customFonts']>,
  changes: BuildChange[]
): void {
  // Inject Google Fonts
  const fontFamilies: string[] = [];
  if (fonts.heading) fontFamilies.push(fonts.heading.replace(/\s+/g, '+'));
  if (fonts.body) fontFamilies.push(fonts.body.replace(/\s+/g, '+'));

  if (fontFamilies.length > 0) {
    const fontLink = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fontFamilies.join('&family=')}&display=swap">`;
    $('head').append(fontLink);
  }

  // Apply to styles
  const css = `
    ${fonts.heading ? `h1, h2, h3, h4, h5, h6 { font-family: '${fonts.heading}', sans-serif !important; }` : ''}
    ${fonts.body ? `body, p, span, a, li { font-family: '${fonts.body}', sans-serif !important; }` : ''}
  `;

  $('head').append(`<style id="custom-fonts">${css}</style>`);

  changes.push({
    type: 'style',
    description: 'Applied custom fonts',
    after: fontFamilies.join(', '),
  });
}

/**
 * Apply modern font stack
 */
function applyModernFonts(
  $: cheerio.CheerioAPI,
  changes: BuildChange[]
): void {
  const css = `
    h1, h2, h3, h4, h5, h6 {
      font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }
    body, p, span, a, li {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }
  `;

  $('head').append(`
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
    <style id="modern-fonts">${css}</style>
  `);

  changes.push({
    type: 'style',
    description: 'Applied modern font stack (Inter)',
  });
}

/**
 * Apply layout adjustments
 */
function applyLayoutAdjustments(
  $: cheerio.CheerioAPI,
  adjustments: NonNullable<StyleBuildOptions['layoutAdjustments']>,
  changes: BuildChange[]
): void {
  const cssRules: string[] = [];

  if (adjustments.maxWidth) {
    cssRules.push(`
      .container, main, [class*="container"], [class*="wrapper"] {
        max-width: ${adjustments.maxWidth} !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }
    `);
  }

  if (adjustments.addPadding) {
    cssRules.push(`
      section, [class*="section"] {
        padding: 3rem 1.5rem !important;
      }
    `);
  }

  if (adjustments.centerContent) {
    cssRules.push(`
      h1, h2, h3, .hero, [class*="hero"] {
        text-align: center !important;
      }
    `);
  }

  if (cssRules.length > 0) {
    $('head').append(`<style id="layout-adjustments">${cssRules.join('\n')}</style>`);
    changes.push({
      type: 'style',
      description: 'Applied layout adjustments',
    });
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
