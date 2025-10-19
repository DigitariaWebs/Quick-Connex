import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { SessionManager } from '@/lib/session/SessionManager';

export async function POST(request: NextRequest) {
  try {
    // Get current user from JWT token
    const tokenPayload = await getCurrentUser();
    
    if (!tokenPayload || !tokenPayload.sessionId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Not authenticated',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    const result = await SessionManager.refreshSession(tokenPayload.sessionId);

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      session: result.session,
      message: 'Session refreshed successfully'
    });
    
  } catch (error) {
    console.error('❌ Session refresh failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to refresh session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
