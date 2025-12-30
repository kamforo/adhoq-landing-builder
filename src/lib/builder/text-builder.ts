import * as cheerio from 'cheerio';
import type { PageAnalysis } from '@/types/analyzer';
import type { TextBuildOptions, BuildChange } from '@/types/builder';
import type { LLMProvider } from '@/lib/llm';

/**
 * Apply text modifications using AI
 */
export async function applyTextModifications(
  $: cheerio.CheerioAPI,
  analysis: PageAnalysis,
  options: TextBuildOptions,
  llm: LLMProvider
): Promise<BuildChange[]> {
  const changes: BuildChange[] = [];

  // Collect all text to rewrite
  const textsToRewrite: Array<{
    selector: string;
    text: string;
    type: string;
  }> = [];

  // Headlines
  for (const headline of analysis.components.headlines) {
    if (headline.text.length > 2) {
      textsToRewrite.push({
        selector: headline.selector,
        text: headline.text,
        type: `h${headline.level}`,
      });
    }
  }

  // Subheadlines
  for (const sub of analysis.components.subheadlines.slice(0, 5)) {
    textsToRewrite.push({
      selector: sub.selector,
      text: sub.text,
      type: 'subheadline',
    });
  }

  // Buttons
  for (const btn of analysis.components.buttons) {
    if (btn.text.length > 1 && btn.text.length < 50) {
      textsToRewrite.push({
        selector: btn.selector,
        text: btn.text,
        type: 'button',
      });
    }
  }

  // Short paragraphs (likely important copy)
  for (const para of analysis.components.paragraphs.filter(p => p.wordCount < 50).slice(0, 5)) {
    textsToRewrite.push({
      selector: para.selector,
      text: para.text,
      type: 'paragraph',
    });
  }

  if (textsToRewrite.length === 0) {
    return changes;
  }

  // Build the prompt
  const toneInstruction = options.tone && options.tone !== 'keep'
    ? `Use a ${options.tone} tone.`
    : '';

  const preserveInstruction = options.preserveKeywords?.length
    ? `Keep these keywords unchanged: ${options.preserveKeywords.join(', ')}`
    : '';

  const styleInstruction = options.handling === 'rewrite-slight'
    ? 'Make minimal changes - just rephrase slightly while keeping the same meaning.'
    : 'Rewrite completely with fresh wording but same intent.';

  const prompt = `Rewrite these landing page texts for a variation.
${styleInstruction}
${toneInstruction}
${preserveInstruction}
${options.instructions ? `Special instructions: ${options.instructions}` : ''}

Input texts (JSON):
${JSON.stringify(textsToRewrite.map((t, i) => ({ i, text: t.text.substring(0, 150), type: t.type })))}

Return a JSON array with rewritten texts:
[{"i": 0, "text": "rewritten text"}, ...]

Only return the JSON array, nothing else.`;

  try {
    const response = await llm.generateText(prompt, {
      temperature: options.creativity,
      maxTokens: 2000,
      systemPrompt: 'You are a copywriter. Rewrite landing page text. Return only valid JSON.',
    });

    // Parse the response
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON in text rewrite response');
      return changes;
    }

    const rewrites = JSON.parse(jsonMatch[0]) as Array<{ i: number; text: string }>;

    // Apply the rewrites
    for (const rewrite of rewrites) {
      const original = textsToRewrite[rewrite.i];
      if (!original || !rewrite.text || rewrite.text === original.text) continue;

      const $el = $(original.selector);
      if ($el.length === 0) continue;

      // For buttons and simple elements, replace text directly
      if (original.type === 'button' || original.type.startsWith('h')) {
        const currentHtml = $el.html() || '';
        // Replace the text content while preserving HTML structure
        const escapedOriginal = escapeRegex(original.text);
        const newHtml = currentHtml.replace(new RegExp(escapedOriginal, 'g'), rewrite.text);

        if (newHtml !== currentHtml) {
          $el.html(newHtml);
          changes.push({
            type: 'text',
            description: `Rewrote ${original.type}`,
            selector: original.selector,
            before: original.text.substring(0, 50),
            after: rewrite.text.substring(0, 50),
          });
        }
      } else {
        // For paragraphs, be more careful
        $el.text(rewrite.text);
        changes.push({
          type: 'text',
          description: `Rewrote ${original.type}`,
          selector: original.selector,
          before: original.text.substring(0, 50),
          after: rewrite.text.substring(0, 50),
        });
      }
    }
  } catch (error) {
    console.error('Text rewrite failed:', error);
  }

  return changes;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
