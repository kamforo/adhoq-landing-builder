import { NextResponse } from 'next/server';
import { duplicateProject } from '@/lib/db/projects';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { name, options, skipVariations } = body;

    const project = await duplicateProject(id, name, {
      options,
      skipVariations,
    });
    return NextResponse.json(project);
  } catch (error) {
    console.error('Failed to duplicate project:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate project' },
      { status: 500 }
    );
  }
}
