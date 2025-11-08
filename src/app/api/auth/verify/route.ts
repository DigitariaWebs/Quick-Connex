import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromCookies, handleAuthError, verifyToken } from '@/lib/auth';
import { DatabaseService } from '@/lib/database';
import User from '@/models/User';
import { SessionService } from '@/lib/auth/sessions/SessionService';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Starting user verification...');
    
    // First check if token exists
    const token = await getTokenFromCookies();
    if (!token) {
      console.log('🔍 API: No authentication token found');
      return NextResponse.json(
        { 
          success: false,
          error: 'Not authenticated',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }
    
    // Verify JWT token (middleware already did this, but we do it again for safety)
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        },
        { status: 401 }
      );
    }
    
    // Get user from database
    const user = await DatabaseService.findById(User, payload.userId);
    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }
    
    // Convert user to plain object to avoid Mongoose document issues
    const userObject = user.toObject ? user.toObject() : user;
    
    // Try to get session data if sessionId exists, but don't fail if it doesn't
    let session = null;
    if (payload.sessionId) {
      try {
        const validation = await SessionService.validateSession(payload.sessionId);
        if (validation.valid && validation.session) {
          session = {
            sessionId: validation.session.sessionId,
            expiresAt: validation.session.expiresAt.toISOString(),
            lastAccessedAt: validation.session.lastAccessedAt.toISOString(),
            securityRisk: validation.securityRisk || 'low',
            isNewDevice: validation.session.securityContext?.isNewDevice || false,
            isNewLocation: validation.session.securityContext?.isNewLocation || false,
            sessionAge: validation.session.sessionAge || 0,
            remainingTime: validation.session.remainingTime || 0
          };
        }
      } catch (sessionError) {
        // Session validation failed, but that's okay - we still return user data
        // Middleware already verified the JWT token, so user is authenticated
        console.log('⚠️ API: Session validation failed, but continuing with user data:', sessionError);
      }
    }
    
    console.log('✅ API: User verified successfully');
    
    return NextResponse.json({
      success: true,
      user: {
        _id: (userObject._id as any).toString(),
        email: userObject.email,
        userType: userObject.userType,
        firstName: userObject.firstName,
        lastName: userObject.lastName,
        phone: userObject.phone || '',
        status: userObject.status,
        createdAt: userObject.createdAt,
        updatedAt: userObject.updatedAt
      },
      session: session,
      token: token // Include token for Socket.io authentication
    });
    
  } catch (error) {
    console.error('❌ API: Verification error:', error);
    return handleAuthError(error);
  }
}