import { NextRequest, NextResponse } from 'next/server';
import { scrapeLandingPageFromUrl, parseHtmlFile, parseZipFile } from '@/lib/parser';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle URL parsing
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { url } = body;

      if (!url) {
        return NextResponse.json(
          { error: 'URL is required' },
          { status: 400 }
        );
      }

      const parsed = await scrapeLandingPageFromUrl(url);
      return NextResponse.json(parsed);
    }

    // Handle file upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'File is required' },
          { status: 400 }
        );
      }

      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.zip')) {
        const buffer = await file.arrayBuffer();
        const parsed = await parseZipFile(buffer, file.name);
        return NextResponse.json(parsed);
      }

      if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        const content = await file.text();
        const parsed = await parseHtmlFile(content, file.name);
        return NextResponse.json(parsed);
      }

      return NextResponse.json(
        { error: 'Unsupported file type. Please upload .html or .zip files.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse landing page' },
      { status: 500 }
    );
  }
}
