import { NextRequest, NextResponse } from 'next/server';
import { analyzeWithAI } from '@/lib/analyzer/ai-analyzer';
import { writeBuilderPrompt } from '@/lib/prompt-writer';
import { buildVariations } from '@/lib/builder-agent';
import { analyzeLandingPage } from '@/lib/analyzer';
import { buildLandingPage } from '@/lib/builder';
import type { ParsedLandingPage, GenerationOptions } from '@/types';
import type { BuildOptions, TextBuildOptions, StyleBuildOptions } from '@/types/builder';
import type { DatingVertical } from '@/types/component-analysis';

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

    // Check if we should use the new 3-agent workflow
    if (options.styleHandling === 'generate-new') {
      return handleNewAgentWorkflow(sourcePage, options, variationCount);
    }

    // Fall back to old workflow for non-generate-new modes
    return handleLegacyWorkflow(sourcePage, options, variationCount);
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate variations' },
      { status: 500 }
    );
  }
}

/**
 * NEW 3-Agent Workflow:
 * 1. Analyzer (Cheerio + Grok) - Break down components
 * 2. Prompt Writer (Grok) - Write custom prompt
 * 3. Builder (Grok) - Generate HTML
 */
async function handleNewAgentWorkflow(
  sourcePage: ParsedLandingPage,
  options: Partial<GenerationOptions>,
  variationCount: number
) {
  console.log('=== NEW 3-AGENT WORKFLOW ===');
  console.log('Options:', {
    vertical: options.vertical,
    variationCount,
    creativity: options.creativity,
  });

  // ===== STEP 1: AI ANALYZER =====
  console.log('\n📊 Step 1: AI Analyzer (Cheerio + Grok)...');
  const analysis = await analyzeWithAI(sourcePage.html, sourcePage.sourceUrl);

  // Apply tracking URL override if provided
  if (options.ctaUrlOverride && options.ctaUrlOverride.trim()) {
    console.log('Applying tracking URL override:', options.ctaUrlOverride);
    analysis.trackingUrl = options.ctaUrlOverride.trim();
  }

  // Fall back to parsed links if no tracking URL found
  if (!analysis.trackingUrl) {
    console.log('No tracking URL from analyzer, checking parsed links...');
    const bestLink = findBestTrackingLink(sourcePage);
    if (bestLink) {
      console.log('Found tracking link from parser:', bestLink);
      analysis.trackingUrl = bestLink;
    } else {
      console.warn('WARNING: No tracking URL detected anywhere!');
    }
  }

  // Override vertical if user selected one
  if (options.vertical && options.vertical !== 'auto') {
    analysis.vertical = options.vertical as DatingVertical;
  }

  // Override step count if user specified one
  if (options.stepCount && options.stepCount > 0) {
    analysis.flow.totalSteps = options.stepCount;
    console.log('Overriding step count to:', options.stepCount);
  }

  console.log('Analysis complete:', {
    components: analysis.components.length,
    critical: analysis.components.filter(c => c.importance === 'critical').length,
    flow: analysis.flow.type,
    vertical: analysis.vertical,
    tone: analysis.tone,
    trackingUrl: analysis.trackingUrl || 'NOT SET!',
  });

  // ===== STEP 2: PROMPT WRITER =====
  console.log('\n✍️ Step 2: Prompt Writer...');
  const builderPrompt = await writeBuilderPrompt(analysis);
  console.log('Prompt written:', {
    hasSystemContext: !!builderPrompt.systemContext,
    hasRequirements: !!builderPrompt.requirements,
    hasSuggestions: !!builderPrompt.suggestions,
    promptLength: builderPrompt.fullPrompt.length,
  });

  // ===== STEP 3: BUILDER =====
  console.log('\n🔨 Step 3: Builder...');
  const buildResults = await buildVariations(builderPrompt, analysis, variationCount);
  console.log('Build complete:', {
    variations: buildResults.length,
    successful: buildResults.filter(r => r.success).length,
  });

  // Convert to response format
  const variations = buildResults.map((result, index) => ({
    id: result.id,
    sourcePageId: sourcePage.id || 'unknown',
    variationNumber: index + 1,
    html: result.html,
    assets: [],
    changes: [{
      type: 'structure' as const,
      selector: 'html',
      originalValue: '',
      newValue: '',
      reason: result.success ? 'Generated with 3-agent workflow' : `Fallback: ${result.error}`,
    }],
    generatedAt: result.generatedAt,
  }));

  return NextResponse.json({
    success: true,
    variations,
    count: variations.length,
    workflow: '3-agent',
    analysis: {
      id: analysis.id,
      components: analysis.components.length,
      criticalComponents: analysis.components.filter(c => c.importance === 'critical').length,
      flow: analysis.flow,
      vertical: analysis.vertical,
      tone: analysis.tone,
      strategySummary: analysis.strategySummary,
      trackingUrl: analysis.trackingUrl,
    },
    prompt: {
      length: builderPrompt.fullPrompt.length,
      preview: builderPrompt.systemContext?.slice(0, 200) + '...',
    },
  });
}

