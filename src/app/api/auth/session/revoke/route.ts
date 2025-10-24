import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    // Get current user from JWT token
    const { user, session } = await AuthService.requireAuth(request, {
      requireSession: true
    });

    // Try to get sessionId from request body, fallback to current session
    let sessionId: string;
    try {
      const body = await request.json();
      sessionId = body.sessionId;
    } catch (jsonError) {
      // If JSON parsing fails, use current session ID
      sessionId = session.sessionId;
    }
    
    if (!sessionId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Session ID is required' 
        },
        { status: 400 }
      );
    }

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
