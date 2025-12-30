import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import type {
  PageAnalysis,
  PageSection,
  ComponentMap,
  PersuasionElement,
  StyleInfo,
} from '@/types';
import { detectSections } from './section-detector';
import { extractComponents } from './component-extractor';
import { detectPersuasionElements } from './persuasion-detector';
import { extractStyleInfo } from './style-extractor';

/**
 * Analyzer Agent - Deep analysis of landing pages
 * Extracts sections, components, persuasion elements, and styles
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

  return {
    id: uuidv4(),
    sourceUrl,
    analyzedAt: new Date(),
    sections,
    components,
    persuasionElements,
    styleInfo,
    html,
  };
}

export { detectSections } from './section-detector';
export { extractComponents } from './component-extractor';
export { detectPersuasionElements } from './persuasion-detector';
export { extractStyleInfo } from './style-extractor';
