import { NextRequest, NextResponse } from 'next/server';
import { downloadFileFromGridFS, getFileMetadata } from '@/lib/gridfs';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params;

    // Validate fileId format
    if (!ObjectId.isValid(fileId)) {
      return NextResponse.json(
        { message: 'Invalid file ID format' },
        { status: 400 }
      );
    }

    // Get file metadata first
    const metadata = await getFileMetadata(fileId);
    if (!metadata) {
      return NextResponse.json(
        { message: 'File not found' },
        { status: 404 }
      );
    }

    // Download file from GridFS
    const { buffer, filename } = await downloadFileFromGridFS(fileId);

    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', metadata.mimeType);
    headers.set('Content-Length', buffer.length.toString());
    headers.set('Content-Disposition', `inline; filename="${metadata.originalName}"`);
    headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Return file as response
    return new NextResponse(buffer, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('❌ API: File retrieval error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'File not found') {
        return NextResponse.json(
          { message: 'File not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Failed to retrieve file' },
      { status: 500 }
    );
  }
}

// Optional: Add HEAD method for file metadata only
export async function HEAD(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params;

    // Validate fileId format
    if (!ObjectId.isValid(fileId)) {
      return new NextResponse(null, { status: 400 });
    }

    // Get file metadata
    const metadata = await getFileMetadata(fileId);
    if (!metadata) {
      return new NextResponse(null, { status: 404 });
    }

    // Return metadata in headers
    const headers = new Headers();
    headers.set('Content-Type', metadata.mimeType);
    headers.set('Content-Length', metadata.size.toString());
    headers.set('Content-Disposition', `inline; filename="${metadata.originalName}"`);

    return new NextResponse(null, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('❌ API: File metadata retrieval error:', error);
    return new NextResponse(null, { status: 500 });
  }
}
