import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrManager } from '@/lib/auth/auth-middleware';
import { registerClient, unregisterClient } from '@/lib/notifications/notification-broadcaster-global';

// GET /api/notifications/sse - Server-Sent Events endpoint for real-time notifications
export async function GET(request: NextRequest) {
  try {
    console.log('🔗 SSE Endpoint: Request received');
    console.log('🔗 SSE Endpoint: Cookies:', request.cookies.getAll());
    
    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      console.log('🔗 SSE Endpoint: Authentication failed');
      return authResult.response;
    }
    
    console.log('🔗 SSE Endpoint: Authentication successful for user:', authResult.user._id);

    const userId = authResult.user._id;
    const userType = authResult.user.userType;

    // Create SSE response
    const stream = new ReadableStream({
      start(controller) {
        // Register this client with the notification broadcaster
        registerClient(userId, userType, controller);

        // Log connection for debugging
        console.log(`🔗 SSE Endpoint: User ${userId} (${userType}) connected to SSE stream`);

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          console.log(`SSE connection closed for user ${userId}`);
          unregisterClient(userId);
        });
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error('Error setting up SSE connection:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

