import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { SessionManager } from '@/lib/session/SessionManager';
import { SessionSecurity } from '@/lib/session/SessionSecurity';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { email, password } = await request.json();

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get client IP for rate limiting
    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Check rate limiting
    const rateLimitCheck = await SessionSecurity.checkRateLimit(email, ipAddress);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          message: rateLimitCheck.reason,
          retryAfter: rateLimitCheck.retryAfter
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitCheck.retryAfter?.toString() || '900'
          }
        }
      );
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Record failed attempt even for non-existent users
      await SessionSecurity.recordFailedAttempt(email, ipAddress);
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      // Record failed attempt
      await SessionSecurity.recordFailedAttempt(email, ipAddress);
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check user approval status
    if (user.status !== 'approved') {
      return NextResponse.json(
        { 
          message: 'Your account is not approved yet',
          status: user.status
        },
        { status: 403 }
      );
    }

    // Get client information
    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Simple device info
    const deviceInfo = {
      userAgent,
      platform: 'web',
      browser: 'unknown',
      browserVersion: 'unknown',
      os: 'unknown',
      osVersion: 'unknown',
      deviceType: 'desktop',
      timezone: 'UTC',
      language: 'en-US'
    };

    // Create session using SessionManager
    const result = await SessionManager.createSession(
      user._id.toString(),
      deviceInfo,
      ipAddress
    );

    if (!result.success) {
      return NextResponse.json(
        { message: 'Session creation failed' },
        { status: 500 }
      );
    }

    console.log(`✅ Login successful for user ${user.email}`);

    return NextResponse.json({
      message: 'Login successful',
      user: result.user,
      session: result.session,
      success: true
    });
    
  } catch (error) {
    console.error('❌ Login failed:', error);
    return NextResponse.json(
      { message: 'An error occurred during login' },
      { status: 500 }
    );
  }
}