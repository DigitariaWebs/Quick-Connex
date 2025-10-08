import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { rateLimit } from '@/lib/services/security';

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
          message: 'Too many password reset attempts. Please try again later.',
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
    const { token, password } = await request.json();

    // Validate required fields
    if (!token || !password) {
      return NextResponse.json(
        { message: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Find user with valid reset token
    console.log(`🔍 API: Looking up user with reset token`);
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('❌ API: Invalid or expired reset token');
      return NextResponse.json(
        { message: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if user is approved
    if (user.status !== 'approved') {
      console.log('❌ API: User account is not approved');
      return NextResponse.json(
        { message: 'Account is not approved for password reset' },
        { status: 403 }
      );
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log('✅ API: Password reset successfully');

    return NextResponse.json(
      { message: 'Password has been reset successfully' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('❌ API: Password reset failed:', error);
    return NextResponse.json(
      { message: 'An error occurred while resetting your password' },
      { status: 500 }
    );
  }
}
