import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { signToken, setAuthCookie } from '@/lib/jwt';
import { rateLimit } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per 15 minutes
    const rateLimitResult = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
    })(request);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          message: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          }
        }
      );
    }

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

    // Check user approval status
    if (user.status === 'pending') {
      console.log('⏳ API: User account is pending approval');
      return NextResponse.json(
        { 
          message: 'Your account is pending approval. You will receive an email notification once approved.',
          status: 'pending'
        },
        { status: 403 }
      );
    }

    if (user.status === 'rejected') {
      console.log('❌ API: User account has been rejected');
      return NextResponse.json(
        { 
          message: 'Your account registration has been rejected. Please contact support for more information.',
          status: 'rejected',
          rejectionReason: user.rejectionReason
        },
        { status: 403 }
      );
    }

    // Create a session or token
    // For now, just return the user without sensitive data
    console.log('✅ API: Login successful');
    
    // Create JWT token
    const token = await signToken({
      userId: (user._id as any).toString(),
      email: user.email,
      userType: user.userType,
    });

    // Set secure HTTP-only cookie
    await setAuthCookie(token);
    
    const userResponse = user.toObject();
    // Remove any sensitive fields
    const { password: _, ...userWithoutPassword } = userResponse;
    
    return NextResponse.json({
      message: 'Login successful',
      user: userWithoutPassword,
      success: true
    });
    
  } catch (error) {
    console.error('❌ API: Login failed:', error);
    return NextResponse.json(
      { message: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
