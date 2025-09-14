import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    // Connect to MongoDB
    console.log('🔄 API: Attempting to connect to MongoDB...');
    await dbConnect();
    console.log('✅ API: MongoDB connection established');

    // Parse the request body
    const { email, password } = await request.json();

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    console.log(`🔍 API: Looking up user with email: ${email}`);
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log('❌ API: User not found');
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Validate password
    if (!password || password.trim().length === 0) {
      console.log('❌ API: Password is required');
      return NextResponse.json(
        { message: 'Password is required' },
        { status: 400 }
      );
    }

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ API: Invalid password');
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('✅ API: Password validated successfully');

    // Create a session or token
    // For now, just return the user without sensitive data
    console.log('✅ API: Login successful');
    
    const userResponse = user.toObject();
    // Remove any sensitive fields
    delete userResponse.password;
    
    return NextResponse.json({
      message: 'Login successful',
      user: userResponse
    });
    
  } catch (error) {
    console.error('❌ API: Login failed:', error);
    return NextResponse.json(
      { message: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
