import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin-middleware';
import { 
  trackConnectionEvent, 
  updateConnectionStatus, 
  getActiveConnections,
  getConnectionEvents,
  getDailyEventCount
} from '@/lib/notifications/sse-monitoring-integration';

/**
 * Test SSE Monitoring Integration
 * 
 * This endpoint allows testing the SSE monitoring integration
 * by manually triggering connection events.
 */
export async function POST(request: NextRequest) {
  try {
    // Check super admin permissions
    const authResult = await requireSuperAdmin(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { action, userId = 'test-user-123', userType = 'admin' } = await request.json();

    console.log(`📊 Test SSE Monitoring: ${action} for user ${userId}`);

    switch (action) {
      case 'connect':
        trackConnectionEvent(
          'connect',
          userId,
          `${userId}@example.com`,
          userType,
          'Test connection event',
          `conn_${userId}`
        );
        updateConnectionStatus(userId, 'connected', `${userId}@example.com`, userType);
        break;

      case 'disconnect':
        trackConnectionEvent(
          'disconnect',
          userId,
          `${userId}@example.com`,
          userType,
          'Test disconnection event',
          `conn_${userId}`
        );
        updateConnectionStatus(userId, 'disconnected');
        break;

      case 'heartbeat':
        trackConnectionEvent(
          'heartbeat',
          userId,
          `${userId}@example.com`,
          userType,
          'Test heartbeat event',
          `conn_${userId}`
        );
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: connect, disconnect, or heartbeat'
        }, { status: 400 });
    }

    // Get current state
    const activeConnections = getActiveConnections();
    const recentEvents = getConnectionEvents(10);
    const dailyEvents = getDailyEventCount();

    return NextResponse.json({
      success: true,
      message: `Test ${action} completed for user ${userId}`,
      data: {
        activeConnections: activeConnections.length,
        recentEvents: recentEvents.length,
        dailyEvents,
        connections: activeConnections,
        events: recentEvents
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
    const authResult = await requireSuperAdmin(request);
    if (!authResult.success) {
      return authResult.response;
    }

    // Get current state
    const activeConnections = getActiveConnections();
    const recentEvents = getConnectionEvents(10);
    const dailyEvents = getDailyEventCount();

    return NextResponse.json({
      success: true,
      data: {
        activeConnections: activeConnections.length,
        recentEvents: recentEvents.length,
        dailyEvents,
        connections: activeConnections,
        events: recentEvents
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
