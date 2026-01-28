import { NextRequest, NextResponse } from 'next/server';
import { analyzeWithAI } from '@/lib/analyzer/ai-analyzer';
import { analyzeFromBrief } from '@/lib/analyzer/brief-analyzer';
import { planLandingPage, reviewLandingPage, repairLandingPage, quickValidate } from '@/lib/agents';
import { buildVariations } from '@/lib/builder-agent';
import { embedExternalImages } from '@/lib/parser/image-embedder';
import type { ParsedLandingPage, GenerationOptions } from '@/types';
import type { DatingVertical } from '@/types/component-analysis';
import type { LPBlueprint } from '@/lib/agents/architect';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourcePage, brief, options, step } = body as {
      sourcePage?: ParsedLandingPage;
      brief?: string;
      options: Partial<GenerationOptions>;
      step?: 'analyze' | 'architect' | 'build' | 'qa' | 'repair' | 'full';
    };

    // Validate: require either sourcePage OR brief
    if (!sourcePage && !brief) {
      return NextResponse.json(
        { error: 'Either source page data or a brief is required' },
        { status: 400 }
      );
    }

    // Default to full workflow
    const currentStep = step || 'full';

    // For single steps, handle them individually (source page only)
    if (currentStep === 'analyze' && sourcePage) {
      return handleAnalyzeStep(sourcePage, options);
    }

    // Full V3 workflow
    if (brief && !sourcePage) {
      return handleFullV3WorkflowFromBrief(brief, options);
    }

    return handleFullV3Workflow(sourcePage!, options);
  } catch (error) {
    console.error('V3 Generate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate' },
      { status: 500 }
    );
  }
}

/**
 * Handle just the analyze step
 */
async function handleAnalyzeStep(
  sourcePage: ParsedLandingPage,
  options: Partial<GenerationOptions>
) {
  console.log('\n📊 V3 Step 1: AI Analyzer...');
  const analysis = await analyzeWithAI(sourcePage.html, sourcePage.sourceUrl);

  // Apply overrides
  if (options.ctaUrlOverride && options.ctaUrlOverride.trim()) {
    analysis.trackingUrl = options.ctaUrlOverride.trim();
  }
  if (options.vertical && options.vertical !== 'auto') {
    analysis.vertical = options.vertical as DatingVertical;
  }
  if (options.stepCount && options.stepCount > 0) {
    analysis.flow.totalSteps = options.stepCount;
  }

  // Fix: If detected tracking URL is the source page itself, use the original sourceUrl instead
  if (analysis.trackingUrl && sourcePage.resolvedUrl) {
    try {
      const detectedHost = new URL(analysis.trackingUrl).hostname;
      const resolvedHost = new URL(sourcePage.resolvedUrl).hostname;
      if (detectedHost === resolvedHost && sourcePage.sourceUrl) {
        console.log(`Redirect fix: detected URL is the LP itself (${detectedHost}), using sourceUrl instead`);
        analysis.trackingUrl = sourcePage.sourceUrl;
      }
    } catch { /* ignore URL parse errors */ }
  }

  return NextResponse.json({
    success: true,
    step: 'analyze',
    analysis,
  });
}

/**
 * Full V3 workflow FROM BRIEF: Brief Analyzer → Architect → Builder → QA → Repair (if needed)
 */
async function handleFullV3WorkflowFromBrief(
  brief: string,
  options: Partial<GenerationOptions>
) {
  try {
    console.log('=== V3 SCRATCH WORKFLOW (From Brief) ===');

    const variationCount = Math.min(options.variationCount || 1, 5);

    // ===== STEP 1: BRIEF ANALYZER =====
    console.log('\n📝 Step 1: Brief Analyzer...');
    const analysis = await analyzeFromBrief(brief, options);

    // Apply overrides
    if (options.ctaUrlOverride && options.ctaUrlOverride.trim()) {
      analysis.trackingUrl = options.ctaUrlOverride.trim();
    }
    if (options.vertical && options.vertical !== 'auto') {
      analysis.vertical = options.vertical as DatingVertical;
    }
    if (options.stepCount && options.stepCount > 0) {
      analysis.flow.totalSteps = options.stepCount;
    }

    console.log('Brief Analysis:', {
      components: analysis.components.length,
      vertical: analysis.vertical,
      tone: analysis.tone,
      trackingUrl: analysis.trackingUrl,
    });

    // ===== STEPS 2-6: Identical to source workflow =====
    return runPipelineFromAnalysis(analysis, options, variationCount, 'v3-scratch');
  } catch (error) {
    console.error('V3 Scratch Workflow error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'V3 scratch workflow failed' },
      { status: 500 }
    );
  }
}

