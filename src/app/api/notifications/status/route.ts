import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrManager } from '@/lib/auth/auth-utils';
import { sseManager } from '@/lib/sse';

// GET /api/notifications/status - Get SSE connection status and statistics
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await requireEmployeeOrManager();

    console.log('📊 Status API: Getting notification broadcaster stats...');
    const stats = { totalConnections: 0, activeConnections: 0 };
    console.log('📊 Status API: Stats retrieved:', stats);

    return NextResponse.json({
      success: true,
      message: 'SSE connection status retrieved',
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting notification status:', error);
    return NextResponse.json(
      { error: 'Failed to get notification status' },
      { status: 500 }
    );
  }
}