/**
 * Find best tracking link from parsed page
 */
function findBestTrackingLink(sourcePage: ParsedLandingPage): string | null {
  if (!sourcePage.links || sourcePage.links.length === 0) return null;

  // Priority order: cta > affiliate > tracking > redirect
  const ctaLink = sourcePage.links.find(l => l.type === 'cta' && l.originalUrl !== '#');
  const affiliateLink = sourcePage.links.find(l => l.type === 'affiliate');
  const trackingLink = sourcePage.links.find(l => l.type === 'tracking' && l.originalUrl.startsWith('http'));
  const redirectLink = sourcePage.links.find(l => l.type === 'redirect');

  const bestLink = ctaLink || affiliateLink || trackingLink || redirectLink;
  return bestLink?.originalUrl || null;
}

/**
 * Legacy workflow for non-generate-new modes
 */
async function handleLegacyWorkflow(
  sourcePage: ParsedLandingPage,
  options: Partial<GenerationOptions>,
  variationCount: number
) {
  console.log('=== LEGACY WORKFLOW ===');
  console.log('Options:', {
    textHandling: options.textHandling,
    styleHandling: options.styleHandling,
    variationCount,
  });

  // Step 1: Analyze the page using old Analyzer
  console.log('Step 1: Analyzing page (Cheerio only)...');
  const analysis = await analyzeLandingPage(sourcePage.html, sourcePage.sourceUrl);
  console.log('Analysis complete:', {
    sections: analysis.sections.length,
    headlines: analysis.components.headlines.length,
    buttons: analysis.components.buttons.length,
  });

  // Apply CTA URL override if provided
  if (options.ctaUrlOverride && options.ctaUrlOverride.trim()) {
    analysis.lpFlow.ctaStrategy.primaryCtaUrl = options.ctaUrlOverride.trim();
  }

  // Fall back to parsed links if no CTA URL
  if (!analysis.lpFlow.ctaStrategy.primaryCtaUrl || analysis.lpFlow.ctaStrategy.primaryCtaUrl === '#') {
    const bestLink = findBestTrackingLink(sourcePage);
    if (bestLink) {
      analysis.lpFlow.ctaStrategy.primaryCtaUrl = bestLink;
    }
  }

  // Map options and build
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

  console.log('Step 2: Building page...');
  const buildResults = await buildLandingPage(buildOptions);
  console.log('Build complete:', {
    variations: buildResults.length,
  });

  // Convert to response format
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
    workflow: 'legacy',
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
      return { colorScheme: 'generate-new', fontHandling: 'keep' };
    case 'modify-layout':
      return {
        colorScheme: 'keep',
        fontHandling: 'modern',
        layoutAdjustments: { addPadding: true, centerContent: true },
      };
    case 'restyle-complete':
      return {
        colorScheme: 'generate-new',
        fontHandling: 'modern',
        layoutAdjustments: { maxWidth: '1200px', addPadding: true, centerContent: true },
      };
    default:
      return { colorScheme: 'keep', fontHandling: 'keep' };
  }
}
