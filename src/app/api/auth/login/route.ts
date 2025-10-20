import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Login: Starting login process');
    await dbConnect();
    console.log('🔐 Login: Database connected');

    const { email, password } = await request.json();
    console.log('🔐 Login: Email:', email);

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('🔐 Login: User found:', !!user);

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('🔐 Login: Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is approved
    if (user.status !== 'approved') {
      return NextResponse.json(
        { 
          message: 'Account not approved',
          status: user.status
        },
        { status: 403 }
      );
    }

    console.log('🔐 Login: User approved, creating session');

    // Create a proper session in the database
    const { default: Session } = await import('@/models/Session');
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create session document
    const session = new Session({
      sessionId,
      userId: user._id,
      deviceInfo: {
        userAgent: 'test',
        platform: 'web',
        browser: 'test',
        browserVersion: '1.0',
        os: 'test',
        osVersion: '1.0',
        deviceType: 'desktop',
        timezone: 'UTC',
        language: 'en-US'
      },
      ipAddress: '127.0.0.1',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      isActive: true,
      revoked: false,
      sessionType: 'web',
      refreshToken: `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      securityContext: {
        fingerprint: `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        riskScore: 0,
        isNewDevice: true,
        isNewLocation: true,
        suspiciousActivity: false
      }
    });
    
    await session.save();
    console.log('🔐 Login: Session saved to database');
    
    // Create JWT token
    const jwtToken = await signToken({
      userId: (user._id as any).toString(),
      email: user.email,
      userType: user.userType,
      sessionId: sessionId
    });

    console.log('🔐 Login: JWT token created');

    // Create response with session data
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        _id: user._id,
        email: user.email,
        userType: user.userType,
        firstName: user.firstName,
        lastName: user.lastName
      },
      session: {
        sessionId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      success: true
    });

    // Set auth cookie
    response.cookies.set('auth-token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    console.log('✅ Login: Login successful for user', user.email);

    return response;
    
  } catch (error) {
    console.error('❌ Login failed:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        message: 'An error occurred during login',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}