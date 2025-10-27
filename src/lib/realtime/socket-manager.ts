/**
 * Socket.io Singleton Manager
 * 
 * Manages Socket.io server instance using singleton pattern with lazy initialization.
 * Uses standalone Socket.io server that runs alongside Next.js on the same port.
 */

import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { log } from '@/lib/logging';
import { SocketServer } from './server/socket-server';

class SocketManager {
  private static instance: SocketManager | null = null;
  private socketServer: SocketServer | null = null;
  private httpServer: any = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private serverPort: number = 3001; // Use different port to avoid conflicts

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  /**
   * Initialize Socket.io server (lazy initialization)
   */
  async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized) {
      log.debug('Socket.io server already initialized');
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      log.debug('Socket.io initialization already in progress, waiting...');
      return this.initializationPromise;
    }

    // Start initialization
    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  /**
   * Perform the actual Socket.io initialization
   */
  private async performInitialization(): Promise<void> {
    try {
      log.info('Initializing Socket.io server via singleton manager...', {
        port: this.serverPort
      });

      // Create HTTP server for Socket.io (standalone)
      this.httpServer = createServer();

      // Initialize Socket.io server using our existing SocketServer class
      this.socketServer = new SocketServer();
      await this.socketServer.initialize(this.httpServer);

      // Start the server on a different port
      this.httpServer.listen(this.serverPort, () => {
        log.info('Socket.io server started successfully', {
          port: this.serverPort
        });
      });

      this.isInitialized = true;
      log.info('Socket.io server initialized successfully via singleton manager');

      // Set up graceful shutdown handlers
      this.setupGracefulShutdown();

    } catch (error) {
      log.error('Failed to initialize Socket.io server via singleton manager:', error);
      this.initializationPromise = null; // Reset so we can try again
      throw error;
    }
  }

  /**
   * Check if Socket.io is initialized
   */
  isSocketInitialized(): boolean {
    return this.isInitialized && this.socketServer !== null;
  }

  /**
   * Get Socket.io server instance
   */
  getSocketServer(): SocketServer | null {
    return this.socketServer;
  }

  /**
   * Get HTTP server instance
   */
  getHttpServer(): any {
    return this.httpServer;
  }

  /**
   * Get Socket.io IO instance
   */
  getIO(): SocketIOServer | null {
    return this.socketServer?.getIO() || null;
  }

  /**
   * Get the port Socket.io is running on
   */
  getPort(): number {
    return this.serverPort;
  }

  /**
   * Get the Socket.io server URL
   */
  getServerUrl(): string {
    // For development, always use localhost:3001
    if (process.env.NODE_ENV === 'development') {
      return `http://localhost:${this.serverPort}`;
    }
    
    // For production, use BASE_URL but ensure we don't duplicate the port
    const baseUrl = process.env.BASE_URL || 'http://localhost';
    if (baseUrl.includes(':')) {
      // If BASE_URL already has a port, replace it
      const url = new URL(baseUrl);
      url.port = this.serverPort.toString();
      return url.toString();
    }
    
    return `${baseUrl}:${this.serverPort}`;
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      log.info(`Received ${signal}, shutting down Socket.io server gracefully...`);
      await this.shutdown();
      process.exit(0);
    };

    // Handle different termination signals
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // Ctrl+C
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Termination signal
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Nodemon restart
    
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      log.error('Uncaught exception, shutting down Socket.io server:', error);
      await this.shutdown();
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason) => {
      log.error('Unhandled promise rejection, shutting down Socket.io server:', reason);
      await this.shutdown();
      process.exit(1);
    });
  }

  /**
   * Shutdown Socket.io server
   */
  async shutdown(): Promise<void> {
    if (this.socketServer) {
      await this.socketServer.shutdown();
      this.socketServer = null;
    }
    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }
    this.isInitialized = false;
    this.initializationPromise = null;
    log.info('Socket.io server shutdown completed');
  }

  /**
   * Get initialization status
   */
  getStatus(): {
    initialized: boolean;
    hasSocketServer: boolean;
    hasHttpServer: boolean;
    port: number;
    serverUrl: string;
  } {
    return {
      initialized: this.isInitialized,
      hasSocketServer: this.socketServer !== null,
      hasHttpServer: this.httpServer !== null,
      port: this.serverPort,
      serverUrl: this.getServerUrl()
    };
  }
}

// Export singleton instance getter
export const getSocketManager = (): SocketManager => SocketManager.getInstance();

// Export the class for testing
export { SocketManager };
