import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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

const validateFileUpload = (file: File, allowedTypes: string[], maxSizeMB: number): { isValid: boolean; error?: string } => {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size must be less than ${maxSizeMB}MB`
    };
  }
  
  // Check file type
  const fileType = file.type;
  if (!allowedTypes.includes(fileType)) {
    return {
      isValid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }
  
  return { isValid: true };
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
    const firstName = sanitizeInput(formData.get('firstName') as string);
    const lastName = sanitizeInput(formData.get('lastName') as string);
    const email = sanitizeInput(formData.get('email') as string);
    const phone = sanitizeInput(formData.get('phone') as string);
    const password = formData.get('password') as string;

    userEmail = email; // Store for logging

    // Comprehensive validation
    const validationErrors: string[] = [];

    // Validate required fields
    if (!userType || !firstName || !lastName || !email || !phone || !password) {
      validationErrors.push('All fields are required');
    }

    // Validate user type
    if (userType && !['employee', 'manager'].includes(userType)) {
      validationErrors.push('Invalid user type. Must be either "employee" or "manager"');
    }

    // Validate name fields
    if (firstName && firstName.length < 2) {
      validationErrors.push('First name must be at least 2 characters long');
    }
    if (lastName && lastName.length < 2) {
      validationErrors.push('Last name must be at least 2 characters long');
    }

    // Validate email
    if (email && !validateEmail(email)) {
      validationErrors.push('Please provide a valid email address');
    }

    // Validate phone
    if (phone && !validatePhone(phone)) {
      validationErrors.push('Please provide a valid phone number');
    }

    // Validate password
    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        validationErrors.push(...passwordValidation.errors);
      }
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      console.log('❌ API: Validation failed:', validationErrors);
      return NextResponse.json(
        { 
          message: 'Validation failed', 
          errors: validationErrors 
        }, 
        { status: 400 }
      );
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const userData: any = { userType, firstName, lastName, email, phone, password: hashedPassword };

    // Handle manager-specific fields
    if (userType === 'manager') {
      const post = sanitizeInput(formData.get('post') as string);
      const classValue = sanitizeInput(formData.get('class') as string);
      
      if (!post || !classValue) {
        return NextResponse.json(
          { message: 'Missing required manager fields (post and class)' }, 
          { status: 400 }
        );
      }
      
      if (post.length < 2) {
        return NextResponse.json(
          { message: 'Post must be at least 2 characters long' }, 
          { status: 400 }
        );
      }
      
      userData.post = post;
      userData.class = classValue;
    }

    // Handle employee-specific fields and file uploads
    if (userType === 'employee') {
      const opiqPermit = formData.get('opiqPermit') as File;
      const rcr = formData.get('rcr') as File;

      if (!opiqPermit || !rcr) {
        return NextResponse.json(
          { message: 'Missing required employee documents (OPIQ permit and RCR)' }, 
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

      // Validate OPIQ permit file
      const opiqValidation = validateFileUpload(opiqPermit, allowedFileTypes, maxFileSizeMB);
      if (!opiqValidation.isValid) {
        return NextResponse.json(
          { message: `OPIQ permit validation failed: ${opiqValidation.error}` }, 
          { status: 400 }
        );
      }

      // Validate RCR file
      const rcrValidation = validateFileUpload(rcr, allowedFileTypes, maxFileSizeMB);
      if (!rcrValidation.isValid) {
        return NextResponse.json(
          { message: `RCR document validation failed: ${rcrValidation.error}` }, 
          { status: 400 }
        );
      }

      // Ensure uploads directory exists
      const uploadsDir = path.join(process.cwd(), 'public/uploads');
      try {
        await writeFile(`${uploadsDir}/.keep`, '');
      } catch (error) {
        // Directory already exists, continue
      }

      // Process OPIQ permit file
      if (opiqPermit && opiqPermit instanceof File) {
        const opiqPermitBuffer = Buffer.from(await opiqPermit.arrayBuffer());
        const sanitizedFilename = opiqPermit.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const opiqPermitFilename = `opiq_${Date.now()}_${sanitizedFilename}`;
        await writeFile(
          path.join(uploadsDir, opiqPermitFilename),
          opiqPermitBuffer
        );
        userData.opiqPermit = `/uploads/${opiqPermitFilename}`;
        console.log(`📄 API: OPIQ permit saved: ${opiqPermitFilename}`);
      }

      // Process RCR document file
      if (rcr && rcr instanceof File) {
        const rcrBuffer = Buffer.from(await rcr.arrayBuffer());
        const sanitizedFilename = rcr.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const rcrFilename = `rcr_${Date.now()}_${sanitizedFilename}`;
        await writeFile(
          path.join(uploadsDir, rcrFilename),
          rcrBuffer
        );
        userData.rcr = `/uploads/${rcrFilename}`;
        console.log(`📄 API: RCR document saved: ${rcrFilename}`);
      }
    }

    // Check if user already exists
    console.log(`🔍 API: Checking if user already exists for email: ${userEmail}`);
    const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
    if (existingUser) {
      console.log(`⚠️ API: User with email ${userEmail} already exists`);
      return NextResponse.json(
        { message: 'An account with this email address already exists' }, 
        { status: 409 }
      );
    }
    console.log('✅ API: Email is available');

    // Create new user in MongoDB using Mongoose
    try {
      console.log(`💾 API: Creating new ${userType} user in database...`);
      const newUser = new User(userData);
      const savedUser = await newUser.save();
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ API: User successfully saved to database in ${processingTime}ms`);
      console.log(`👤 API: User ID: ${savedUser._id}, Type: ${savedUser.userType}, Email: ${userEmail}`);
      
      // Return a success response with sanitized user data
      const userResponse = savedUser.toObject();
      // Remove sensitive fields from response
      const { password, _id, ...sanitizedUser } = userResponse;
      
      return NextResponse.json(
        { 
          message: 'Account created successfully',
          user: sanitizedUser,
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