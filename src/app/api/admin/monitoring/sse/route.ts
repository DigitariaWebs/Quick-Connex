import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin-middleware';
import { 
  getRealTimeSSEMetrics, 
  getRealTimeConnections, 
  getRecentConnectionEvents,
  updateAllConnectionQualities,
  SSEConnection,
  SSEMetrics,
  ConnectionEvent
} from '@/lib/notifications/sse-monitoring-service';

/**
 * SSE Connections Monitoring API Endpoint
 * 
 * Provides real-time monitoring of Server-Sent Events connections including:
 * - Live connection count and status
 * - Connection quality metrics
 * - Reconnection attempts and failures
 * - Connection duration tracking
 * - Real-time connection events
 * 
 * This endpoint now uses REAL data from the actual SSE system instead of mock data.
 */

export async function GET(request: NextRequest) {
  try {
    // Check super admin permissions
    const authResult = await requireSuperAdmin(request);
    if (!authResult.success) {
      return authResult.response;
    }

    console.log('📊 SSE Monitoring API: Fetching real-time SSE data');

    // Update connection qualities based on current state
    updateAllConnectionQualities();

    // Get real-time data from the monitoring service
    const connections = getRealTimeConnections();
    const metrics = getRealTimeSSEMetrics();
    const recentEvents = getRecentConnectionEvents(20);

    console.log(`📊 SSE Monitoring API: Retrieved ${connections.length} connections, ${recentEvents.length} recent events`);

    return NextResponse.json({
      success: true,
      data: {
        connections,
        metrics,
        recentEvents
      }
    });

  } catch (error) {
    console.error('❌ SSE monitoring API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve SSE connection data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
