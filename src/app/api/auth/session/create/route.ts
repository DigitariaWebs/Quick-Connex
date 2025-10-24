import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

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

    const result = await AuthService.createSession(
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
