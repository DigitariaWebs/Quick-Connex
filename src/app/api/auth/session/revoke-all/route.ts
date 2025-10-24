import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    // Get current user from JWT token
    const { user } = await AuthService.requireAuth(request, {
      requireSession: true
    });

    const success = await AuthService.revokeAllUserSessions(user._id.toString());

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
