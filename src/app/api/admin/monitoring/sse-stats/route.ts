import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-middleware';
import { getRealTimeSSEMetrics, getRealTimeConnections } from '@/lib/notifications/sse-monitoring-service';
import { SSEStats } from '@/types/dashboard';

/**
 * GET /api/admin/monitoring/sse-stats
 * 
 * Returns real-time SSE connection statistics:
 * - Active connections count
 * - Connections by user type
 * - Message delivery metrics
 * - Connection history
 * - Connection quality breakdown
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin permissions
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return authResult.response;
    }

    // Get real-time SSE metrics
    const metrics = getRealTimeSSEMetrics();
    const connections = getRealTimeConnections();

    // Calculate reconnection rate
    const totalReconnections = connections.reduce((sum, conn) => sum + (conn.reconnectAttempts || 0), 0);
    const reconnectionRate = connections.length > 0 
      ? (totalReconnections / connections.length) * 100 
      : 0;

    const sseStats: SSEStats = {
      activeConnections: metrics.activeConnections,
      totalConnections: metrics.totalConnections,
      connectionsByType: metrics.connectionsByType,
      connectionQuality: metrics.connectionQuality,
      averageConnectionDuration: metrics.averageConnectionDuration,
      eventsPerMinute: metrics.eventsPerMinute,
      reconnectionRate: parseFloat(reconnectionRate.toFixed(2))
    };

    return NextResponse.json({
      success: true,
      data: sseStats
    });
  } catch (error) {
    console.error('❌ Error fetching SSE stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch SSE statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


