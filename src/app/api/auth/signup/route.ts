import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  try {
    // Connect to MongoDB using Mongoose
    console.log('🔄 API: Attempting to connect to MongoDB...');
    await dbConnect();
    console.log('✅ API: MongoDB connection established');
    
    const formData = await request.formData();
    const userType = formData.get('userType') as 'employee' | 'manager';
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;

    // Validate required fields
    if (!userType || !firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { message: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    const userData: any = { userType, firstName, lastName, email, phone };

    // Handle manager-specific fields
    if (userType === 'manager') {
      const post = formData.get('post') as string;
      const classValue = formData.get('class') as string;
      
      if (!post || !classValue) {
        return NextResponse.json(
          { message: 'Missing required manager fields' }, 
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
          { message: 'Missing required employee documents' }, 
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
        const opiqPermitFilename = `${Date.now()}-${opiqPermit.name.replace(/\s+/g, '-')}`;
        await writeFile(
          path.join(uploadsDir, opiqPermitFilename),
          opiqPermitBuffer
        );
        userData.opiqPermit = `/uploads/${opiqPermitFilename}`;
      }

      // Process RCR document file
      if (rcr && rcr instanceof File) {
        const rcrBuffer = Buffer.from(await rcr.arrayBuffer());
        const rcrFilename = `${Date.now()}-${rcr.name.replace(/\s+/g, '-')}`;
        await writeFile(
          path.join(uploadsDir, rcrFilename),
          rcrBuffer
        );
        userData.rcr = `/uploads/${rcrFilename}`;
      }
    }

    // Check if user already exists
    console.log('🔍 API: Checking if user already exists...');
    const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
    if (existingUser) {
      console.log('⚠️ API: User with this email already exists');
      return NextResponse.json(
        { message: 'User with this email already exists' }, 
        { status: 409 }
      );
    }
    console.log('✅ API: Email is available');

    // Create new user in MongoDB using Mongoose
    try {
      console.log('💾 API: Creating new user in database...');
      const newUser = new User(userData);
      const savedUser = await newUser.save();
      console.log('✅ API: User successfully saved to database');
      console.log(`👤 API: User ID: ${savedUser._id}, Type: ${savedUser.userType}`);
      
      // Return a success response with sanitized user data
      const userResponse = savedUser.toObject();
      delete userResponse._id; // Remove internal MongoDB ID
      
      return NextResponse.json(
        { 
          message: 'User registered successfully',
          user: userResponse
        }, 
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError) {
        // Handle validation errors
        console.error('❌ API: Validation error occurred:', error.message);
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return NextResponse.json(
          { message: 'Validation error', errors: validationErrors }, 
          { status: 400 }
        );
      }
      console.error('❌ API: Database operation failed:', error);
      throw error; // Re-throw other errors to be caught by the outer catch
    }

  } catch (error) {
    console.error('❌ API: Signup process failed:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred' }, 
      { status: 500 }
    );
  }
}