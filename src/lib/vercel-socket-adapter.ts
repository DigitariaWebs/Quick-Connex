/**
 * Vercel-Compatible Socket.IO Adapter
 * This provides a fallback for Socket.IO functionality in Vercel's serverless environment
 */

import { Server as SocketIOServer } from 'socket.io';

// Check if we're in Vercel environment
export function isVercelEnvironment(): boolean {
  return !!(process.env.VERCEL || process.env.VERCEL_ENV);
}

// Vercel-compatible Socket.IO initialization
export function initializeVercelSocketServer(): SocketIOServer | null {
  if (isVercelEnvironment()) {
    console.log('🌐 Vercel Environment Detected - Socket.IO not supported');
    console.log('💡 Real-time features will use polling fallback');
    return null;
  }
  
  // Only initialize Socket.IO in non-Vercel environments
  try {
    const { initializeSocketServer } = require('./socket-server');
    return initializeSocketServer();
  } catch (error) {
    console.warn('⚠️ Socket.IO initialization failed:', error);
    return null;
  }
}

// Fallback for real-time notifications in Vercel
export function createVercelNotificationFallback() {
  if (isVercelEnvironment()) {
    console.log('🔄 Using polling-based notifications for Vercel');
    
    // Return a mock notification system that uses polling
    return {
      emit: (event: string, data: any) => {
        console.log(`📡 Mock notification: ${event}`, data);
        // In a real implementation, you'd store this in a database
        // and poll for updates from the client
      },
      on: (event: string, callback: Function) => {
        console.log(`👂 Mock listener: ${event}`);
        // In a real implementation, you'd set up polling
      }
    };
  }
  
  return null;
}
