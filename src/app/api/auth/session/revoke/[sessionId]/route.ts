import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { handleAuthError } from '@/lib/auth/auth-error-handler';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Authenticate user first
    const { user } = await AuthService.requireAuth(request, {
      requireSession: true
    });

    // Revoke the specified session
    const success = await AuthService.revokeSession(params.sessionId);

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
    return handleAuthError(error);
  }
}
