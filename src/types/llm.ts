// Types for LLM abstraction layer

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export type AnalysisTask =
  | 'detect-links'
  | 'detect-tracking'
  | 'categorize-content'
  | 'extract-structure'
  | 'identify-cta';

export interface AnalysisResult {
  task: AnalysisTask;
  results: Record<string, unknown>;
  confidence: number;
}

export interface TextRewriteRequest {
  originalText: string;
  context: string; // surrounding HTML context
  style: 'keep-meaning' | 'rewrite-slightly' | 'rewrite-completely';
  instructions?: string;
  preserveKeywords?: string[];
}

export interface TextRewriteResult {
  rewrittenText: string;
  changes: string[];
}

export interface VariationRequest {
  html: string;
  style: 'subtle' | 'moderate' | 'significant';
  instructions?: string;
  focusAreas?: ('headlines' | 'cta' | 'descriptions' | 'layout')[];
}

export interface VariationResult {
  html: string;
  changes: VariationChange[];
}

export interface VariationChange {
  type: string;
  original: string;
  modified: string;
  reason: string;
}

// Provider configuration
export interface LLMProviderConfig {
  name: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export const LLM_PROVIDERS = ['grok', 'openai', 'claude', 'gemini'] as const;
export type LLMProviderName = (typeof LLM_PROVIDERS)[number];
