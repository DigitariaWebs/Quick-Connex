import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { SessionManager } from '@/lib/session/SessionManager';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Starting user verification...');
    
    // Get current user from JWT token
    const tokenPayload = await getCurrentUser();
    
    if (!tokenPayload || !tokenPayload.sessionId) {
      console.log('❌ API: User not authenticated - no session ID');
      return NextResponse.json(
        { 
          success: false,
          error: 'Not authenticated',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    // Validate session using SessionManager
    const result = await SessionManager.validateSession(tokenPayload.sessionId);
    
    if (!result.success) {
      console.log('❌ API: Session validation failed:', result.error);
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Session validation failed',
          code: 'SESSION_INVALID'
        },
        { status: 401 }
      );
    }

    console.log('✅ API: User authenticated successfully');
    
    return NextResponse.json({
      success: true,
      user: result.user,
      session: result.session
    });
    
  } catch (error) {
    console.error('❌ API: User verification failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'An error occurred during verification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}