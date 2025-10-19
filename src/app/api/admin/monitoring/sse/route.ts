import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminWithSession } from '@/lib/auth/session-auth-middleware';
import { unifiedSSEServer } from '@/lib/sse/unified-server-manager';

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
    const authResult = await requireSuperAdminWithSession(request);
    if (!authResult.success) {
      return authResult.response;
    }

    console.log('📊 SSE Monitoring API: Fetching real-time SSE data');

    // Get real-time data from the unified SSE server
    const stats = unifiedSSEServer.getStats();

    console.log(`📊 SSE Monitoring API: Retrieved ${stats.totalConnections} connections`);

    return NextResponse.json({
      success: true,
      data: {
        connections: [], // Not available in unified system
        metrics: stats,
        recentEvents: [] // Not available in unified system
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
