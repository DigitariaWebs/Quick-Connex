import next from 'next';
import os from 'os';
import dotenv from 'dotenv';
import { DatabaseService } from './src/lib/database/DatabaseService';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// ===== TYPES =====

interface NetworkInterface {
  family: string;
  internal: boolean;
  address: string;
}

interface ServerConfig {
  dev: boolean;
  hostname: string;
  port: number;
}

// ===== CONFIGURATION =====

const config: ServerConfig = {
  dev: process.env.NODE_ENV !== 'production',
  hostname: 'localhost',
  port: parseInt(process.env.PORT || '3000', 10)
};

// ===== SERVER CONFIGURATION =====

// ===== UTILITY FUNCTIONS =====

/**
 * Get local network IP address
 */
function getLocalNetworkIP(): string {
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
  
  return 'localhost';
}

/**
 * Initialize database connection
 */
async function initializeDatabase(): Promise<void> {
  try {
    console.log('🔄 Database: Initializing connection...');
    await DatabaseService.connect();
    console.log('✅ Database: Connected successfully');
    
    // Log database health
    const health = await DatabaseService.getDatabaseHealth();
    console.log(`📊 Database: Health status - ${health.status}`);
    console.log(`📊 Database: Connection - ${health.connection.connected ? 'Connected' : 'Disconnected'}`);
    
  } catch (error) {
    console.error('❌ Database: Connection failed:', error);
    console.error('❌ Database: Error details:', error instanceof Error ? error.message : String(error));
    console.error('❌ Database: Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Exit process if database connection fails
    console.error('🚨 Server: Cannot start without database connection');
    process.exit(1);
  }
}

/**
 * Setup cleanup handlers
 */
function setupCleanupHandlers(): void {
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Server: Received SIGINT, shutting down gracefully...');
    await cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Server: Received SIGTERM, shutting down gracefully...');
    await cleanup();
    process.exit(0);
  });

  process.on('uncaughtException', async (error) => {
    console.error('\n🚨 Server: Uncaught exception:', error);
    await cleanup();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    console.error('\n🚨 Server: Unhandled rejection at:', promise, 'reason:', reason);
    await cleanup();
    process.exit(1);
  });
}

/**
 * Cleanup resources
 */
async function cleanup(): Promise<void> {
  try {
    console.log('🧹 Server: Cleaning up resources...');
    
    // Disconnect from database
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

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    console.log('\n🚀 CUSTOM SERVER STARTING');
    console.log('='.repeat(50));
    console.log(`📅 Started at: ${new Date().toLocaleString()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⚡ Bundler: Turbopack`);
    console.log(`🌐 Host: ${config.hostname}:${config.port}`);
    console.log('='.repeat(50) + '\n');

    // Initialize database first
    await initializeDatabase();

    // Create Next.js app
    const app = next({ 
      dev: config.dev, 
      hostname: config.hostname, 
      port: config.port 
    });

    // Prepare Next.js app
    await app.prepare();
    console.log('✅ Next.js app prepared successfully');
    console.log('🎉 Turbopack: First compilation completed - app is ready!');

    // Use Next.js built-in server
    const handle = app.getRequestHandler();

    // Start Next.js server
    console.log(`🚀 Starting server on ${config.hostname}:${config.port}`);

    console.log(`🎉 Server ready on http://${config.hostname}:${config.port}`);
    console.log('🔌 SSE notification system ready for real-time notifications');

    // Display network access information
    const networkIP = getLocalNetworkIP();
    console.log('\n📡 NETWORK ACCESS:');
    console.log('='.repeat(50));
    console.log(`🏠 Local:    http://localhost:${config.port}`);
    if (networkIP !== 'localhost') {
      console.log(`🌐 Network:  http://${networkIP}:${config.port}`);
      console.log(`📱 Mobile:   http://${networkIP}:${config.port}`);
    }
    console.log('='.repeat(50));
    console.log('💡 Share the Network URL with other devices on the same network');
    console.log('');

    // Log database status
    console.log('\n📊 DATABASE STATUS:');
    console.log('='.repeat(50));
    console.log(`🔗 Connected: ${DatabaseService.isConnected() ? '✅ Yes' : '❌ No'}`);
    if (DatabaseService.isConnected()) {
      const connectionState = DatabaseService.getConnectionState();
      console.log(`📈 State: ${connectionState.state}`);
      console.log(`📊 Collections: ${connectionState.collections}`);
    }
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error(`📋 Error: ${error instanceof Error ? error.message : String(error)}`);
    
    await cleanup();
    process.exit(1);
  }
}

// ===== MAIN EXECUTION =====

// Setup cleanup handlers
setupCleanupHandlers();

// Start the server
startServer().catch(async (error) => {
  console.error('🚨 Server: Failed to start:', error);
  await cleanup();
  process.exit(1);
});
