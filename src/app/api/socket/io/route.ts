/**
 * Socket.io Initialization API Route
 * 
 * Initializes Socket.io server via singleton manager on first request.
 * Returns status information and handles errors gracefully.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSocketManager } from '@/lib/realtime/socket-manager';
import { log } from '@/lib/logging';

export async function GET(request: NextRequest) {
  try {
    const socketManager = getSocketManager();
    
    // Check if already initialized
    if (socketManager.isSocketInitialized()) {
      const status = socketManager.getStatus();
      log.debug('Socket.io server already initialized', status);
      
      return NextResponse.json({
        success: true,
        message: 'Socket.io server already initialized',
        initialized: true,
        status
      });
    }

    // Initialize Socket.io server
    log.info('Initializing Socket.io server via API route...');
    
    await socketManager.initialize();
    
    const status = socketManager.getStatus();
    log.info('Socket.io server initialized successfully via API route', status);

    return NextResponse.json({
      success: true,
      message: 'Socket.io server initialized successfully',
      initialized: true,
      status
    });

  } catch (error) {
    log.error('Failed to initialize Socket.io server via API route:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to initialize Socket.io server',
      error: error instanceof Error ? error.message : 'Unknown error',
      initialized: false
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Same as GET for initialization
  return GET(request);
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
  try {
    const socketManager = getSocketManager();
    const status = socketManager.getStatus();
    
    return new NextResponse(null, {
      status: status.initialized ? 200 : 503,
      headers: {
        'X-Socket-Initialized': status.initialized.toString(),
        'X-Socket-Server': status.hasSocketServer.toString(),
        'X-HTTP-Server': status.hasHttpServer.toString()
      }
    });
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}
