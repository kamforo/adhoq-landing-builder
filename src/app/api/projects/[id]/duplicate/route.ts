import { NextResponse } from 'next/server';
import { duplicateProject } from '@/lib/db/projects';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const newName = body.name;

    const project = await duplicateProject(id, newName);
    return NextResponse.json(project);
  } catch (error) {
    console.error('Failed to duplicate project:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate project' },
      { status: 500 }
    );
  }
}