/**
 * Full V3 workflow: Analyzer → Architect → Builder → QA → Repair (if needed)
 */
async function handleFullV3Workflow(
  sourcePage: ParsedLandingPage,
  options: Partial<GenerationOptions>
) {
  try {
    console.log('=== V3 ARCHITECT WORKFLOW ===');

    const variationCount = Math.min(options.variationCount || 1, 5);

    // ===== STEP 1: AI ANALYZER =====
    console.log('\n📊 Step 1: AI Analyzer...');
    const analysis = await analyzeWithAI(sourcePage.html, sourcePage.sourceUrl);

  // Apply overrides
  if (options.ctaUrlOverride && options.ctaUrlOverride.trim()) {
    analysis.trackingUrl = options.ctaUrlOverride.trim();
  }
  if (!analysis.trackingUrl) {
    const bestLink = findBestTrackingLink(sourcePage);
    if (bestLink) analysis.trackingUrl = bestLink;
  }
  if (options.vertical && options.vertical !== 'auto') {
    analysis.vertical = options.vertical as DatingVertical;
  }
  if (options.stepCount && options.stepCount > 0) {
    analysis.flow.totalSteps = options.stepCount;
  }

  // Fix: If detected tracking URL is the source page itself, use the original sourceUrl instead
  if (analysis.trackingUrl && sourcePage.resolvedUrl) {
    try {
      const detectedHost = new URL(analysis.trackingUrl).hostname;
      const resolvedHost = new URL(sourcePage.resolvedUrl).hostname;
      if (detectedHost === resolvedHost && sourcePage.sourceUrl) {
        console.log(`Redirect fix: detected URL is the LP itself (${detectedHost}), using sourceUrl instead`);
        analysis.trackingUrl = sourcePage.sourceUrl;
      }
    } catch { /* ignore URL parse errors */ }
  }

  console.log('Analysis:', {
    components: analysis.components.length,
    vertical: analysis.vertical,
    tone: analysis.tone,
    trackingUrl: analysis.trackingUrl,
  });

    // ===== STEPS 2-6: Shared pipeline =====
    return runPipelineFromAnalysis(analysis, options, variationCount, 'v3-architect', sourcePage.id);
  } catch (error) {
    console.error('V3 Workflow error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'V3 workflow failed' },
      { status: 500 }
    );
  }
}

/**
 * Shared pipeline: Architect → Builder → QA → Repair → Embed Images
 * Used by both source-page and from-scratch workflows
 */
