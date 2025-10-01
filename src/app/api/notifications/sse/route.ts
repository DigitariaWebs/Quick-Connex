import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrManager } from '@/lib/auth-middleware';
import { NotificationSSEService } from '@/lib/notification-sse-service';

// GET /api/notifications/sse - Server-Sent Events endpoint for real-time notifications
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

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

        // Register this connection with the SSE service
        const sseService = NotificationSSEService.getInstance();
        sseService.addConnection(userId, controller, encoder);

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
            sseService.removeConnection(userId);
          }
        }, 30000);

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          console.log(`SSE connection closed for user ${userId}`);
          clearInterval(heartbeatInterval);
          sseService.removeConnection(userId);
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

