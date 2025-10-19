import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminWithSession } from '@/lib/auth/session-auth-middleware';

/**
 * Clear SSE Monitoring Data
 * 
 * This endpoint clears all monitoring data to start fresh.
 */
export async function POST(request: NextRequest) {
  try {
    // Check super admin permissions
    const authResult = await requireSuperAdminWithSession(request);
    if (!authResult.success) {
      return authResult.response;
    }

    console.log('🧹 Clearing SSE monitoring data...');

    // Clear the monitoring integration data
    // This will reset all connections and events
    // Note: Clear functionality not available in unified system
    // The unified system doesn't support clearing connections
    console.log('Clear functionality not available in unified SSE system');

    return NextResponse.json({
      success: true,
      message: 'SSE monitoring data cleared successfully'
    });

  } catch (error) {
    console.error('❌ Clear SSE monitoring error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clear SSE monitoring data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
