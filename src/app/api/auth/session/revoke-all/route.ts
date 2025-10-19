import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { SessionManager } from '@/lib/session/SessionManager';

export async function DELETE(request: NextRequest) {
  try {
    // Get current user from JWT token
    const tokenPayload = await getCurrentUser();
    
    if (!tokenPayload || !tokenPayload.userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Not authenticated',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    const success = await SessionManager.revokeAllUserSessions(tokenPayload.userId);

    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to revoke all sessions' 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'All sessions revoked successfully'
    });
    
  } catch (error) {
    console.error('❌ Revoke all sessions failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to revoke all sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
