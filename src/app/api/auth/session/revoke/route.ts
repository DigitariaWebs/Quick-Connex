import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { SessionManager } from '@/lib/session/SessionManager';

export async function DELETE(request: NextRequest) {
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

    const success = await SessionManager.revokeSession(tokenPayload.sessionId);

    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to revoke session' 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session revoked successfully'
    });
    
  } catch (error) {
    console.error('❌ Session revocation failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to revoke session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
