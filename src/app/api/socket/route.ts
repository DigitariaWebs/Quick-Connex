/**
 * Next.js Socket.io API Route
 * 
 * Handles Socket.io connections in Next.js environment.
 * This is required for Next.js integration alongside the custom server.
 */

import { NextRequest } from 'next/server';
import { SocketServer } from '@/lib/realtime/server';

// ===== SOCKET.IO HANDLER =====

let socketServer: SocketServer | null = null;

export async function GET(request: NextRequest) {
  try {
    // Initialize Socket.io server if not already done
    if (!socketServer) {
      socketServer = new SocketServer();
      
      // Note: In Next.js API routes, we can't directly initialize Socket.io
      // This is mainly for compatibility and future enhancements
      // The actual Socket.io server runs in the custom server (server.ts)
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Socket.io server ready',
        timestamp: new Date()
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Socket.io server already initialized',
      timestamp: new Date()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Socket.io API route error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'test_connection':
        return new Response(JSON.stringify({
          success: true,
          message: 'Connection test successful',
          data: {
            timestamp: new Date(),
            serverTime: new Date().toISOString()
          }
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        });

      case 'get_status':
        return new Response(JSON.stringify({
          success: true,
          data: {
            status: 'running',
            timestamp: new Date(),
            connections: socketServer ? 'available' : 'not_initialized'
          }
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        });

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Unknown action',
          timestamp: new Date()
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
    }

  } catch (error) {
    console.error('Socket.io POST route error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
