import { NextRequest, NextResponse } from 'next/server';
import { createProject, listProjects } from '@/lib/db';

// GET /api/projects - List projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const options = {
      userId: searchParams.get('userId') || undefined,
      teamId: searchParams.get('teamId') || undefined,
      status: searchParams.get('status') || undefined,
      folder: searchParams.get('folder') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    };

    const result = await listProjects(options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to list projects:', error);
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    const project = await createProject({
      name: body.name,
      description: body.description,
      sourceUrl: body.sourceUrl,
      sourceHtml: body.sourceHtml,
      trackingUrl: body.trackingUrl,
      vertical: body.vertical,
      language: body.language,
      country: body.country,
      options: body.options,
      analysis: body.analysis,
      folder: body.folder,
      tags: body.tags,
      userId: body.userId,
      teamId: body.teamId,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
