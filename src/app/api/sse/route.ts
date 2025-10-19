import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { SessionManager } from '@/lib/session/SessionManager';

/**
 * Vercel-Compatible SSE Endpoint
 * 
 * Stateless SSE endpoint for transfer notifications only.
 * No server-side state management - just streams notifications.
 */

export async function GET(request: NextRequest) {
  try {
    // Get current user from JWT token
    const tokenPayload = await getCurrentUser();
    
    if (!tokenPayload || !tokenPayload.sessionId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Not authenticated',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    // Validate session using SessionManager
    const result = await SessionManager.validateSession(tokenPayload.sessionId);
    
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Session validation failed',
          code: 'SESSION_INVALID'
        },
        { status: 401 }
      );
    }
    
    const userId = result.user!._id;
    const userType = result.user!.userType;
    
    // Create stateless SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({ 
            type: 'connected', 
            userId, 
            userType,
            timestamp: new Date().toISOString()
          })}\n\n`
        ));

        // Heartbeat every 25 seconds (under Vercel's 30s limit)
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(
              `data: ${JSON.stringify({ 
                type: 'heartbeat', 
                timestamp: new Date().toISOString()
              })}\n\n`
            ));
          } catch (error) {
            clearInterval(heartbeat);
          }
        }, 25000);

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          console.log(`🔌 SSE Client disconnected: ${userId}`);
        });

        // Handle stream close
        request.signal.addEventListener('close', () => {
          clearInterval(heartbeat);
          console.log(`🔌 SSE Stream closed: ${userId}`);
        });
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
          ? process.env.ALLOWED_ORIGINS || 'https://yourdomain.com'
          : 'http://localhost:3000',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'Access-Control-Allow-Credentials': 'true',
      },
    });

  } catch (error) {
    console.error('❌ SSE endpoint error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}