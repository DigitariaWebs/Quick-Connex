import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrManagerWithSession } from '@/lib/auth/session-auth-middleware';
import { unifiedSSEServer } from '@/lib/sse/unified-server-manager';

// GET /api/notifications/status - Get SSE connection status and statistics
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManagerWithSession(request);
    if (!authResult.success) {
      return authResult.response;
    }

    console.log('📊 Status API: Getting notification broadcaster stats...');
    const stats = unifiedSSEServer.getStats();
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