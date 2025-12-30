import * as cheerio from 'cheerio';
import type { StyleInfo, ColorInfo, TypographyInfo, LayoutInfo } from '@/types';

/**
 * Extract style information from the page
 */
export function extractStyleInfo($: cheerio.CheerioAPI): StyleInfo {
  return {
    colors: extractColors($),
    typography: extractTypography($),
    layout: extractLayout($),
  };
}

/**
 * Extract color information
 */
function extractColors($: cheerio.CheerioAPI): ColorInfo {
  const colors: ColorInfo = {
    primary: [],
    secondary: [],
    background: [],
    text: [],
    cta: [],
  };

  const allColors = new Map<string, number>(); // color -> count

  // Extract from style tags
  $('style').each((_, el) => {
    const css = $(el).html() || '';
    extractColorsFromCSS(css, allColors);
  });

  // Extract from inline styles
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || '';
    extractColorsFromCSS(style, allColors);
  });

  // Categorize colors
  const sortedColors = [...allColors.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);

  // Try to categorize by context
  $('[class*="btn"], [class*="cta"], button, a.button').each((_, el) => {
    const style = $(el).attr('style') || '';
    const bgMatch = style.match(/background(?:-color)?:\s*([^;]+)/i);
    if (bgMatch) {
      const color = normalizeColor(bgMatch[1].trim());
      if (color && !colors.cta.includes(color)) {
        colors.cta.push(color);
      }
    }
  });

  // Distribute remaining colors
  for (const color of sortedColors.slice(0, 15)) {
    const normalized = normalizeColor(color);
    if (!normalized) continue;

    // Skip if already categorized
    if (colors.cta.includes(normalized)) continue;

    // Categorize by color characteristics
    if (isBackgroundColor(normalized)) {
      if (colors.background.length < 3) colors.background.push(normalized);
    } else if (isTextColor(normalized)) {
      if (colors.text.length < 3) colors.text.push(normalized);
    } else if (colors.primary.length < 3) {
      colors.primary.push(normalized);
    } else if (colors.secondary.length < 3) {
      colors.secondary.push(normalized);
    }
  }

  return colors;
}

/**
 * Extract colors from CSS string
 */
function extractColorsFromCSS(css: string, colorMap: Map<string, number>): void {
  // Hex colors
  const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
  let match;
  while ((match = hexPattern.exec(css)) !== null) {
    const color = match[0].toLowerCase();
    colorMap.set(color, (colorMap.get(color) || 0) + 1);
  }

  // RGB/RGBA colors
  const rgbPattern = /rgba?\([^)]+\)/gi;
  while ((match = rgbPattern.exec(css)) !== null) {
    const color = match[0].toLowerCase();
    colorMap.set(color, (colorMap.get(color) || 0) + 1);
  }

  // HSL colors
  const hslPattern = /hsla?\([^)]+\)/gi;
  while ((match = hslPattern.exec(css)) !== null) {
    const color = match[0].toLowerCase();
    colorMap.set(color, (colorMap.get(color) || 0) + 1);
  }
}

/**
 * Normalize color to consistent format
 */
function normalizeColor(color: string): string | null {
  color = color.trim().toLowerCase();

  // Skip common non-colors
  if (['transparent', 'inherit', 'initial', 'currentcolor', 'none'].includes(color)) {
    return null;
  }

  // Already hex
  if (color.startsWith('#')) {
    return color;
  }

  // RGB to hex
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  return color;
}

/**
 * Check if color is likely a background color
 */
function isBackgroundColor(color: string): boolean {
  // Light colors are typically backgrounds
  const rgb = hexToRgb(color);
  if (!rgb) return false;

  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 200; // Light color
}

/**
 * Check if color is likely a text color
 */
