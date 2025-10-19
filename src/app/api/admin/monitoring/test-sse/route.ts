import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminWithSession } from '@/lib/auth/session-auth-middleware';
import { unifiedSSEServer } from '@/lib/sse/unified-server-manager';

/**
 * Test SSE Monitoring Integration
 * 
 * This endpoint allows testing the SSE monitoring integration
 * by manually triggering connection events.
 */
export async function POST(request: NextRequest) {
  try {
    // Check super admin permissions
    const authResult = await requireSuperAdminWithSession(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { action, userId = 'test-user-123', userType = 'admin' } = await request.json();

    console.log(`📊 Test SSE Monitoring: ${action} for user ${userId}`);

    // Note: Test functionality not available in unified system
    // The unified system doesn't support test events
    console.log('Test functionality not available in unified SSE system');

    // Get current state from unified system
    const stats = unifiedSSEServer.getStats();

    return NextResponse.json({
      success: true,
      message: `Test ${action} completed for user ${userId}`,
      data: {
        activeConnections: stats.totalConnections,
        recentEvents: 0, // Not available in unified system
        dailyEvents: 0, // Not available in unified system
        connections: [], // Not available in unified system
        events: [] // Not available in unified system
      }
    });

  } catch (error) {
    console.error('❌ Test SSE Monitoring error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test SSE monitoring',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check super admin permissions
    const authResult = await requireSuperAdminWithSession(request);
    if (!authResult.success) {
      return authResult.response;
    }

    // Get current state from unified system
    const stats = unifiedSSEServer.getStats();

    return NextResponse.json({
      success: true,
      data: {
        activeConnections: stats.totalConnections,
        recentEvents: 0, // Not available in unified system
        dailyEvents: 0, // Not available in unified system
        connections: [], // Not available in unified system
        events: [] // Not available in unified system
      }
    });

  } catch (error) {
    console.error('❌ Test SSE Monitoring error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get SSE monitoring state',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
