import { NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import User from '@/models/User';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { 
  uploadFileToGridFS, 
  validateFile, 
  calculateFileChecksum,
  type FileMetadata 
} from '@/lib/database/gridfs';

// Validation utilities
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  // Check if it's a valid phone number (7-15 digits)
  return cleanPhone.length >= 7 && cleanPhone.length <= 15;
};

const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

// Helper function to capitalize first letter of each word
const capitalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper function to process file upload to GridFS
const processFileUpload = async (
  file: File, 
  documentType: 'cv' | 'opiqPermit' | 'rcr',
  userId: string
): Promise<{ fileId: string; metadata: FileMetadata }> => {
  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = calculateFileChecksum(buffer);
  
  const metadata: FileMetadata = {
    userId,
    documentType,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    checksum,
    uploadedAt: new Date()
  };
  
  const fileId = await uploadFileToGridFS(buffer, file.name, metadata);
  
  return {
    fileId: fileId.toString(),
    metadata
  };
};

export async function POST(request: Request) {
  const startTime = Date.now();
  let userEmail = '';
  
  try {
    // Connect to MongoDB using Mongoose
    console.log('🔄 API: Attempting to connect to MongoDB...');
    await dbConnect();
    console.log('✅ API: MongoDB connection established');
    
    const formData = await request.formData();
    const userType = formData.get('userType') as 'employee' | 'manager';
    const firstName = capitalizeName(sanitizeInput(formData.get('firstName') as string));
    const lastName = capitalizeName(sanitizeInput(formData.get('lastName') as string));
    const email = sanitizeInput(formData.get('email') as string);
    const phone = sanitizeInput(formData.get('phone') as string);
    const password = formData.get('password') as string;

    userEmail = email; // Store for logging

    // Comprehensive validation with field-specific errors
    const validationErrors: { [key: string]: string[] } = {};

    // Validate required fields
    if (!userType) {
      validationErrors.userType = ['User type is required'];
    }
    if (!firstName) {
      validationErrors.firstName = ['First name is required'];
    }
    if (!lastName) {
      validationErrors.lastName = ['Last name is required'];
    }
    if (!email) {
      validationErrors.email = ['Email address is required'];
    }
    if (!phone) {
      validationErrors.phone = ['Phone number is required'];
    }
    if (!password) {
      validationErrors.password = ['Password is required'];
    }

    // Validate user type
    if (userType && !['employee', 'manager'].includes(userType)) {
      validationErrors.userType = ['Invalid user type. Must be either "employee" or "manager"'];
    }

    // Validate name fields
    if (firstName && firstName.length < 2) {
      validationErrors.firstName = ['First name must be at least 2 characters long'];
    }
    if (lastName && lastName.length < 2) {
      validationErrors.lastName = ['Last name must be at least 2 characters long'];
    }

    // Validate email format
    if (email && !validateEmail(email)) {
      validationErrors.email = ['Please provide a valid email address (e.g., user@example.com)'];
    }

    // Validate phone format
    if (phone && !validatePhone(phone)) {
      validationErrors.phone = ['Please provide a valid phone number (7-15 digits)'];
    }

    // Validate password strength
    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        validationErrors.password = passwordValidation.errors;
      }
    }

    // Check for duplicate email and phone before creating user
    if (email && validateEmail(email)) {
      const existingUserByEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingUserByEmail) {
        validationErrors.email = ['An account with this email address already exists'];
      }
    }

    if (phone && validatePhone(phone)) {
      const existingUserByPhone = await User.findOne({ phone: phone });
      if (existingUserByPhone) {
        validationErrors.phone = ['An account with this phone number already exists'];
      }
    }

    // Return validation errors if any
    if (Object.keys(validationErrors).length > 0) {
      console.log('❌ API: Validation failed:', validationErrors);
      return NextResponse.json(
        { 
          message: 'Please correct the following errors', 
          errors: validationErrors 
        }, 
        { status: 400 }
      );
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const userData: any = { 
      userType, 
      firstName, 
      lastName, 
      email, 
      phone, 
      password: hashedPassword,
      documents: [] // Initialize documents array
    };

    // Handle manager-specific fields
    if (userType === 'manager') {
      const rawPost = sanitizeInput(formData.get('post') as string);
      const allowedPosts = ['coordinateur', 'assistant-chef', 'gestionnaire'];
      const post = rawPost.toLowerCase();
      const postTitleMap: Record<string, string> = {
        'coordinateur': 'Coordinateur',
        'assistant-chef': 'Assistant-chef',
        'gestionnaire': 'Gestionnaire',
      };
      const ciusssValue = sanitizeInput(formData.get('ciusss') as string);
      const managerHospitalId = sanitizeInput(formData.get('managerHospitalId') as string);
      
      // Debug CIUSSS value
      console.log('🔍 DEBUG: CIUSSS value received:', ciusssValue);
      console.log('🔍 DEBUG: CIUSSS value type:', typeof ciusssValue);
      console.log('🔍 DEBUG: CIUSSS value length:', ciusssValue?.length);
      
      // Validate manager-specific fields
      if (!post) {
        validationErrors.post = ['Post is required for managers'];
      } else if (!allowedPosts.includes(post)) {
        validationErrors.post = ['Please select a valid post'];
      }
      
      if (!ciusssValue || ciusssValue.trim() === '') {
        validationErrors.ciusss = ['CIUSSS is required for managers'];
      } else if (!mongoose.Types.ObjectId.isValid(ciusssValue)) {
        validationErrors.ciusss = ['Invalid CIUSSS ID format'];
      } else {
        // Validate that the CIUSSS exists and is active
        const CIUSSS = (await import('@/models/CIUSSS')).CIUSSS;
        const ciusssExists = await CIUSSS.findById(ciusssValue);
        if (!ciusssExists) {
          validationErrors.ciusss = ['Selected CIUSSS does not exist'];
        } else if (!ciusssExists.isActive) {
          validationErrors.ciusss = ['Selected CIUSSS is not active'];
        }
      }

      // Validate manager hospital
      if (!managerHospitalId) {
        validationErrors.managerHospitalId = ['Hospital is required for managers'];
      } else if (!mongoose.Types.ObjectId.isValid(managerHospitalId)) {
        validationErrors.managerHospitalId = ['Invalid hospital selection'];
      }
      
      // Return validation errors if any manager fields are invalid
      if (Object.keys(validationErrors).length > 0) {
        console.log('❌ API: Manager validation failed:', validationErrors);
        return NextResponse.json(
          { 
            message: 'Please correct the following errors', 
            errors: validationErrors 
          }, 
          { status: 400 }
        );
      }
      
      userData.post = postTitleMap[post];
        userData.ciusss = new mongoose.Types.ObjectId(ciusssValue);
      if (managerHospitalId) {
        userData.hospital = new mongoose.Types.ObjectId(managerHospitalId);
      }
    }

    // Handle employee-specific fields and file uploads
    if (userType === 'employee') {
      const cv = formData.get('cv') as File;
      const opiqPermit = formData.get('opiqPermit') as File;
      const rcr = formData.get('rcr') as File;

      // Validate employee-specific files
      if (!cv) {
        validationErrors.cv = ['CV document is required for employees'];
      }
      
      if (!opiqPermit) {
        validationErrors.opiqPermit = ['OPIQ permit document is required for employees'];
      }
      
      if (!rcr) {
        validationErrors.rcr = ['RCR document is required for employees'];
      }
      
      // Return validation errors if any employee fields are invalid
      if (Object.keys(validationErrors).length > 0) {
        console.log('❌ API: Employee validation failed:', validationErrors);
        return NextResponse.json(
          { 
            message: 'Please correct the following errors', 
            errors: validationErrors 
          }, 
          { status: 400 }
        );
      }

      // Define allowed file types and size limits
      const allowedFileTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      const maxFileSizeMB = 10;

      // Validate CV file
      const cvValidation = validateFile(cv, allowedFileTypes, maxFileSizeMB);
      if (!cvValidation.isValid) {
        validationErrors.cv = [`CV document: ${cvValidation.error}`];
      }

      // Validate OPIQ permit file
      const opiqValidation = validateFile(opiqPermit, allowedFileTypes, maxFileSizeMB);
      if (!opiqValidation.isValid) {
        validationErrors.opiqPermit = [`OPIQ permit: ${opiqValidation.error}`];
      }

      // Validate RCR file
      const rcrValidation = validateFile(rcr, allowedFileTypes, maxFileSizeMB);
      if (!rcrValidation.isValid) {
        validationErrors.rcr = [`RCR document: ${rcrValidation.error}`];
      }
      
      // Return validation errors if any file validations failed
      if (Object.keys(validationErrors).length > 0) {
        console.log('❌ API: File validation failed:', validationErrors);
        return NextResponse.json(
          { 
            message: 'Please correct the following errors', 
            errors: validationErrors 
          }, 
          { status: 400 }
        );
      }

      // Generate a temporary user ID for file processing
      const tempUserId = new mongoose.Types.ObjectId().toString();

      try {
        // Process CV file
        console.log('📄 API: Processing CV file...');
        const cvResult = await processFileUpload(cv, 'cv', tempUserId);
        userData.documents.push({
          fileId: cvResult.fileId,
          documentType: 'cv',
          originalName: cvResult.metadata.originalName,
          mimeType: cvResult.metadata.mimeType,
          size: cvResult.metadata.size,
          checksum: cvResult.metadata.checksum,
          uploadedAt: cvResult.metadata.uploadedAt
        });
        console.log(`✅ API: CV uploaded to GridFS - ID: ${cvResult.fileId}`);

        // Process OPIQ permit file
        console.log('📄 API: Processing OPIQ permit file...');
        const opiqResult = await processFileUpload(opiqPermit, 'opiqPermit', tempUserId);
        userData.documents.push({
          fileId: opiqResult.fileId,
          documentType: 'opiqPermit',
          originalName: opiqResult.metadata.originalName,
          mimeType: opiqResult.metadata.mimeType,
          size: opiqResult.metadata.size,
          checksum: opiqResult.metadata.checksum,
          uploadedAt: opiqResult.metadata.uploadedAt
        });
        console.log(`✅ API: OPIQ permit uploaded to GridFS - ID: ${opiqResult.fileId}`);

        // Process RCR document file
        console.log('📄 API: Processing RCR document file...');
        const rcrResult = await processFileUpload(rcr, 'rcr', tempUserId);
        userData.documents.push({
          fileId: rcrResult.fileId,
          documentType: 'rcr',
          originalName: rcrResult.metadata.originalName,
          mimeType: rcrResult.metadata.mimeType,
          size: rcrResult.metadata.size,
          checksum: rcrResult.metadata.checksum,
          uploadedAt: rcrResult.metadata.uploadedAt
        });
        console.log(`✅ API: RCR document uploaded to GridFS - ID: ${rcrResult.fileId}`);

      } catch (fileError) {
        console.error('❌ API: File upload to GridFS failed:', fileError);
        return NextResponse.json(
          { message: 'Failed to upload documents. Please try again.' }, 
          { status: 500 }
        );
      }
    }

    // Email and phone uniqueness already checked in validation above
    console.log(`✅ API: Email and phone are available for: ${userEmail}`);

    // Create new user in MongoDB using Mongoose
    try {
      console.log(`💾 API: Creating new ${userType} user in database...`);
      const newUser = new User(userData);
      const savedUser = await newUser.save();
      
      // Update file metadata with actual user ID for employees
      if (userType === 'employee' && savedUser.documents && savedUser.documents.length > 0) {
        console.log('🔄 API: Updating file metadata with actual user ID...');
        const { updateFileMetadata } = await import('@/lib/database/gridfs');
        
        for (const doc of savedUser.documents) {
          try {
            await updateFileMetadata(doc.fileId, { userId: (savedUser._id as any).toString() });
            console.log(`✅ API: Updated metadata for file ${doc.fileId}`);
          } catch (updateError) {
            console.error(`⚠️ API: Failed to update metadata for file ${doc.fileId}:`, updateError);
            // Continue with user creation even if metadata update fails
          }
        }
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ API: User successfully saved to database in ${processingTime}ms`);
      console.log(`👤 API: User ID: ${savedUser._id}, Type: ${savedUser.userType}, Email: ${userEmail}`);
      console.log(`📧 API: User status: ${savedUser.status} (pending approval)`);
      
      // Send approval email to admin (async, don't wait for it)
      sendApprovalEmailToAdmin((savedUser._id as any).toString()).catch(error => {
        console.error('❌ API: Failed to send approval email:', error);
      });
      
      // For approved users (like managers), create a session immediately
      let sessionData = null;
      if (savedUser.status === 'approved') {
        try {
          console.log('🔐 API: Creating session for approved user');
          
          // Get IP address
          const ipAddress = 
            request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('x-real-ip') ||
            'unknown';
          
          // Create session directly (simplified approach)
          const { default: Session } = await import('@/models/Session');
          
          const session = new Session({
            sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: (savedUser._id as any).toString(),
            userAgent: request.headers.get('user-agent') || 'unknown',
            ipAddress: ipAddress,
            deviceInfo: {
              platform: 'web',
              browser: 'unknown',
              os: 'unknown',
              deviceType: 'desktop'
            },
            securityContext: {
              riskScore: 0,
              flags: [],
              recommendations: []
            },
            isActive: true,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          });
          
          await session.save();

          // Create JWT token with session ID
          const { signToken, setAuthCookie } = await import('@/lib/auth/jwt');
            const token = await signToken({
              userId: (savedUser._id as any).toString(),
              email: savedUser.email,
              userType: savedUser.userType,
              sessionId: session.sessionId
            });

            // Set secure HTTP-only cookie
            await setAuthCookie(token);
            
            sessionData = {
              sessionId: session.sessionId,
              expiresAt: session.expiresAt
            };
            
            console.log('✅ API: Session created for approved user');
        } catch (sessionError) {
          console.error('⚠️ API: Failed to create session for approved user:', sessionError);
        }
      }
      
      // Return a success response with sanitized user data
      const userResponse = savedUser.toObject();
      // Remove sensitive fields from response but keep the user ID for testing
      const { password, ...sanitizedUser } = userResponse;
      
      return NextResponse.json(
        { 
          message: savedUser.status === 'approved' 
            ? 'Account created and approved successfully! You can now log in.'
            : 'Account created successfully. Your registration is pending approval. You will receive an email notification once approved.',
          user: sanitizedUser,
          userId: (savedUser._id as any).toString(), // Include user ID for testing purposes
          status: savedUser.status,
          session: sessionData,
          processingTime: `${processingTime}ms`
        }, 
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError) {
        // Handle validation errors
        console.error('❌ API: Database validation error occurred:', error.message);
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return NextResponse.json(
          { message: 'Data validation failed', errors: validationErrors }, 
          { status: 400 }
        );
      }
      
      if (error instanceof mongoose.Error.CastError) {
        console.error('❌ API: Data type error:', error.message);
        return NextResponse.json(
          { message: 'Invalid data format provided' }, 
          { status: 400 }
        );
      }
      
      console.error('❌ API: Database operation failed:', error);
      throw error; // Re-throw other errors to be caught by the outer catch
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ API: Signup process failed after ${processingTime}ms:`, error);
    
    // Log security-relevant information
    if (userEmail) {
      console.error(`🔒 API: Failed signup attempt for email: ${userEmail}`);
    }
    
    // Return appropriate error response
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          message: 'Registration failed. Please try again.',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: 'An unexpected error occurred during registration' }, 
      { status: 500 }
    );
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