import * as cheerio from 'cheerio';
import type { GenerationOptions, ChangeLog } from '@/types';
import type { LLMProvider } from '@/lib/llm';

// Common color properties to modify
const COLOR_PROPERTIES = [
  'color',
  'background-color',
  'background',
  'border-color',
  'border',
  'box-shadow',
  'text-shadow',
];

// Common layout properties
const LAYOUT_PROPERTIES = [
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'padding',
  'margin',
  'border-radius',
  'gap',
];

/**
 * Modify styles based on the style handling option
 */
export async function modifyStyles(
  $: cheerio.CheerioAPI,
  options: GenerationOptions,
  llm: LLMProvider
): Promise<ChangeLog[]> {
  const changes: ChangeLog[] = [];

  if (options.styleHandling === 'keep') {
    return changes;
  }

  // Extract current styles from the page
  const currentStyles = extractStyleInfo($);

  // Generate new style recommendations from AI
  const styleChanges = await generateStyleChanges(currentStyles, options, llm);

  // Apply the style changes
  if (styleChanges) {
    const appliedChanges = applyStyleChanges($, styleChanges, options);
    changes.push(...appliedChanges);
  }

  return changes;
}

/**
 * Extract style information from the page
 */
function extractStyleInfo($: cheerio.CheerioAPI): StyleInfo {
  const info: StyleInfo = {
    colors: new Set<string>(),
    fonts: new Set<string>(),
    hasInlineStyles: false,
    hasStyleTags: false,
  };

  // Check for style tags
  $('style').each((_, el) => {
    info.hasStyleTags = true;
    const css = $(el).html() || '';

    // Extract colors (hex, rgb, hsl)
    const colorMatches = css.match(/#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)/g);
    if (colorMatches) {
      colorMatches.forEach(c => info.colors.add(c));
    }

    // Extract font families
    const fontMatches = css.match(/font-family:\s*([^;]+)/g);
    if (fontMatches) {
      fontMatches.forEach(f => info.fonts.add(f.replace('font-family:', '').trim()));
    }
  });

  // Check for inline styles
  $('[style]').each((_, el) => {
    info.hasInlineStyles = true;
    const style = $(el).attr('style') || '';

    const colorMatches = style.match(/#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)/g);
    if (colorMatches) {
      colorMatches.forEach(c => info.colors.add(c));
    }
  });

  return info;
}

interface StyleInfo {
  colors: Set<string>;
  fonts: Set<string>;
  hasInlineStyles: boolean;
  hasStyleTags: boolean;
}

interface StyleChanges {
  colorMap?: Record<string, string>;
  fontMap?: Record<string, string>;
  cssInjection?: string;
}

/**
 * Generate style changes using AI
 */
async function generateStyleChanges(
  currentStyles: StyleInfo,
  options: GenerationOptions,
  llm: LLMProvider
): Promise<StyleChanges | null> {
  const colors = Array.from(currentStyles.colors).slice(0, 10);
  const fonts = Array.from(currentStyles.fonts).slice(0, 5);

  let prompt = '';

  if (options.styleHandling === 'modify-colors') {
    prompt = `You are a web designer. Given these colors from a landing page: ${JSON.stringify(colors)}

Generate a new harmonious color palette that:
- Maintains the same number of colors
- Keeps similar contrast ratios
- Creates a fresh, modern look

Return ONLY a JSON object mapping old colors to new colors:
{"#oldcolor1": "#newcolor1", "#oldcolor2": "#newcolor2"}`;
  } else if (options.styleHandling === 'modify-layout') {
    prompt = `You are a web designer. Suggest CSS modifications to modernize a landing page layout.

Current fonts: ${JSON.stringify(fonts)}
Current colors: ${JSON.stringify(colors.slice(0, 5))}

Return ONLY a JSON object with:
{
  "fontMap": {"old-font": "new-font, fallback"},
  "cssInjection": "* { box-sizing: border-box; } body { line-height: 1.6; }"
}

Keep it minimal - only essential layout improvements.`;
  } else if (options.styleHandling === 'restyle-complete') {
    prompt = `You are a web designer. Create a complete style refresh for a landing page.

Current colors: ${JSON.stringify(colors)}
Current fonts: ${JSON.stringify(fonts)}

Return ONLY a JSON object with:
{
  "colorMap": {"#old": "#new"},
  "fontMap": {"old-font": "new-font"},
  "cssInjection": "CSS rules to inject for modern styling"
}

Make it modern, clean, and professional. Use a cohesive color scheme.`;
  }

  try {
    const response = await llm.generateText(prompt, {
      temperature: options.creativity || 0.7,
      maxTokens: 1500,
      systemPrompt: 'You are a web designer. Return only valid JSON, no explanation.',
    });

    // Parse the JSON response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON in style response');
      return null;
    }

    return JSON.parse(jsonMatch[0]) as StyleChanges;
  } catch (error) {
    console.error('Style generation failed:', error);
    return null;
  }
}

/**
 * Apply style changes to the HTML
 */
function applyStyleChanges(
  $: cheerio.CheerioAPI,
  styleChanges: StyleChanges,
  options: GenerationOptions
): ChangeLog[] {
  const changes: ChangeLog[] = [];

  // Apply color replacements
  if (styleChanges.colorMap) {
    // Replace in style tags
    $('style').each((_, el) => {
      const $style = $(el);
      let css = $style.html() || '';
      let modified = false;

      for (const [oldColor, newColor] of Object.entries(styleChanges.colorMap!)) {
        const regex = new RegExp(escapeRegex(oldColor), 'gi');
        if (regex.test(css)) {
          css = css.replace(regex, newColor);
          modified = true;
        }
      }

      if (modified) {
        $style.html(css);
        changes.push({
          type: 'style',
          selector: 'style',
          originalValue: 'color palette',
          newValue: 'new color palette',
          reason: 'Colors modified',
        });
      }
    });

    // Replace in inline styles
    $('[style]').each((_, el) => {
      const $el = $(el);
      let style = $el.attr('style') || '';
      let modified = false;

      for (const [oldColor, newColor] of Object.entries(styleChanges.colorMap!)) {
        const regex = new RegExp(escapeRegex(oldColor), 'gi');
        if (regex.test(style)) {
          style = style.replace(regex, newColor);
          modified = true;
        }
      }

      if (modified) {
        $el.attr('style', style);
      }
    });
  }

  // Apply font replacements
  if (styleChanges.fontMap) {
    $('style').each((_, el) => {
      const $style = $(el);
      let css = $style.html() || '';
      let modified = false;

      for (const [oldFont, newFont] of Object.entries(styleChanges.fontMap!)) {
        const regex = new RegExp(escapeRegex(oldFont), 'gi');
        if (regex.test(css)) {
          css = css.replace(regex, newFont);
          modified = true;
        }
      }

      if (modified) {
        $style.html(css);
        changes.push({
          type: 'style',
          selector: 'style',
          originalValue: 'font family',
          newValue: 'new font family',
          reason: 'Fonts modified',
        });
      }
    });
  }

  // Inject additional CSS
  if (styleChanges.cssInjection) {
    $('head').append(`<style id="ai-style-injection">
/* AI Generated Styles */
${styleChanges.cssInjection}
</style>`);

    changes.push({
      type: 'style',
      selector: 'head',
      originalValue: '',
      newValue: 'CSS injection',
      reason: 'Additional styles injected',
    });
  }

  return changes;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
