import { NextResponse } from 'next/server';
import { getProject, updateProject, addVariation } from '@/lib/db/projects';

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

    // Check if project has source HTML
    if (!project.sourceHtml) {
      return NextResponse.json(
        { error: 'Project has no source HTML. Please configure it first.' },
        { status: 400 }
      );
    }

    // Update status to GENERATING
    await updateProject(projectId, { status: 'GENERATING' });

    // Start background generation (don't await - let it run in background)
    generateInBackground(projectId, project).catch(err => {
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

// Background generation function
async function generateInBackground(
  projectId: string,
  project: NonNullable<Awaited<ReturnType<typeof getProject>>>
) {
  try {
    // Prepare the request to the generate endpoint
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
      // Delete existing variations first
      // (In a real app, you might want to version them instead)

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
