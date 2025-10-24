import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth';
import { handleAuthError } from '@/lib/auth/auth-error-handler';
import { 
  GridFSService,
  type GridFSFileMetadata 
} from '@/lib/database';

// Helper function to process file upload to GridFS
const processFileUpload = async (file: File, documentType: 'cv' | 'opiqPermit' | 'rcr'): Promise<{
  fileId: string;
  metadata: GridFSFileMetadata;
}> => {
  const buffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(buffer);
  
  const metadata: GridFSFileMetadata = {
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    documentType,
    uploadedAt: new Date(),
    userId: '', // Will be set when user is created
    checksum: '' // Will be calculated by GridFSService
  };
  
  const fileId = await GridFSService.uploadFile(fileBuffer, file.name, metadata);
  
  return {
    fileId: fileId.toString(),
    metadata
  };
};

// Helper function to handle file uploads based on user type
const handleFileUploads = async (formData: FormData, userType: string) => {
  const documents = [];
  
  if (userType === 'employee') {
    const cvFile = formData.get('cv') as File;
    const opiqPermitFile = formData.get('opiqPermit') as File;
    const rcrFile = formData.get('rcr') as File;

    // Process CV
    if (cvFile && cvFile.size > 0) {
      const cvResult = await processFileUpload(cvFile, 'cv');
      documents.push(cvResult);
    }
    
    // Process OPIQ permit
    if (opiqPermitFile && opiqPermitFile.size > 0) {
      const opiqResult = await processFileUpload(opiqPermitFile, 'opiqPermit');
      documents.push(opiqResult);
    }
    
    // Process RCR
    if (rcrFile && rcrFile.size > 0) {
      const rcrResult = await processFileUpload(rcrFile, 'rcr');
      documents.push(rcrResult);
    }
  }
  
  return documents;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    // 1. Extract and validate data
    const userData = {
      userType: formData.get('userType'),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      password: formData.get('password'),
      post: formData.get('post'),
      ciusss: formData.get('ciusss'),
      hospital: formData.get('hospital')
    };
    
    // 2. Handle file uploads (keep existing logic)
    const documents = await handleFileUploads(formData, userData.userType as string);
    
    // 3. Use AuthService for signup
    const result = await AuthService.signup(
      { ...userData, documents },
      request as NextRequest
    );
    
    // 4. Send approval email for non-admin users who need approval
    if (result.user && result.user.status === 'pending') {
      // Send email asynchronously (don't wait for it)
      sendApprovalEmailToAdmin(result.user._id).catch(error => {
        console.error('❌ API: Failed to send approval email:', error);
      });
    }
    
    // 5. Set cookie if token exists
    if (result.token) {
      const response = NextResponse.json({
        message: 'Registration successful',
        user: result.user,
        session: result.session
      }, { status: 201 });
      
      response.cookies.set('auth-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60
      });
      
      return response;
    }
    
    return NextResponse.json({
      message: 'Registration successful. Awaiting approval.',
      user: result.user
    }, { status: 201 });
    
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * Send approval email to admin (async helper function)
 */
async function sendApprovalEmailToAdmin(userId: string) {
  try {
    const response = await fetch(`${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/signup-approval`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (response.ok) {
      console.log(`✅ API: Approval email sent successfully for user ${userId}`);
    } else {
      const error = await response.json();
      console.error(`❌ API: Failed to send approval email for user ${userId}:`, error);
    }
  } catch (error) {
    console.error(`❌ API: Error sending approval email for user ${userId}:`, error);
  }
}