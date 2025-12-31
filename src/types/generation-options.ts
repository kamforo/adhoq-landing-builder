// Types for generation options

import type { AddElementOptions } from './builder';
import type { LanguageCode, CountryCode } from './languages';

export type TextHandling = 'keep' | 'rewrite-slight' | 'rewrite-complete';
export type ImageHandling = 'keep' | 'placeholder' | 'ai-generate';
export type LinkHandling = 'keep' | 'replace-all' | 'remove-non-cta';
export type StyleHandling = 'keep' | 'modify-colors' | 'modify-layout' | 'restyle-complete' | 'generate-new';
export type OutputFormat = 'single-html' | 'full-folder' | 'zip';
export type DatingVertical = 'auto' | 'adult' | 'casual' | 'mainstream';

// Color scheme options
export type ColorScheme = 'keep' | 'generate-matching' | 'custom';

// Layout style options
export type LayoutStyle = 'keep-structure' | 'mobile-optimized' | 'generate-new';

// Tone options (for copy/messaging style)
export type ToneStyle =
  | 'auto'                    // Auto-detect from source
  | 'playful-flirty'          // Fun, teasing, lighthearted
  | 'urgent-exciting'         // High energy, FOMO, act now
  | 'intimate-seductive'      // Personal, sensual, direct
  | 'friendly-casual'         // Warm, approachable, conversational
  | 'bold-confident'          // Strong, assertive, powerful
  | 'romantic-emotional'      // Heartfelt, connection-focused
  | 'mysterious-intriguing';  // Curiosity-driven, secretive

// Target age group
export type TargetAgeGroup =
  | 'all'     // All ages (18+)
  | '30+'     // 30 and older
  | '40+'     // 40 and older
  | '50+'     // 50 and older
  | '60+';    // 60 and older

// Color customization
export interface CustomColors {
  primary?: string;      // Main brand/accent color
  secondary?: string;    // Secondary accent
  background?: string;   // Page background
  text?: string;         // Main text color
  cta?: string;          // CTA button color
}

export interface GenerationOptions {
  // Content handling
  textHandling: TextHandling;
  imageHandling: ImageHandling;
  linkHandling: LinkHandling;
  styleHandling: StyleHandling;

  // Vertical selection (for dating LPs)
  vertical: DatingVertical;

  // Tone/voice of the copy
  tone: ToneStyle;

  // Target age group
  targetAge: TargetAgeGroup;

  // Language & Country
  language: LanguageCode;
  country?: CountryCode;

  // Color scheme options
  colorScheme: ColorScheme;
  customColors?: CustomColors;

  // Layout options
  layoutStyle: LayoutStyle;

  // Variation settings
  variationCount: number; // 1-10
  variationStyle: 'subtle' | 'moderate' | 'significant';

  // Link replacements (when linkHandling is 'replace-custom')
  linkReplacements: LinkReplacement[];

  // Tracking code settings
  removeTrackingCodes: boolean;
  trackingCodeReplacements: TrackingCodeReplacement[];

  // Text customization
  textInstructions?: string; // Custom instructions for AI text rewriting
  preserveKeywords?: string[]; // Keywords to keep unchanged

  // CTA/Redirect URL override (if not detected or needs to be changed)
  ctaUrlOverride?: string;

  // Number of steps/questions for multi-step landers (default: auto-detect from source)
  stepCount?: number;

  // Add elements to page
  addElements?: AddElementOptions;

  // Output settings
  outputFormat: OutputFormat;
  outputDirectory?: string;

  // AI settings
  llmProvider: string; // 'grok' | 'openai' | 'claude' etc
  creativity: number; // 0-1, temperature for AI generation
}

export interface LinkReplacement {
  originalPattern: string; // regex pattern or exact match
  replacementUrl: string;
  applyToTypes?: string[]; // link types to apply to
}

export interface TrackingCodeReplacement {
  originalType: string;
  replacementCode: string;
}

export interface GenerationResult {
  id: string;
  sourcePageId: string;
  variationNumber: number;
  html: string;
  assets: GeneratedAsset[];
  changes: ChangeLog[];
  generatedAt: Date;
}

export interface GeneratedAsset {
  originalPath: string;
  newPath: string;
  content?: string | Buffer;
  isModified: boolean;
}

export interface ChangeLog {
  type: 'text' | 'link' | 'tracking' | 'asset' | 'structure' | 'style';
  selector: string;
  originalValue: string;
  newValue: string;
  reason: string;
}

// Default options
export const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
  textHandling: 'rewrite-slight',
  imageHandling: 'keep',
  linkHandling: 'replace-all',
  styleHandling: 'generate-new',
  vertical: 'auto',
  tone: 'auto',
  targetAge: 'all',
  language: 'en',
  country: 'US',
  colorScheme: 'generate-matching',
  layoutStyle: 'mobile-optimized',
  variationCount: 1,
  variationStyle: 'moderate',
  linkReplacements: [],
  removeTrackingCodes: false,
  trackingCodeReplacements: [],
  outputFormat: 'zip',
  llmProvider: 'grok',
  creativity: 0.7,
};
