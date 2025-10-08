import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrManager } from '@/lib/auth/auth-middleware';

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
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const initialMessage = `data: ${JSON.stringify({
          type: 'connection',
          message: 'Connected to notification stream',
          userId,
          userType,
          timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(encoder.encode(initialMessage));

        // Log connection for debugging
        console.log(`🔗 SSE Endpoint: User ${userId} (${userType}) connected to SSE stream`);

        // Send heartbeat every 30 seconds to keep connection alive
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeat = `data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            })}\n\n`;
            controller.enqueue(encoder.encode(heartbeat));
          } catch (error) {
            console.error('Error sending heartbeat:', error);
            clearInterval(heartbeatInterval);
          }
        }, 30000);

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          console.log(`SSE connection closed for user ${userId}`);
          clearInterval(heartbeatInterval);
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

