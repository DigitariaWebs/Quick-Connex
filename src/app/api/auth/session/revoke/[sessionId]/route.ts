import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { handleAuthError } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  try {
    // Authenticate user first
    const { user } = await AuthService.requireAuth(request, {
      requireSession: true
    });

    // Revoke the specified session
    const success = await AuthService.revokeSession(sessionId);

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