async function runPipelineFromAnalysis(
  analysis: Awaited<ReturnType<typeof analyzeWithAI>>,
  options: Partial<GenerationOptions>,
  variationCount: number,
  workflow: string,
  sourcePageId?: string
) {
  // ===== STEP 2: ARCHITECT =====
  console.log('\n🏗️ Step 2: Architect...');
  const stylingOptions = {
    colorScheme: options.colorScheme,
    customColors: options.customColors,
    layoutStyle: options.layoutStyle,
    linkHandling: options.linkHandling,
    textHandling: options.textHandling,
    tone: options.tone,
    targetAge: options.targetAge,
    language: options.language,
    country: options.country,
    creativity: options.creativity,
    customInstructions: options.textInstructions,
    addElements: options.addElements,
  };

  const blueprint = await planLandingPage(analysis, stylingOptions);
  console.log('Blueprint created:', {
    sections: blueprint.sections.length,
    totalSteps: blueprint.totalSteps,
    promptLength: blueprint.builderPrompt.length,
  });

  // ===== STEP 3: BUILDER =====
  console.log('\n🔨 Step 3: Builder...');
  const builderPrompt = {
    systemContext: `Building ${blueprint.vertical} dating LP with ${blueprint.totalSteps} steps`,
    requirements: blueprint.builderPrompt,
    suggestions: '',
    componentInstructions: '',
    technicalRequirements: '',
    fullPrompt: blueprint.builderPrompt,
  };

  const buildResults = await buildVariations(builderPrompt, analysis, variationCount);
  console.log('Build complete:', {
    variations: buildResults.length,
    successful: buildResults.filter(r => r.success).length,
  });

  // ===== STEP 4: QA =====
  console.log('\n🔍 Step 4: QA Review...');
  const qaResults = [];
  const finalVariations = [];

  for (const result of buildResults) {
    if (!result.success) {
      finalVariations.push({
        ...result,
        qaResult: null,
        repairResult: null,
      });
      continue;
    }

    // Run QA on each variation
    let qaResult;
    try {
      // Try OpenAI-based QA first
      qaResult = await reviewLandingPage(result.html, blueprint);
    } catch (error) {
      console.log('OpenAI QA failed, using quick validate:', error);
      qaResult = quickValidate(result.html, blueprint);
    }

    qaResults.push(qaResult);
    console.log(`Variation ${result.id} QA:`, {
      passed: qaResult.passed,
      score: qaResult.score,
      critical: qaResult.criticalCount,
      major: qaResult.majorCount,
    });

    // ===== STEP 5: REPAIR (if needed) =====
    let finalHtml = result.html;
    let repairResult = null;

    if (!qaResult.passed && qaResult.criticalCount > 0) {
      console.log('\n🔧 Step 5: Repair Agent...');
      try {
        repairResult = await repairLandingPage(result.html, blueprint, qaResult);
        finalHtml = repairResult.html;
        console.log('Repair complete:', {
          fixed: repairResult.fixedCount,
          failed: repairResult.failedCount,
        });
      } catch (error) {
        console.error('Repair failed:', error);
      }
    }

    // ===== STEP 6: EMBED IMAGES =====
    console.log('\n🖼️ Step 6: Embedding images...');
    try {
      finalHtml = await embedExternalImages(finalHtml);
    } catch (error) {
      console.error('Image embedding failed (keeping original URLs):', error);
    }

    finalVariations.push({
      id: result.id,
      html: finalHtml,
      success: result.success,
      generatedAt: result.generatedAt,
      qaResult,
      repairResult,
    });
  }

  // Convert to response format
  const variations = finalVariations.map((result, index) => ({
    id: result.id,
    sourcePageId: sourcePageId || 'scratch',
    variationNumber: index + 1,
    html: result.html,
    assets: [],
    changes: [{
      type: 'structure' as const,
      selector: 'html',
      originalValue: '',
      newValue: '',
      reason: `Generated with ${workflow} workflow`,
    }],
    generatedAt: result.generatedAt,
    qaResult: result.qaResult,
    repairResult: result.repairResult,
  }));

  return NextResponse.json({
    success: true,
    variations,
    count: variations.length,
    workflow,
    analysis,
    blueprint: {
      id: blueprint.id,
      totalSteps: blueprint.totalSteps,
      sections: blueprint.sections.map(s => ({
        stepNumber: s.stepNumber,
        type: s.type,
        title: s.title,
      })),
      visualDirection: blueprint.visualDirection,
      conversionStrategy: blueprint.conversionStrategy,
    },
    qaResults: qaResults.map(qa => ({
      id: qa.id,
      passed: qa.passed,
      score: qa.score,
      criticalCount: qa.criticalCount,
      majorCount: qa.majorCount,
      summary: qa.summary,
    })),
  });
}

/**
 * Find best tracking link from parsed page
 */
function findBestTrackingLink(sourcePage: ParsedLandingPage): string | null {
  if (!sourcePage.links || sourcePage.links.length === 0) return null;

  const ctaLink = sourcePage.links.find(l => l.type === 'cta' && l.originalUrl !== '#');
  const affiliateLink = sourcePage.links.find(l => l.type === 'affiliate');
  const trackingLink = sourcePage.links.find(l => l.type === 'tracking' && l.originalUrl.startsWith('http'));
  const redirectLink = sourcePage.links.find(l => l.type === 'redirect');

  const bestLink = ctaLink || affiliateLink || trackingLink || redirectLink;
  return bestLink?.originalUrl || null;
}
