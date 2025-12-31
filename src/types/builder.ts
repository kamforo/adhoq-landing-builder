// Types for the Builder Agent

import type { PageAnalysis, SectionType, PersuasionType } from './analyzer';

/**
 * Options for building a new landing page
 */
export interface BuildOptions {
  // Source analysis to build from
  sourceAnalysis: PageAnalysis;

  // Sections to include (by ID or type)
  includeSections?: string[] | 'all';
  excludeSections?: string[];

  // Component modifications
  componentOptions: ComponentBuildOptions;

  // Elements to add
  addElements: AddElementOptions;

  // Style modifications
  styleOptions: StyleBuildOptions;

  // Text handling
  textOptions: TextBuildOptions;

  // Output options
  variationCount: number;
}

/**
 * Options for component handling
 */
export interface ComponentBuildOptions {
  // Keep or remove specific component types
  includeHeadlines: boolean;
  includeImages: boolean;
  includeForms: boolean;
  includeButtons: boolean;
  includeLists: boolean;
  includeVideos: boolean;

  // Button modifications
  buttonText?: string; // Override all button text
  buttonUrl?: string;  // Override all button URLs

  // Image handling
  imageHandling: 'keep' | 'placeholder' | 'remove';
}

/**
 * Options for adding new elements
 */
export interface AddElementOptions {
  // Global redirect URL for all clickable elements
  // If not provided, will try to detect from existing CTA buttons
  redirectUrl?: string;

  // Countdown timer
  countdown?: {
    enabled: boolean;
    duration: number; // seconds
    position: 'top' | 'bottom' | 'above-cta';
    text?: string; // e.g., "Offer expires in:"
    style?: 'minimal' | 'prominent' | 'urgent';
  };

  // Scarcity indicator
  scarcity?: {
    enabled: boolean;
    type: 'spots' | 'stock' | 'viewers';
    value?: number; // e.g., 5 spots left
    text?: string;  // e.g., "Only 3 spots left in your area"
    position: 'top' | 'above-cta' | 'below-headline';
  };

  // Social proof
  socialProof?: {
    enabled: boolean;
    type: 'counter' | 'notification' | 'reviews';
    count?: number; // e.g., 10,000+ customers
    text?: string;  // e.g., "47 people matched in the last hour"
    position: 'below-headline' | 'above-cta' | 'footer';
  };

  // Trust badges
  trustBadges?: {
    enabled: boolean;
    badges: ('secure' | 'guarantee' | 'verified' | 'payment')[];
    position: 'above-cta' | 'below-cta' | 'footer';
  };

  // Exit intent popup
  exitIntent?: {
    enabled: boolean;
    headline: string;
    text: string;
    buttonText: string;
  };

  // Sticky CTA bar
  stickyCta?: {
    enabled: boolean;
    text: string;
    buttonText: string;
    position: 'top' | 'bottom';
  };
}

/**
 * Options for style modifications
 */
export interface StyleBuildOptions {
  // Color scheme
  colorScheme: 'keep' | 'generate-new' | 'custom';
  customColors?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
    cta?: string;
  };

  // Font handling
  fontHandling: 'keep' | 'modern' | 'custom';
  customFonts?: {
    heading?: string;
    body?: string;
  };

  // Layout adjustments
  layoutAdjustments?: {
    maxWidth?: string;
    addPadding?: boolean;
    centerContent?: boolean;
  };
}

/**
 * Options for text modifications
 */
export interface TextBuildOptions {
  // How to handle text
  handling: 'keep' | 'rewrite-slight' | 'rewrite-complete';

  // Custom instructions for AI
  instructions?: string;

  // Keywords to preserve
  preserveKeywords?: string[];

  // Tone adjustments
  tone?: 'professional' | 'casual' | 'urgent' | 'friendly' | 'keep';

  // AI creativity level
  creativity: number; // 0-1
}

/**
 * Result from the builder
 */
export interface BuildResult {
  id: string;
  html: string;
  changes: BuildChange[];
  addedElements: string[];
  sourceAnalysisId: string;
  builtAt: Date;
}

/**
 * Record of a change made during building
 */
export interface BuildChange {
  type: 'text' | 'style' | 'component' | 'element' | 'structure';
  description: string;
  selector?: string;
  before?: string;
  after?: string;
}

/**
 * Default build options
 */
export const DEFAULT_BUILD_OPTIONS: Omit<BuildOptions, 'sourceAnalysis'> = {
  includeSections: 'all',
  componentOptions: {
    includeHeadlines: true,
    includeImages: true,
    includeForms: true,
    includeButtons: true,
    includeLists: true,
    includeVideos: true,
    imageHandling: 'keep',
  },
  addElements: {},
  styleOptions: {
    colorScheme: 'keep',
    fontHandling: 'keep',
  },
  textOptions: {
    handling: 'keep',
    creativity: 0.7,
  },
  variationCount: 1,
};
