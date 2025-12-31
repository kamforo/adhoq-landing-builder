import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import type { GenerationResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { variations, projectName } = body as {
      variations: GenerationResult[];
      projectName?: string;
    };

    if (!variations || variations.length === 0) {
      return NextResponse.json(
        { error: 'No variations to download' },
        { status: 400 }
      );
    }

    // Sanitize project name for file naming
    const safeName = (projectName || 'landing-page').replace(/[^a-z0-9]/gi, '-');

    // For single variation, just return the HTML directly
    if (variations.length === 1) {
      const html = variations[0].html;
      const fileName = `${safeName}.html`;

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    }

    // For multiple variations, create a ZIP file
    const zip = new JSZip();

    variations.forEach((variation, index) => {
      const fileName = `${safeName}-v${index + 1}.html`;
      zip.file(fileName, variation.html);
    });

    // Generate the ZIP file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipFileName = `${safeName}-variations.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create download' },
      { status: 500 }
    );
  }
}
