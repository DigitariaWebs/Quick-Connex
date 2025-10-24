import { NextRequest, NextResponse } from 'next/server';
import { GridFSService } from '@/lib/database';
import { ObjectId } from 'mongodb';

/**
 * Download file from GridFS by file ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    // Validate fileId format
    if (!ObjectId.isValid(fileId)) {
      return NextResponse.json(
        { message: 'Invalid file ID format' },
        { status: 400 }
      );
    }

    // Download file from GridFS
    const fileData = await GridFSService.downloadFile(fileId);

    // Set appropriate headers for file download
    const headers = new Headers();
    headers.set('Content-Type', fileData.metadata.mimeType);
    headers.set('Content-Disposition', `attachment; filename="${fileData.metadata.originalName}"`);
    headers.set('Content-Length', fileData.metadata.size.toString());
    headers.set('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour

    // Return file as response
    return new NextResponse(fileData.buffer as any, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('❌ API: File download error:', error);
    
    if (error instanceof Error && error.message === 'File not found') {
      return NextResponse.json(
        { message: 'File not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { message: 'Failed to download file' },
      { status: 500 }
    );
  }
}