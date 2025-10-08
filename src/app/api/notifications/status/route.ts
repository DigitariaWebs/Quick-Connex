import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrManager, createErrorResponse, createSuccessResponse } from '@/lib/auth/auth-middleware';

// GET /api/notifications/status - Get simple connection status
export async function GET(request: NextRequest) {
  try {
    console.log('🌐 Request: GET /api/notifications/status');
    
    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    // Return basic status info since we're using client-side global SSE manager
    console.log(`📊 CONNECTION STATUS API - Basic status requested`);
    
    return createSuccessResponse({
      message: 'Using client-side global SSE manager',
      timestamp: new Date().toISOString(),
      note: 'Connection status is handled by the global SSE manager on the client side'
    });

  } catch (error) {
    console.error('Error getting connection status:', error);
    return createErrorResponse('Failed to get connection status', 'STATUS_ERROR', 500);
  }
}
