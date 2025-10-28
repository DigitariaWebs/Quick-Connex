/**
 * Server Initialization
 * 
 * Main server entry point that starts the Express application.
 * Handles server configuration, database connections, and graceful shutdown.
 */

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import http from 'http';
import { createApp, setupGracefulShutdown } from './app';
import { connectDatabase, disconnectDatabase } from './src/lib/database';

/**
 * Server configuration
 */
const PORT = parseInt(process.env['PORT'] || '3001', 10);
const HOST = process.env['HOST'] || 'localhost';
const NODE_ENV = process.env['NODE_ENV'] || 'development';

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    console.log('🚀 Starting Patients Management Backend Server...');
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`Port: ${PORT}`);
    console.log(`Host: ${HOST}`);

    // Connect to database
    console.log('📊 Connecting to database...');
    await connectDatabase();
    console.log('✅ Database connected successfully');

    // Create Express app
    console.log('⚙️  Configuring Express application...');
    const app = createApp();
    console.log('✅ Express application configured');

    // Create HTTP server
    const server = http.createServer(app);

    // Setup graceful shutdown
    setupGracefulShutdown(app, server, disconnectDatabase);

    // Start listening
    server.listen(PORT, HOST, () => {
      console.log('🎉 Server started successfully!');
      console.log(`📍 Server running at: http://${HOST}:${PORT}`);
      console.log(`🏥 Health check: http://${HOST}:${PORT}/health`);
      console.log(`📡 API endpoint: http://${HOST}:${PORT}/api`);
      
      if (NODE_ENV === 'development') {
        console.log('\n🔧 Development mode enabled');
        console.log('📝 Logging: Morgan + Request Logger');
        console.log('🛡️  Security: Helmet + CORS enabled');
        console.log('⚡ Rate limiting: 100 requests per 15 minutes');
      }
      
      console.log('\n⏹️  Press Ctrl+C to stop the server');
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = `Port ${PORT}`;

      switch (error.code) {
        case 'EACCES':
          console.error(`❌ ${bind} requires elevated privileges`);
          process.exit(1);
        case 'EADDRINUSE':
          console.error(`❌ ${bind} is already in use`);
          process.exit(1);
        default:
          throw error;
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Initialize and start the server
 */
if (require.main === module) {
  startServer();
}

export { startServer };
