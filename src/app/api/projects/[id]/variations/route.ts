import { NextResponse } from 'next/server';
import { addVariation } from '@/lib/db/projects';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();

    const { number, html, generationTime } = body;

    if (!html) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      );
    }

    const variation = await addVariation(projectId, {
      number: number || 1,
      html,
      generationTime,
    });

    return NextResponse.json(variation);
  } catch (error) {
    console.error('Failed to add variation:', error);
    return NextResponse.json(
      { error: 'Failed to add variation' },
      { status: 500 }
    );
  }
}
