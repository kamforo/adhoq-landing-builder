import { NextRequest, NextResponse } from 'next/server';
import { generateVariations } from '@/lib/generator';
import type { ParsedLandingPage, GenerationOptions, DEFAULT_GENERATION_OPTIONS } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourcePage, options } = body as {
      sourcePage: ParsedLandingPage;
      options: Partial<GenerationOptions>;
    };

    if (!sourcePage) {
      return NextResponse.json(
        { error: 'Source page data is required' },
        { status: 400 }
      );
    }

    // Merge with default options
    const fullOptions: GenerationOptions = {
      textHandling: options.textHandling || 'keep',
      imageHandling: options.imageHandling || 'keep',
      linkHandling: options.linkHandling || 'keep',
      variationCount: options.variationCount || 1,
      variationStyle: options.variationStyle || 'moderate',
      linkReplacements: options.linkReplacements || [],
      removeTrackingCodes: options.removeTrackingCodes || false,
      trackingCodeReplacements: options.trackingCodeReplacements || [],
      outputFormat: options.outputFormat || 'zip',
      llmProvider: options.llmProvider || 'grok',
      creativity: options.creativity || 0.7,
      textInstructions: options.textInstructions,
      preserveKeywords: options.preserveKeywords,
      outputDirectory: options.outputDirectory,
    };

    // Validate variation count
    if (fullOptions.variationCount < 1 || fullOptions.variationCount > 10) {
      return NextResponse.json(
        { error: 'Variation count must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Log the options for debugging
    console.log('Generation options:', {
      textHandling: fullOptions.textHandling,
      variationCount: fullOptions.variationCount,
      creativity: fullOptions.creativity,
    });

    // Generate variations
    const results = await generateVariations(sourcePage, fullOptions);

    return NextResponse.json({
      success: true,
      variations: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate variations' },
      { status: 500 }
    );
  }
}
