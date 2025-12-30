import { NextRequest, NextResponse } from 'next/server';
import { buildLandingPage } from '@/lib/builder';
import { analyzeLandingPage } from '@/lib/analyzer';
import { scrapeLandingPageFromUrl } from '@/lib/parser/url-scraper';
import type { BuildOptions, DEFAULT_BUILD_OPTIONS } from '@/types/builder';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      url,
      html,
      analysisId,
      analysis: providedAnalysis,
      options,
    } = body as {
      url?: string;
      html?: string;
      analysisId?: string;
      analysis?: BuildOptions['sourceAnalysis'];
      options?: Partial<Omit<BuildOptions, 'sourceAnalysis'>>;
    };

    // Get or create analysis
    let analysis: BuildOptions['sourceAnalysis'];

    if (providedAnalysis) {
      analysis = providedAnalysis;
    } else if (url) {
      console.log('Building from URL:', url);
      const parsed = await scrapeLandingPageFromUrl(url);
      analysis = await analyzeLandingPage(parsed.html, url);
    } else if (html) {
      console.log('Building from HTML');
      analysis = await analyzeLandingPage(html);
    } else {
      return NextResponse.json(
        { error: 'Either URL, HTML, or analysis is required' },
        { status: 400 }
      );
    }

    // Merge options with defaults
    const buildOptions: BuildOptions = {
      sourceAnalysis: analysis,
      includeSections: options?.includeSections || 'all',
      excludeSections: options?.excludeSections,
      componentOptions: {
        includeHeadlines: true,
        includeImages: true,
        includeForms: true,
        includeButtons: true,
        includeLists: true,
        includeVideos: true,
        imageHandling: 'keep',
        ...options?.componentOptions,
      },
      addElements: options?.addElements || {},
      styleOptions: {
        colorScheme: 'keep',
        fontHandling: 'keep',
        ...options?.styleOptions,
      },
      textOptions: {
        handling: 'keep',
        creativity: 0.7,
        ...options?.textOptions,
      },
      variationCount: options?.variationCount || 1,
    };

    console.log('Build options:', {
      textHandling: buildOptions.textOptions.handling,
      addElements: Object.keys(buildOptions.addElements).filter(k =>
        (buildOptions.addElements as Record<string, { enabled?: boolean }>)[k]?.enabled
      ),
      variationCount: buildOptions.variationCount,
    });

    // Build the landing page
    const results = await buildLandingPage(buildOptions);

    console.log('Build complete:', {
      variations: results.length,
      changes: results[0]?.changes.length,
      addedElements: results[0]?.addedElements,
    });

    return NextResponse.json({
      success: true,
      results,
      analysis: {
        id: analysis.id,
        sections: analysis.sections.length,
        components: {
          headlines: analysis.components.headlines.length,
          buttons: analysis.components.buttons.length,
          images: analysis.components.images.length,
        },
      },
    });
  } catch (error) {
    console.error('Build error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to build landing page' },
      { status: 500 }
    );
  }
}
