import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session/SessionManager';

export async function POST(request: NextRequest) {
  try {
    const { userId, deviceInfo, ipAddress, location } = await request.json();
    
    if (!userId || !deviceInfo || !ipAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: userId, deviceInfo, ipAddress' 
        },
        { status: 400 }
      );
    }

    const result = await SessionManager.createSession(
      userId,
      deviceInfo,
      ipAddress,
      location
    );

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
      user: result.user,
      message: 'Session created successfully'
    });
    
  } catch (error) {
    console.error('❌ Session creation failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
