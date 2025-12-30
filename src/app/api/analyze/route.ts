import { NextRequest, NextResponse } from 'next/server';
import { analyzeLandingPage } from '@/lib/analyzer';
import { scrapeLandingPageFromUrl } from '@/lib/parser/url-scraper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, html } = body as { url?: string; html?: string };

    if (!url && !html) {
      return NextResponse.json(
        { error: 'Either URL or HTML content is required' },
        { status: 400 }
      );
    }

    let pageHtml: string;
    let sourceUrl: string | undefined;

    // If URL provided, fetch and parse it first
    if (url) {
      console.log('Analyzing URL:', url);
      const parsed = await scrapeLandingPageFromUrl(url);
      pageHtml = parsed.html;
      sourceUrl = url;
    } else {
      pageHtml = html!;
    }

    // Run the analyzer
    console.log('Running Analyzer Agent...');
    const analysis = await analyzeLandingPage(pageHtml, sourceUrl);

    console.log('Analysis complete:', {
      sections: analysis.sections.length,
      headlines: analysis.components.headlines.length,
      buttons: analysis.components.buttons.length,
      persuasionElements: analysis.persuasionElements.length,
    });

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze page' },
      { status: 500 }
    );
  }
}
