// Types for generation options

export type TextHandling = 'keep' | 'rewrite-slight' | 'rewrite-complete';
export type ImageHandling = 'keep' | 'placeholder' | 'ai-generate';
export type LinkHandling = 'keep' | 'replace-custom' | 'remove-tracking';
export type OutputFormat = 'single-html' | 'full-folder' | 'zip';

export interface GenerationOptions {
  // Content handling
  textHandling: TextHandling;
  imageHandling: ImageHandling;
  linkHandling: LinkHandling;

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
  type: 'text' | 'link' | 'tracking' | 'asset' | 'structure';
  selector: string;
  originalValue: string;
  newValue: string;
  reason: string;
}

// Default options
export const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
  textHandling: 'keep',
  imageHandling: 'keep',
  linkHandling: 'keep',
  variationCount: 1,
  variationStyle: 'moderate',
  linkReplacements: [],
  removeTrackingCodes: false,
  trackingCodeReplacements: [],
  outputFormat: 'zip',
  llmProvider: 'grok',
  creativity: 0.7,
};
