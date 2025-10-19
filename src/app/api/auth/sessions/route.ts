import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { SessionManager } from '@/lib/session/SessionManager';

export async function GET(request: NextRequest) {
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

    const sessions = await SessionManager.getUserSessions(tokenPayload.userId);

    return NextResponse.json({
      success: true,
      sessions,
      totalSessions: sessions.length
    });
    
  } catch (error) {
    console.error('❌ Failed to retrieve sessions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}