import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import type {
  PageAnalysis,
  PageSection,
  ComponentMap,
  PersuasionElement,
  StyleInfo,
  LPFlow,
} from '@/types';
import { detectSections } from './section-detector';
import { extractComponents } from './component-extractor';
import { detectPersuasionElements } from './persuasion-detector';
import { extractStyleInfo } from './style-extractor';
import { detectLPFlow } from './flow-detector';

/**
 * Analyzer Agent - Deep analysis of landing pages
 * Extracts sections, components, persuasion elements, styles, and LP flow
 */
export async function analyzeLandingPage(
  html: string,
  sourceUrl?: string
): Promise<PageAnalysis> {
  const $ = cheerio.load(html);

  // 1. Detect page sections
  const sections = detectSections($);

  // 2. Extract all components
  const components = extractComponents($, sections);

  // 3. Detect persuasion elements
  const persuasionElements = detectPersuasionElements($);

  // 4. Extract style information
  const styleInfo = extractStyleInfo($);

  // 5. Detect LP Flow (funnel structure)
  const lpFlow = detectLPFlow($, sections, components, persuasionElements);

  return {
    id: uuidv4(),
    sourceUrl,
    analyzedAt: new Date(),
    sections,
    components,
    persuasionElements,
    styleInfo,
    lpFlow,
    html,
  };
}

export { detectSections } from './section-detector';
export { extractComponents } from './component-extractor';
export { detectPersuasionElements } from './persuasion-detector';
export { extractStyleInfo } from './style-extractor';
export { detectLPFlow } from './flow-detector';
