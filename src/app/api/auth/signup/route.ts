import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth';
import { handleAuthError } from '@/lib/auth';
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
    const userTypeValue = formData.get('userType') as string;
    const managerHospitalId = formData.get('managerHospitalId') as string | null;
    const hospitalValue = managerHospitalId || (formData.get('hospital') as string | null);
    
    const userData: Record<string, any> = {
      userType: userTypeValue,
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      password: formData.get('password')
    };
    
    // Add optional fields only if they have values
    const postValue = formData.get('post') as string | null;
    const ciusssValue = formData.get('ciusss') as string | null;
    
    if (postValue && postValue.trim()) {
      userData.post = postValue;
    }
    
    if (ciusssValue && ciusssValue.trim()) {
      userData.ciusss = ciusssValue;
    }
    
    if (hospitalValue && hospitalValue.trim()) {
      userData.hospital = hospitalValue;
    }
    
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
    
    // 5. Return user data for verification page (no session created yet)
    // User must verify email and phone before account is activated
    return NextResponse.json({
      success: true,
      message: 'Account created. Please verify your email and phone number.',
      user: {
        _id: result.user?._id,
        email: result.user?.email,
        userType: result.user?.userType,
        firstName: result.user?.firstName,
        lastName: result.user?.lastName,
        status: result.user?.status
      }
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