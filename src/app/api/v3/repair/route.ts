import { NextRequest, NextResponse } from 'next/server';
import { repairLandingPage } from '@/lib/agents';
import type { LPBlueprint } from '@/lib/agents/architect';
import type { QAResult } from '@/lib/agents/qa';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { html, blueprint, qaResult, userIssue } = body as {
      html: string;
      blueprint: Partial<LPBlueprint>;
      qaResult?: Partial<QAResult>;
      userIssue?: { description: string; expectedBehavior?: string };
    };

    if (!html) {
      return NextResponse.json(
        { error: 'HTML is required' },
        { status: 400 }
      );
    }

    // Convert partial blueprint to full blueprint with defaults
    const fullBlueprint: LPBlueprint = {
      id: blueprint.id || 'repair-blueprint',
      createdAt: new Date(),
      vertical: (blueprint.vertical as 'adult' | 'casual' | 'mainstream') || 'casual',
      tone: blueprint.tone || 'playful-seductive',
      targetAudience: blueprint.targetAudience || 'Singles',
      totalSteps: blueprint.totalSteps || 5,
      sections: blueprint.sections || [],
      visualDirection: blueprint.visualDirection || {
        colorPalette: {
          primary: '#e91e63',
          secondary: '#9c27b0',
          accent: '#ff1744',
          background: '#1a1a2e',
          text: '#ffffff',
        },
        typography: {
          headlineStyle: 'Bold, 28-32px',
          bodyStyle: 'Clean, 16-18px',
        },
        imagery: {
          backgroundStyle: 'Dark gradient',
        },
      },
      conversionStrategy: blueprint.conversionStrategy || {
        mainHook: 'Connection',
        valueProposition: 'Meet singles',
        primaryPersuasion: [],
        urgencyTactics: [],
      },
      technical: {
        trackingUrl: blueprint.technical?.trackingUrl || 'https://example.com/track',
        requiresCountdown: blueprint.technical?.requiresCountdown ?? true,
        requiresScarcity: blueprint.technical?.requiresScarcity ?? true,
        requiresSocialProof: blueprint.technical?.requiresSocialProof ?? false,
      },
      builderPrompt: blueprint.builderPrompt || '',
    };

    // Convert partial QA result
    const fullQaResult: QAResult | undefined = qaResult ? {
      id: qaResult.id || 'repair-qa',
      testedAt: new Date(),
      passed: qaResult.passed ?? false,
      score: qaResult.score ?? 0,
      issues: qaResult.issues || [],
      criticalCount: qaResult.criticalCount ?? 0,
      majorCount: qaResult.majorCount ?? 0,
      minorCount: qaResult.minorCount ?? 0,
      suggestionCount: qaResult.suggestionCount ?? 0,
      checks: qaResult.checks || {
        hasValidHTML: true,
        hasWorkingJS: true,
        hasAllSteps: true,
        hasCorrectRedirect: true,
        hasResponsiveDesign: true,
        hasCTAButtons: true,
        matchesBlueprint: true,
      },
      summary: qaResult.summary || '',
    } : undefined;

    console.log('\n🔧 V3 Repair API...');
    console.log('QA issues:', fullQaResult?.issues?.length || 0);
    console.log('User issue:', userIssue?.description?.slice(0, 50) || 'None');

    const repairResult = await repairLandingPage(
      html,
      fullBlueprint,
      fullQaResult,
      userIssue
    );

    console.log('Repair complete:', {
      fixedCount: repairResult.fixedCount,
      failedCount: repairResult.failedCount,
    });

    return NextResponse.json({
      success: true,
      html: repairResult.html,
      fixesApplied: repairResult.fixesApplied,
      totalIssues: repairResult.totalIssues,
      fixedCount: repairResult.fixedCount,
      failedCount: repairResult.failedCount,
      summary: repairResult.summary,
    });
  } catch (error) {
    console.error('V3 Repair error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Repair failed' },
      { status: 500 }
    );
  }
}
