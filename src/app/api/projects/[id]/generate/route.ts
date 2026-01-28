import { NextResponse } from 'next/server';
import { getProject, updateProject, addVariation, deleteVariations } from '@/lib/db/projects';

// Background generation - starts generation and returns immediately
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Get project
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Guard: reject if already generating (prevents double-trigger)
    if (project.status === 'GENERATING') {
      return NextResponse.json(
        { error: 'Generation already in progress' },
        { status: 409 }
      );
    }

    const isV3 = project.pipelineVersion === 'v3';
    const options = (project.options as Record<string, unknown>) || {};

    // V1 requires sourceHtml; V3 accepts either sourceHtml or a brief
    if (!isV3 && !project.sourceHtml) {
      return NextResponse.json(
        { error: 'Project has no source HTML. Please configure it first.' },
        { status: 400 }
      );
    }

    if (isV3 && !project.sourceHtml && !options.brief) {
      return NextResponse.json(
        { error: 'V3 project needs either source HTML or a brief.' },
        { status: 400 }
      );
    }

    // Update status to GENERATING
    await updateProject(projectId, { status: 'GENERATING' });

    // Start background generation (don't await - let it run in background)
    const bgFn = isV3 ? generateV3InBackground : generateInBackground;
    bgFn(projectId, project).catch(err => {
      console.error('Background generation failed:', err);
      updateProject(projectId, { status: 'FAILED' }).catch(console.error);
    });

    return NextResponse.json({
      success: true,
      message: 'Generation started',
      projectId
    });
  } catch (error) {
    console.error('Failed to start generation:', error);
    return NextResponse.json(
      { error: 'Failed to start generation' },
      { status: 500 }
    );
  }
}

type ProjectData = NonNullable<Awaited<ReturnType<typeof getProject>>>;

// V1 background generation function
async function generateInBackground(projectId: string, project: ProjectData) {
  try {
    const options = (project.options as Record<string, unknown>) || {};

    const generateResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePage: {
            html: project.sourceHtml,
            sourceUrl: project.sourceUrl,
            title: project.name,
          },
          options: {
            ...options,
            ctaUrlOverride: project.trackingUrl,
            vertical: project.vertical,
            language: project.language,
            country: project.country,
          },
        }),
      }
    );

    if (!generateResponse.ok) {
      throw new Error('Generation failed');
    }

    const result = await generateResponse.json();

    // Save variations
    if (result.variations && result.variations.length > 0) {
      for (const variation of result.variations) {
        await addVariation(projectId, {
          number: variation.variationNumber,
          html: variation.html,
        });
      }
    }

    // Update project with analysis and status
    await updateProject(projectId, {
      status: 'COMPLETED',
      analysis: result.analysis || undefined,
    });

    console.log(`Generation completed for project ${projectId}`);
  } catch (error) {
    console.error(`Generation failed for project ${projectId}:`, error);
    await updateProject(projectId, { status: 'FAILED' });
    throw error;
  }
}

// V3 background generation function
async function generateV3InBackground(projectId: string, project: ProjectData) {
  try {
    const options = (project.options as Record<string, unknown>) || {};
    const brief = options.brief as string | undefined;

    // Build request body — either source-page mode or brief mode
    const body: Record<string, unknown> = {
      options: {
        ...options,
        ctaUrlOverride: project.trackingUrl,
        vertical: project.vertical,
        language: project.language,
        country: project.country,
      },
    };

    if (project.sourceHtml) {
      body.sourcePage = {
        html: project.sourceHtml,
        sourceUrl: project.sourceUrl,
        title: project.name,
      };
    } else if (brief) {
      body.brief = brief;
    }

    const generateResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/v3/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      throw new Error(`V3 generation failed: ${generateResponse.status} - ${errorText.substring(0, 200)}`);
    }

    const result = await generateResponse.json();

    // Delete existing variations before saving new ones (avoids unique constraint)
    await deleteVariations(projectId);

    // Save variations
    if (result.variations && result.variations.length > 0) {
      for (const variation of result.variations) {
        await addVariation(projectId, {
          number: variation.variationNumber,
          html: variation.html,
        });
      }
    }

    // Update project with analysis, blueprint, QA results, and status
    await updateProject(projectId, {
      status: 'COMPLETED',
      analysis: result.analysis || undefined,
      architectPlan: result.blueprint || undefined,
      qaResults: result.qaResults?.[0] || undefined,
    });

    console.log(`V3 generation completed for project ${projectId}`);
  } catch (error) {
    console.error(`V3 generation failed for project ${projectId}:`, error);
    await updateProject(projectId, { status: 'FAILED' });
    throw error;
  }
}
