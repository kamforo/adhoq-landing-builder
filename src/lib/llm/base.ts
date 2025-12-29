import type {
  LLMOptions,
  LLMResponse,
  AnalysisTask,
  AnalysisResult,
  TextRewriteRequest,
  TextRewriteResult,
  VariationRequest,
  VariationResult,
} from '@/types';

/**
 * Base interface for all LLM providers.
 * Implement this interface to add support for new AI providers.
 */
export interface LLMProvider {
  readonly name: string;
  readonly isConfigured: boolean;

  /**
   * Generate text completion from a prompt
   */
  generateText(prompt: string, options?: LLMOptions): Promise<LLMResponse>;

  /**
   * Analyze landing page content for specific tasks
   */
  analyzeContent(content: string, task: AnalysisTask): Promise<AnalysisResult>;

  /**
   * Rewrite text based on style and instructions
   */
  rewriteText(request: TextRewriteRequest): Promise<TextRewriteResult>;

  /**
   * Generate landing page variation
   */
  generateVariation(request: VariationRequest): Promise<VariationResult>;
}

/**
 * Base class with shared functionality for LLM providers
 */
export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly name: string;
  abstract readonly isConfigured: boolean;

  abstract generateText(prompt: string, options?: LLMOptions): Promise<LLMResponse>;

  async analyzeContent(content: string, task: AnalysisTask): Promise<AnalysisResult> {
    const prompts: Record<AnalysisTask, string> = {
      'detect-links': `Analyze the following HTML content and identify all links. Categorize each link as:
- affiliate: Contains tracking parameters like ?ref=, ?aff=, ?aid=, utm_ parameters, or goes to known affiliate networks
- tracking: Used for analytics or tracking purposes
- redirect: Goes through a redirect service
- cta: Call-to-action buttons or prominent links
- navigation: Site navigation links
- external: Links to external sites
- internal: Links within the same site

Return JSON in this format:
{
  "links": [
    {"url": "...", "type": "...", "confidence": 0.0-1.0, "reason": "..."}
  ]
}

HTML Content:
${content}`,

      'detect-tracking': `Analyze the following HTML content and identify all tracking codes and pixels. Look for:
- Facebook Pixel
- Google Analytics (GA4 or Universal Analytics)
- Google Tag Manager
- TikTok Pixel
- Custom tracking scripts
- Other third-party analytics

Return JSON in this format:
{
  "trackingCodes": [
    {"type": "...", "code": "...", "location": "head|body"}
  ]
}

HTML Content:
${content}`,

      'categorize-content': `Analyze the following HTML content and categorize the text elements. Identify:
- Headlines (h1, h2, h3)
- Paragraphs
- Call-to-action text
- List items
- Button text
- Form labels

Return JSON in this format:
{
  "elements": [
    {"text": "...", "type": "...", "importance": "high|medium|low"}
  ]
}

HTML Content:
${content}`,

      'extract-structure': `Analyze the following HTML content and extract the page structure:
- Main sections
- Header/Footer
- Navigation
- Content blocks
- Forms
- Media containers

Return JSON describing the structure.

HTML Content:
${content}`,

      'identify-cta': `Identify all Call-to-Action elements in this HTML:
- Buttons
- Links styled as buttons
- Forms with submit buttons
- Prominent action links

Return JSON in this format:
{
  "ctas": [
    {"text": "...", "selector": "...", "action": "..."}
  ]
}

HTML Content:
${content}`,
    };

    const response = await this.generateText(prompts[task], {
      temperature: 0.3,
      systemPrompt: 'You are an expert web developer analyzing HTML content. Always respond with valid JSON.',
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      const results = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      return {
        task,
        results,
        confidence: 0.8,
      };
    } catch {
      return {
        task,
        results: {},
        confidence: 0,
      };
    }
  }

  async rewriteText(request: TextRewriteRequest): Promise<TextRewriteResult> {
    const styleInstructions = {
      'keep-meaning': 'Keep the exact same meaning but slightly rephrase for uniqueness.',
      'rewrite-slightly': 'Rewrite with similar meaning but different wording. Keep the same tone and length.',
      'rewrite-completely': 'Completely rewrite the text with the same intent but entirely different wording.',
    };

    const prompt = `Rewrite the following text according to these instructions:
${styleInstructions[request.style]}

${request.instructions ? `Additional instructions: ${request.instructions}` : ''}
${request.preserveKeywords?.length ? `Preserve these keywords exactly: ${request.preserveKeywords.join(', ')}` : ''}

Context (surrounding HTML):
${request.context.substring(0, 500)}

Text to rewrite:
"${request.originalText}"

Return JSON in this format:
{
  "rewrittenText": "...",
  "changes": ["list of changes made"]
}`;

    const response = await this.generateText(prompt, {
      temperature: request.style === 'rewrite-completely' ? 0.8 : 0.5,
      systemPrompt: 'You are a professional copywriter. Rewrite text while maintaining its persuasive intent. Always respond with valid JSON.',
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { rewrittenText: request.originalText, changes: [] };
      return result;
    } catch {
      return {
        rewrittenText: request.originalText,
        changes: ['Failed to parse response'],
      };
    }
  }

  async generateVariation(request: VariationRequest): Promise<VariationResult> {
    const styleInstructions = {
      subtle: 'Make subtle changes: slightly rephrase headlines and descriptions. Keep the same structure.',
      moderate: 'Make moderate changes: rewrite text, adjust emphasis, maybe reorder some elements.',
      significant: 'Make significant changes: substantially rewrite all text, change the tone, restructure sections.',
    };

    const focusAreas = request.focusAreas?.length
      ? `Focus on: ${request.focusAreas.join(', ')}`
      : 'Consider all aspects of the page.';

    const prompt = `Create a variation of this landing page HTML.

${styleInstructions[request.style]}
${focusAreas}
${request.instructions ? `Additional instructions: ${request.instructions}` : ''}

IMPORTANT:
- Return the complete modified HTML
- Keep all structural elements intact
- Preserve all links and forms
- Maintain the same CSS classes and IDs
- Only change text content as instructed

Original HTML:
${request.html}

Return JSON in this format:
{
  "html": "complete modified HTML",
  "changes": [
    {"type": "headline|cta|description|other", "original": "...", "modified": "...", "reason": "..."}
  ]
}`;

    const response = await this.generateText(prompt, {
      temperature: request.style === 'significant' ? 0.9 : 0.6,
      maxTokens: 8000,
      systemPrompt: 'You are an expert landing page designer and copywriter. Create compelling variations while maintaining the page functionality. Always respond with valid JSON.',
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { html: request.html, changes: [] };
      return result;
    } catch {
      return {
        html: request.html,
        changes: [{ type: 'error', original: '', modified: '', reason: 'Failed to parse response' }],
      };
    }
  }
}
