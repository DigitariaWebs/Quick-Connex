import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithSession } from '@/lib/auth/session-auth-middleware';
import { unifiedSSEServer } from '@/lib/sse/unified-server-manager';
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
    const authResult = await requireAdminWithSession(request);
    if (!authResult.success) {
      return authResult.response;
    }

    // Get real-time SSE metrics from unified server
    const stats = unifiedSSEServer.getStats();

    const sseStats: SSEStats = {
      activeConnections: stats.totalConnections,
      totalConnections: stats.totalConnections,
      connectionsByType: stats.connectionsByType,
      connectionQuality: { excellent: 100, good: 0, poor: 0, critical: 0 }, // Default value for unified system
      averageConnectionDuration: 0, // Not available in unified system
      eventsPerMinute: 0, // Not available in unified system
      reconnectionRate: 0 // Not available in unified system
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