function isTextColor(color: string): boolean {
  const rgb = hexToRgb(color);
  if (!rgb) return false;

  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness < 100; // Dark color
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    // Try 3-char hex
    const short = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
    if (short) {
      return {
        r: parseInt(short[1] + short[1], 16),
        g: parseInt(short[2] + short[2], 16),
        b: parseInt(short[3] + short[3], 16),
      };
    }
    return null;
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Extract typography information
 */
function extractTypography($: cheerio.CheerioAPI): TypographyInfo {
  const headingFonts = new Set<string>();
  const bodyFonts = new Set<string>();
  const fontSizes = new Set<string>();

  // From style tags
  $('style').each((_, el) => {
    const css = $(el).html() || '';

    // Extract font-family
    const fontFamilyPattern = /font-family:\s*([^;]+)/gi;
    let match;
    while ((match = fontFamilyPattern.exec(css)) !== null) {
      const font = match[1].trim().replace(/['"]/g, '').split(',')[0].trim();
      if (font) bodyFonts.add(font);
    }

    // Extract font-size
    const fontSizePattern = /font-size:\s*([^;]+)/gi;
    while ((match = fontSizePattern.exec(css)) !== null) {
      fontSizes.add(match[1].trim());
    }
  });

  // Check heading fonts specifically
  $('h1, h2, h3').each((_, el) => {
    const style = $(el).attr('style') || '';
    const fontMatch = style.match(/font-family:\s*([^;]+)/i);
    if (fontMatch) {
      const font = fontMatch[1].trim().replace(/['"]/g, '').split(',')[0].trim();
      if (font) headingFonts.add(font);
    }
  });

  // Check body fonts
  $('body, p').each((_, el) => {
    const style = $(el).attr('style') || '';
    const fontMatch = style.match(/font-family:\s*([^;]+)/i);
    if (fontMatch) {
      const font = fontMatch[1].trim().replace(/['"]/g, '').split(',')[0].trim();
      if (font) bodyFonts.add(font);
    }
  });

  return {
    headingFonts: [...headingFonts].slice(0, 3),
    bodyFonts: [...bodyFonts].slice(0, 3),
    fontSizes: [...fontSizes].slice(0, 10),
  };
}

/**
 * Extract layout information
 */
function extractLayout($: cheerio.CheerioAPI): LayoutInfo {
  let hasFixedHeader = false;
  let hasStickyElements = false;
  let maxWidth: string | undefined;
  let columnLayout: LayoutInfo['columnLayout'] = 'single';

  // Check for fixed/sticky elements
  $('[style*="position"]').each((_, el) => {
    const style = $(el).attr('style') || '';
    if (/position:\s*fixed/i.test(style)) {
      if ($(el).is('header, nav, [class*="header"], [class*="nav"]')) {
        hasFixedHeader = true;
      }
    }
    if (/position:\s*sticky/i.test(style)) {
      hasStickyElements = true;
    }
  });

  // Check classes for fixed/sticky
  $('[class*="fixed"], [class*="sticky"]').each((_, el) => {
    if ($(el).is('header, nav, [class*="header"], [class*="nav"]')) {
      hasFixedHeader = true;
    } else {
      hasStickyElements = true;
    }
  });

  // Try to detect max-width
  $('[class*="container"], [class*="wrapper"], main').each((_, el) => {
    const style = $(el).attr('style') || '';
    const maxWidthMatch = style.match(/max-width:\s*([^;]+)/i);
    if (maxWidthMatch) {
      maxWidth = maxWidthMatch[1].trim();
    }
  });

  // Detect column layout
  const hasGrid = $('[class*="grid"], [style*="grid"]').length > 0;
  const hasFlexRow = $('[class*="flex"], [style*="flex"]').length > 0;
  const hasCols = $('[class*="col-"], [class*="column"]').length > 0;

  if (hasGrid || hasCols) {
    // Check if it's 2-column or multi-column
    if ($('[class*="col-6"], [class*="col-md-6"], [class*="w-1/2"]').length > 0) {
      columnLayout = 'two-column';
    } else if ($('[class*="col-"], [class*="grid-cols"]').length > 2) {
      columnLayout = 'multi-column';
    } else {
      columnLayout = 'mixed';
    }
  } else if (hasFlexRow) {
    columnLayout = 'mixed';
  }

  return {
    maxWidth,
    hasFixedHeader,
    hasStickyElements,
    columnLayout,
  };
}
