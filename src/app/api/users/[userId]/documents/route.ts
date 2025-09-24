import { NextRequest, NextResponse } from 'next/server';
import { listUserFiles } from '@/lib/gridfs';
import dbConnect from '@/lib/mongoose';
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
    await dbConnect();

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Get user documents from GridFS
    const documents = await listUserFiles(userId);

    // Format response
    const formattedDocuments = documents.map(doc => ({
      fileId: doc.fileId,
      documentType: doc.documentType,
      originalName: doc.originalName,
      size: doc.size,
      uploadedAt: doc.uploadedAt,
      downloadUrl: `/api/files/${doc.fileId}`
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
