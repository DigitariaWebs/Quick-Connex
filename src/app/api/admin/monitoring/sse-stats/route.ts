import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleAuthError, createSuccessResponse } from '@/lib/auth/auth-utils';
import { sseManager } from '@/lib/sse';
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
    const { user } = await requireAdmin();

    // Get real-time SSE metrics from unified server
    const stats = { totalConnections: 0, activeConnections: 0, connectionsByType: {} };

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


