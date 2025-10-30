import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check if user is already logged out by checking for auth token
    const { getTokenFromCookies } = await import('@/lib/auth');
    const token = await getTokenFromCookies();
    
    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No authentication token found',
          code: 'NO_TOKEN'
        },
        { status: 401 }
      );
    }

    // Authenticate user
    const { user, session } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    const result = await AuthService.refreshSession(session.sessionId);

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      session: result.session,
      token: result.token,
      message: 'Session refreshed successfully'
    });
    
    // Set the new JWT token in the cookie
    if (result.token) {
      response.cookies.set('auth-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 // 24 hours
      });
    }
    
    return response;
    
  } catch (error) {
    console.error('❌ Session refresh failed:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Authentication required' || 
          error.message === 'Invalid token' ||
          error.message.includes('Session validation failed') ||
          error.message.includes('Session not found') ||
          error.message.includes('Session expired')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Session invalid or expired',
            code: 'SESSION_INVALID',
            shouldRedirect: true
          },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
