// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { AsyncLocalStorage } from 'async_hooks';
import os from 'os';
import { DatabaseService } from './src/lib/database';

// Create AsyncLocalStorage instance
const asyncLocalStorage = new AsyncLocalStorage();

// Configuration
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Global references for cleanup
let globalSocketServer: any = null;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function startServer() {
  try {
    console.log('🚀 CUSTOM SERVER STARTING');
    console.log('==================================================');
    console.log(`📅 Started at: ${new Date().toLocaleString()}`);
    console.log(`🌍 Environment: ${dev ? 'development' : 'production'}`);
    console.log(`🌐 Host: ${hostname}:${port}`);
    console.log('==================================================');

    // Initialize database
    console.log('🔄 Database: Initializing connection...');
    await DatabaseService.getInstance();
    console.log('✅ Database: Connected successfully');

    // Prepare Next.js app
    await app.prepare();
    console.log('✅ Next.js app prepared successfully');

    // Create HTTP server with AsyncLocalStorage wrapper
    const server = createServer((req, res) => {
      // Wrap each request in AsyncLocalStorage context
      asyncLocalStorage.run(new Map(), () => {
        // Store request-specific data if needed
        const store = asyncLocalStorage.getStore() as Map<string, any>;
        store.set('req', req);
        store.set('res', res);
        store.set('requestId', `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

        // Parse URL
        const parsedUrl = parse(req.url!, true);

        // Handle request with Next.js
        handle(req, res, parsedUrl);
      });
    });

    // Initialize Socket.io
    try {
      console.log('🔄 Socket.io: Initializing server...');
      const { SocketServer } = await import('./src/lib/realtime/server');
      globalSocketServer = new SocketServer();
      await globalSocketServer.initialize(server);
      console.log('✅ Socket.io server initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Socket.io server:', error);
      console.log('⚠️  Server will continue without Socket.io functionality');
    }

    // Start listening
    server.listen(port, hostname, () => {
      console.log(`🚀 Server started on ${hostname}:${port}`);
      console.log(`🎉 Server ready on http://${hostname}:${port}`);
      console.log(`🔗 Access your app at: http://${hostname}:${port}`);
      
      if (globalSocketServer) {
        console.log('🔌 Real-time notifications system ready with Socket.io');
      }

      // Network access info
      const networkIP = getLocalNetworkIP();
      console.log('📡 NETWORK ACCESS:');
      console.log('==================================================');
      console.log(`🏠 Local:    http://${hostname}:${port}`);
      if (networkIP) {
        console.log(`🌐 Network:  http://${networkIP}:${port}`);
        console.log(`📱 Mobile:   http://${networkIP}:${port}`);
      }
      console.log('==================================================');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await cleanup();
    process.exit(1);
  }
}

function getLocalNetworkIP(): string | null {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const networkInterfaces = interfaces[name];
    if (!networkInterfaces) continue;
    for (const iface of networkInterfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

async function cleanup(): Promise<void> {
  try {
    console.log('🧹 Server: Cleaning up resources...');
    
    if (globalSocketServer) {
      console.log('🔄 Socket.io: Shutting down...');
      await globalSocketServer.shutdown();
      globalSocketServer = null;
      console.log('✅ Socket.io: Shutdown completed');
    }
    
    if (DatabaseService.isConnected()) {
      console.log('🔄 Database: Disconnecting...');
      await DatabaseService.disconnect();
      console.log('✅ Database: Disconnected successfully');
    }
    
    console.log('✅ Server: Cleanup completed');
  } catch (error) {
    console.error('❌ Server: Error during cleanup:', error);
  }
}

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('📋 SIGTERM received, shutting down gracefully...');
  await cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📋 SIGINT received, shutting down gracefully...');
  await cleanup();
  process.exit(0);
});

// Start the server
startServer();
