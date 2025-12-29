import * as cheerio from 'cheerio';
import type { TextBlock, GenerationOptions, ChangeLog } from '@/types';
import type { LLMProvider } from '@/lib/llm';

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Efficient batch text modification - single API call for all text
 */
export async function modifyTextBatch(
  $: cheerio.CheerioAPI,
  textBlocks: TextBlock[],
  options: GenerationOptions,
  llm: LLMProvider
): Promise<ChangeLog[]> {
  const changes: ChangeLog[] = [];

  // Filter to only important text blocks (headlines, buttons, short paragraphs)
  const importantBlocks = textBlocks
    .filter((b) => {
      if (b.type === 'heading' || b.type === 'button') return true;
      if (b.type === 'paragraph' && b.originalText.length < 200) return true;
      return false;
    })
    .slice(0, 15); // Limit to 15 blocks max for speed

  if (importantBlocks.length === 0) {
    return changes;
  }

  const styleInstructions = {
    'keep': 'Keep the text exactly as is.',
    'rewrite-slight': 'Slightly rephrase each text while keeping the exact same meaning and length.',
    'rewrite-complete': 'Rewrite each text with the same intent but fresh wording.',
  };

  // Build a compact prompt
  const textsJson = importantBlocks.map((b, i) => ({
    i,
    t: b.originalText.substring(0, 150),
    type: b.type
  }));

  const prompt = `Rewrite these landing page texts. ${styleInstructions[options.textHandling]}
${options.textInstructions ? `Instructions: ${options.textInstructions}` : ''}

Input: ${JSON.stringify(textsJson)}

Return JSON array: [{"i":0,"t":"new text"},...]`;

  try {
    const response = await llm.generateText(prompt, {
      temperature: options.creativity || 0.7,
      maxTokens: 2000,
      systemPrompt: 'Rewrite text concisely. Return only valid JSON array.',
    });

    // Parse response
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array in response');
      return changes;
    }

    const rewrites = JSON.parse(jsonMatch[0]) as Array<{ i: number; t: string }>;

    // Apply changes to HTML
    for (const rewrite of rewrites) {
      const block = importantBlocks[rewrite.i];
      if (!block || !rewrite.t || rewrite.t === block.originalText) continue;

      const $el = $(block.selector);
      if ($el.length === 0) continue;

      // Replace text in element
      const currentHtml = $el.html() || '';
      const escaped = escapeRegex(block.originalText);
      const newHtml = currentHtml.replace(new RegExp(escaped, 'g'), rewrite.t);

      if (newHtml !== currentHtml) {
        $el.html(newHtml);
        changes.push({
          type: 'text',
          selector: block.selector,
          originalValue: block.originalText,
          newValue: rewrite.t,
          reason: `Rewritten (${block.type})`,
        });
      }
    }
  } catch (error) {
    console.error('Text rewrite failed:', error);
  }

  return changes;
}

// Keep the old function for backward compatibility
export async function modifyText(
  $: cheerio.CheerioAPI,
  textBlocks: TextBlock[],
  options: GenerationOptions,
  llm: LLMProvider
): Promise<ChangeLog[]> {
  return modifyTextBatch($, textBlocks, options, llm);
}

export async function batchRewriteText(
  textBlocks: TextBlock[],
  options: GenerationOptions,
  llm: LLMProvider
): Promise<Map<string, string>> {
  // Legacy function - returns a map
  const results = new Map<string, string>();
  return results;
}
