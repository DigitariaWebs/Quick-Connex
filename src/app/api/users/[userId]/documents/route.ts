import { NextRequest, NextResponse } from 'next/server';
import { GridFSService } from '@/lib/database';
import User from '@/models/User';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Validate userId format
    if (!ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Connect to database
    // DatabaseService handles connection automatically
// Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Get user documents from GridFS
    const documents = await GridFSService.listUserFiles(userId);

    // Format response
    const formattedDocuments = documents.map(doc => ({
      fileId: doc._id,
      documentType: doc.metadata?.documentType || 'unknown',
      originalName: doc.metadata?.originalName || doc.filename,
      size: doc.length,
      uploadedAt: doc.uploadDate,
      downloadUrl: `/api/files/${doc._id}`
    }));

    return NextResponse.json({
      userId,
      userType: user.userType,
      documents: formattedDocuments,
      totalDocuments: formattedDocuments.length
    });

  } catch (error) {
    console.error('❌ API: User documents retrieval error:', error);
    
    return NextResponse.json(
      { message: 'Failed to retrieve user documents' },
      { status: 500 }
    );
  }
}
