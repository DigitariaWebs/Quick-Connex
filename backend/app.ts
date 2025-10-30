/**
 * Express Application Configuration
 * 
 * Central Express app setup with middleware, routes, and error handling.
 * This file configures the Express application without starting the server.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Import our API system
import { errorHandler, notFoundHandler, requestLogger } from './src/middleware/error.middleware';
import { getDatabaseHealth, isDatabaseConnected } from './src/lib/database';
import { CommunicationService } from './src/lib/communication';

// Import routes
import authRoutes from './src/routes/auth';
import { transferRouter, timelineRouter, adminTransferRouter } from './src/routes/transfers';
import { userRouter, adminUserRouter } from './src/routes/users';
import hospitalRouter from './src/routes/hospitals/hospital.routes';
import ciusssRouter from './src/routes/ciusss/ciusss.routes';


/**
 * Create and configure Express application
 */
export function createApp(): express.Application {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests from this IP, please try again later.',
        retryable: true,
        retryAfter: 900, // 15 minutes in seconds
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Compression middleware
  app.use(compression());

  // Logging middleware
  if (process.env['NODE_ENV'] !== 'test') {
    app.use(morgan('combined'));
  }
  app.use(requestLogger);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/health', async (_req: express.Request, res: express.Response) => {
    try {
      const dbHealth = await getDatabaseHealth();
      const dbConnected = isDatabaseConnected();
      
      // Get communication service health
      let communicationHealth = { connected: false, providers: {} };
      try {
        const communicationService = CommunicationService.getInstance();
        if (communicationService.isServiceInitialized()) {
          communicationHealth = await communicationService.getHealth();
        }
      } catch (error) {
        // Communication service not initialized or error
      }
      
      const healthStatus = {
        success: true,
        data: {
          status: dbConnected ? 'healthy' : 'degraded',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env['NODE_ENV'] || 'development',
          version: process.env['npm_package_version'] || '1.0.0',
          database: {
            connected: dbConnected,
            health: dbHealth
          },
          communication: communicationHealth
        },
      };
      
      const statusCode = dbConnected ? 200 : 503;
      res.status(statusCode).json(healthStatus);
    } catch (error) {
      res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env['NODE_ENV'] || 'development',
          version: process.env['npm_package_version'] || '1.0.0',
          database: {
            connected: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        },
      });
    }
  });

  // API routes
  app.use('/api', (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Add API versioning header
    res.setHeader('X-API-Version', '1.0.0');
    next();
  });

  // Mount route handlers
  app.use('/api/auth', authRoutes);
  app.use('/api/transfers', transferRouter);
  app.use('/api/admin/transfers', adminTransferRouter);
  app.use('/api/timeline', timelineRouter);
  app.use('/api/users', userRouter);
  app.use('/api/admin/users', adminUserRouter);
  app.use('/api/hospitals', hospitalRouter);
  app.use('/api/ciusss', ciusssRouter);

  // API documentation endpoint (placeholder)
  app.get('/api', (_req: express.Request, res: express.Response) => {
    res.status(200).json({
      success: true,
      data: {
        message: 'Patients Management API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          auth: '/api/auth',
          users: '/api/users',
          transfers: '/api/transfers',
        },
        documentation: '/api/docs', // Future API docs endpoint
      },
    });
  });

  // 404 handler for unmatched routes
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Graceful shutdown handler
 */
export function setupGracefulShutdown(_app: express.Application, server: any, disconnectDb?: () => Promise<void>): void {
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    // Disconnect from database if provided
    if (disconnectDb) {
      try {
        console.log('📊 Disconnecting from database...');
        await disconnectDb();
        console.log('✅ Database disconnected');
      } catch (error) {
        console.error('❌ Error disconnecting from database:', error);
      }
    }
    
    server.close((err: any) => {
      if (err) {
        console.error('Error during server shutdown:', err);
        process.exit(1);
      }
      
      console.log('Server closed successfully');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  // Handle different termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });
}
