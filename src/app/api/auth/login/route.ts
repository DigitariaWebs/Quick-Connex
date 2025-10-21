import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth/jwt';
import { sanitizeUserAgent } from '@/lib/security/data-privacy';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Login: Starting login process');
    await dbConnect();
    console.log('🔐 Login: Database connected');

    const { email, password } = await request.json();
    console.log('🔐 Login: Email:', email);

    // Extract IP address and user agent
    const ipAddress = request.ip || 
      request.headers.get('x-forwarded-for') || 
      request.headers.get('x-real-ip') || 
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    console.log('🔐 Login: IP:', ipAddress, 'User-Agent:', userAgent);

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

    // Check if account is locked
    if (user.isAccountLocked()) {
      console.log('🔐 Login: Account is locked');
      return NextResponse.json(
        { 
          message: 'Account is temporarily locked due to multiple failed login attempts',
          lockedUntil: user.accountLockedUntil
        },
        { status: 423 }
      );
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('🔐 Login: Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      // Record failed login attempt
      await user.recordLogin(ipAddress, userAgent, false);
      console.log('🔐 Login: Failed login recorded');
      
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is approved
    if (user.status !== 'approved') {
      // Record failed login attempt for unapproved users
      await user.recordLogin(ipAddress, userAgent, false);
      console.log('🔐 Login: Unapproved user login attempt recorded');
      
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
    
    // Sanitize user agent for privacy
    const sanitizedUserAgent = sanitizeUserAgent(userAgent);
    
    // Parse user agent for better device info (minimal data)
    const parseUserAgent = (userAgent: string) => {
      const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
      const isChrome = /Chrome/i.test(userAgent);
      const isFirefox = /Firefox/i.test(userAgent);
      const isSafari = /Safari/i.test(userAgent) && !isChrome;
      const isWindows = /Windows/i.test(userAgent);
      const isMac = /Mac/i.test(userAgent);
      const isLinux = /Linux/i.test(userAgent);
      
      return {
        userAgent: sanitizedUserAgent, // Use sanitized version
        platform: isMobile ? 'mobile' : 'web',
        browser: isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : 'Unknown',
        browserVersion: '1.0', // Generic version for privacy
        os: isWindows ? 'Windows' : isMac ? 'macOS' : isLinux ? 'Linux' : 'Unknown',
        osVersion: '1.0', // Generic version for privacy
        deviceType: isMobile ? 'mobile' : 'desktop',
        timezone: 'UTC',
        language: 'en-US'
      };
    };

    const deviceInfo = parseUserAgent(userAgent);

    // Create session document
    const session = new Session({
      sessionId,
      userId: user._id,
      deviceInfo,
      ipAddress,
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
    
    // Record successful login
    await user.recordLogin(ipAddress, userAgent, true);
    console.log('🔐 Login: Successful login recorded');
    
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