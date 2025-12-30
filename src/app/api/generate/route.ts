import { NextRequest, NextResponse } from 'next/server';
import { analyzeLandingPage } from '@/lib/analyzer';
import { buildLandingPage } from '@/lib/builder';
import { generateNewLayout, generateFallbackLayout, detectVertical, type DatingVertical } from '@/lib/builder/layout-generator';
import { getLLMProvider } from '@/lib/llm';
import type { ParsedLandingPage, GenerationOptions } from '@/types';
import type { BuildOptions, TextBuildOptions, StyleBuildOptions } from '@/types/builder';

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

    // Validate variation count
    const variationCount = options.variationCount || 1;
    if (variationCount < 1 || variationCount > 10) {
      return NextResponse.json(
        { error: 'Variation count must be between 1 and 10' },
        { status: 400 }
      );
    }

    console.log('=== Using Analyzer + Builder Agents ===');
    console.log('Options:', {
      textHandling: options.textHandling,
      styleHandling: options.styleHandling,
      vertical: options.vertical,
      variationCount,
      creativity: options.creativity,
      addElements: options.addElements,
    });

    // Step 1: Analyze the page using Analyzer Agent
    console.log('Step 1: Analyzing page...');
    const analysis = await analyzeLandingPage(sourcePage.html, sourcePage.sourceUrl);
    console.log('Analysis complete:', {
      sections: analysis.sections.length,
      headlines: analysis.components.headlines.length,
      buttons: analysis.components.buttons.length,
      persuasionElements: analysis.persuasionElements.length,
    });

    // Apply CTA URL override if provided
    if (options.ctaUrlOverride && options.ctaUrlOverride.trim()) {
      console.log('Applying CTA URL override:', options.ctaUrlOverride);
      analysis.lpFlow.ctaStrategy.primaryCtaUrl = options.ctaUrlOverride.trim();
    }

    // Validate CTA URL exists
    if (!analysis.lpFlow.ctaStrategy.primaryCtaUrl || analysis.lpFlow.ctaStrategy.primaryCtaUrl === '#') {
      console.warn('WARNING: No CTA URL detected or provided!');
    }

    // Check if we need to generate a completely new layout
    if (options.styleHandling === 'generate-new') {
      // Determine vertical (auto-detect or use user selection)
      let vertical: DatingVertical | undefined;
      if (options.vertical && options.vertical !== 'auto') {
        vertical = options.vertical as DatingVertical;
      } else {
        vertical = detectVertical(analysis);
      }
      console.log('Step 2: Generating completely new layout...');
      console.log('Detected/Selected vertical:', vertical);
      console.log('LP Flow type:', analysis.lpFlow.type, 'with', analysis.lpFlow.stages.length, 'stages');
      console.log('CTA URL:', analysis.lpFlow.ctaStrategy.primaryCtaUrl || 'NOT SET!');

      const llm = getLLMProvider('grok');

      const buildOptions: BuildOptions = {
        sourceAnalysis: analysis,
        includeSections: 'all',
        componentOptions: {
          includeHeadlines: true,
          includeImages: true,
          includeForms: true,
          includeButtons: true,
          includeLists: true,
          includeVideos: true,
          imageHandling: options.imageHandling === 'keep' ? 'keep' : 'placeholder',
        },
        addElements: options.addElements || {},
        styleOptions: { colorScheme: 'keep', fontHandling: 'keep' },
        textOptions: {
          handling: 'keep',
          creativity: options.creativity || 0.7,
        },
        variationCount,
      };

      // Generate new layouts
      const variations = [];
      for (let i = 0; i < variationCount; i++) {
        try {
          const html = await generateNewLayout(analysis, buildOptions, llm, vertical);
          variations.push({
            id: `new-layout-${Date.now()}-${i}`,
            sourcePageId: sourcePage.id || 'unknown',
            variationNumber: i + 1,
            html,
            assets: [],
            changes: [{ type: 'structure', selector: 'html', originalValue: '', newValue: '', reason: 'Generated completely new layout' }],
            generatedAt: new Date(),
          });
        } catch (error) {
          console.error('Layout generation failed, using fallback:', error);
          const html = generateFallbackLayout(analysis);
          variations.push({
            id: `fallback-${Date.now()}-${i}`,
            sourcePageId: sourcePage.id || 'unknown',
            variationNumber: i + 1,
            html,
            assets: [],
            changes: [{ type: 'structure', selector: 'html', originalValue: '', newValue: '', reason: 'Generated fallback layout' }],
            generatedAt: new Date(),
          });
        }
      }

      console.log('New layout generation complete:', { variations: variations.length });

      return NextResponse.json({
        success: true,
        variations,
        count: variations.length,
        analysis: {
          id: analysis.id,
          sections: analysis.sections.length,
          components: {
            headlines: analysis.components.headlines.length,
            buttons: analysis.components.buttons.length,
            images: analysis.components.images.length,
          },
          persuasionElements: analysis.persuasionElements.length,
          lpFlow: {
            type: analysis.lpFlow.type,
            stages: analysis.lpFlow.stages.length,
            framework: analysis.lpFlow.framework,
          },
          detectedVertical: vertical,
        },
      });
    }

    // Step 2: Map GenerationOptions to BuildOptions (for non-generate-new modes)
    const textHandling = mapTextHandling(options.textHandling || 'keep');
    const styleOptions = mapStyleHandling(options.styleHandling || 'keep');

    const buildOptions: BuildOptions = {
      sourceAnalysis: analysis,
      includeSections: 'all',
      componentOptions: {
        includeHeadlines: true,
        includeImages: true,
        includeForms: true,
        includeButtons: true,
        includeLists: true,
        includeVideos: true,
        imageHandling: options.imageHandling === 'placeholder' ? 'placeholder' : 'keep',
      },
      addElements: options.addElements || {},
      styleOptions,
      textOptions: {
        handling: textHandling,
        instructions: options.textInstructions,
        preserveKeywords: options.preserveKeywords,
        creativity: options.creativity || 0.7,
      },
      variationCount,
    };

    // Step 3: Build the page using Builder Agent
    console.log('Step 2: Building page with options:', {
      textHandling: buildOptions.textOptions.handling,
      styleOptions: buildOptions.styleOptions,
      addElements: Object.keys(buildOptions.addElements).filter(k =>
        (buildOptions.addElements as Record<string, { enabled?: boolean }>)[k]?.enabled
      ),
    });

    const buildResults = await buildLandingPage(buildOptions);
    console.log('Build complete:', {
      variations: buildResults.length,
      changes: buildResults[0]?.changes.length,
      addedElements: buildResults[0]?.addedElements,
    });

    // Step 4: Convert BuildResult to GenerationResult format for compatibility
    const variations = buildResults.map((result, index) => ({
      id: result.id,
      sourcePageId: sourcePage.id || 'unknown',
      variationNumber: index + 1,
      html: result.html,
      assets: [],
      changes: result.changes.map(c => ({
        type: c.type,
        selector: c.selector || '',
        originalValue: c.before || '',
        newValue: c.after || '',
        reason: c.description,
      })),
      generatedAt: result.builtAt,
    }));

    return NextResponse.json({
      success: true,
      variations,
      count: variations.length,
      analysis: {
        id: analysis.id,
        sections: analysis.sections.length,
        components: {
          headlines: analysis.components.headlines.length,
          buttons: analysis.components.buttons.length,
          images: analysis.components.images.length,
        },
        persuasionElements: analysis.persuasionElements.length,
      },
    });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate variations' },
      { status: 500 }
    );
  }
}

// Map text handling option
function mapTextHandling(handling: string): TextBuildOptions['handling'] {
  switch (handling) {
    case 'rewrite-slight':
      return 'rewrite-slight';
    case 'rewrite-complete':
      return 'rewrite-complete';
    default:
      return 'keep';
  }
}

// Map style handling option
function mapStyleHandling(handling: string): StyleBuildOptions {
  switch (handling) {
    case 'modify-colors':
      return {
        colorScheme: 'generate-new',
        fontHandling: 'keep',
      };
    case 'modify-layout':
      return {
        colorScheme: 'keep',
        fontHandling: 'modern',
        layoutAdjustments: {
          addPadding: true,
          centerContent: true,
        },
      };
    case 'restyle-complete':
      return {
        colorScheme: 'generate-new',
        fontHandling: 'modern',
        layoutAdjustments: {
          maxWidth: '1200px',
          addPadding: true,
          centerContent: true,
        },
      };
    default:
      return {
        colorScheme: 'keep',
        fontHandling: 'keep',
      };
  }
}
