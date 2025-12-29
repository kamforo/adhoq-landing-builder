import OpenAI from 'openai';
import { BaseLLMProvider } from './base';
import type { LLMOptions, LLMResponse } from '@/types';

/**
 * Grok LLM Provider
 * Uses xAI's Grok API which is OpenAI-compatible
 */
export class GrokProvider extends BaseLLMProvider {
  readonly name = 'grok';
  private client: OpenAI | null = null;
  private model = 'grok-3-fast';

  get isConfigured(): boolean {
    return !!process.env.GROK_API_KEY;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.GROK_API_KEY;
      if (!apiKey) {
        throw new Error('GROK_API_KEY environment variable is not set');
      }
      this.client = new OpenAI({
        apiKey,
        baseURL: 'https://api.x.ai/v1',
      });
    }
    return this.client;
  }

  async generateText(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const client = this.getClient();

    const messages: OpenAI.ChatCompletionMessageParam[] = [];

    if (options?.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await client.chat.completions.create({
      model: this.model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
    });

    const choice = response.choices[0];
    const content = choice?.message?.content || '';

    return {
      content,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
      model: response.model,
    };
  }
}

// Singleton instance
let instance: GrokProvider | null = null;

export function getGrokProvider(): GrokProvider {
  if (!instance) {
    instance = new GrokProvider();
  }
  return instance;
}
