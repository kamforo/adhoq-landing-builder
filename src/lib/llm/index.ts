import type { LLMProvider } from './base';
import { getGrokProvider, GrokProvider } from './grok';
import type { LLMProviderName } from '@/types';

/**
 * Registry of available LLM providers
 */
const providers: Record<string, () => LLMProvider> = {
  grok: getGrokProvider,
  // Future providers can be added here:
  // openai: getOpenAIProvider,
  // claude: getClaudeProvider,
  // gemini: getGeminiProvider,
};

/**
 * Get an LLM provider by name
 */
export function getLLMProvider(name: LLMProviderName = 'grok'): LLMProvider {
  const factory = providers[name];
  if (!factory) {
    throw new Error(`Unknown LLM provider: ${name}. Available providers: ${Object.keys(providers).join(', ')}`);
  }
  return factory();
}

/**
 * Get list of available providers
 */
export function getAvailableProviders(): string[] {
  return Object.keys(providers);
}

/**
 * Check which providers are configured
 */
export function getConfiguredProviders(): string[] {
  return Object.entries(providers)
    .filter(([, factory]) => factory().isConfigured)
    .map(([name]) => name);
}

// Re-export types and classes
export type { LLMProvider } from './base';
export { GrokProvider } from './grok';
