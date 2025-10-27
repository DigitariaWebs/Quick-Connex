/**
 * Real-time Notifications System Configuration
 * 
 * Centralized configuration for Socket.io, notifications, and Web Push.
 * Environment-based settings with sensible defaults.
 */

import { RealtimeServiceConfig } from './types';

// ===== DEFAULT CONFIGURATION =====

const DEFAULT_CONFIG: RealtimeServiceConfig = {
  socket: {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    pingInterval: 25000, // 25 seconds
    pingTimeout: 60000,  // 60 seconds
    maxHttpBufferSize: 1e6, // 1MB
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.BASE_URL || 'https://your-domain.com'
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    }
  },
  notifications: {
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    expirationTime: 24 * 60 * 60 * 1000, // 24 hours
    batchSize: 100
  },
  webPush: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidEmail: process.env.VAPID_EMAIL || 'mailto:admin@your-domain.com'
  }
};

// ===== CONFIGURATION FUNCTIONS =====

/**
 * Get the complete realtime service configuration
 */
export function getRealtimeConfig(): RealtimeServiceConfig {
  return {
    socket: {
      ...DEFAULT_CONFIG.socket,
      cors: {
        ...DEFAULT_CONFIG.socket.cors,
        origin: getCorsOrigin()
      }
    },
    notifications: {
      ...DEFAULT_CONFIG.notifications,
      maxRetries: parseInt(process.env.NOTIFICATION_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.NOTIFICATION_RETRY_DELAY || '5000'),
      expirationTime: parseInt(process.env.NOTIFICATION_EXPIRATION_TIME || '86400000'),
      batchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE || '100')
    },
    webPush: {
      ...DEFAULT_CONFIG.webPush,
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || DEFAULT_CONFIG.webPush.vapidPublicKey,
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || DEFAULT_CONFIG.webPush.vapidPrivateKey,
      vapidEmail: process.env.VAPID_EMAIL || DEFAULT_CONFIG.webPush.vapidEmail
    }
  };
}

/**
 * Get CORS origin configuration
 */
function getCorsOrigin(): string | string[] {
  const baseUrl = process.env.BASE_URL;
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  
  if (process.env.NODE_ENV === 'production') {
    if (allowedOrigins) {
      return allowedOrigins.split(',').map(origin => origin.trim());
    }
    return baseUrl || 'https://your-domain.com';
  }
  
  // Development origins
  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ];
}

/**
 * Validate configuration
 */
export function validateRealtimeConfig(config: RealtimeServiceConfig): string[] {
  const errors: string[] = [];
  
  // Validate Socket.io config
  if (!config.socket.path || !config.socket.path.startsWith('/')) {
    errors.push('Socket path must start with "/"');
  }
  
  if (config.socket.pingInterval < 1000) {
    errors.push('Ping interval must be at least 1000ms');
  }
  
  if (config.socket.pingTimeout < config.socket.pingInterval) {
    errors.push('Ping timeout must be greater than ping interval');
  }
  
  // Validate notifications config
  if (config.notifications.maxRetries < 0) {
    errors.push('Max retries must be non-negative');
  }
  
  if (config.notifications.retryDelay < 1000) {
    errors.push('Retry delay must be at least 1000ms');
  }
  
  if (config.notifications.expirationTime < 60000) {
    errors.push('Expiration time must be at least 1 minute');
  }
  
  // Validate Web Push config
  if (process.env.NODE_ENV === 'production') {
    if (!config.webPush.vapidPublicKey) {
      errors.push('VAPID public key is required in production');
    }
    
    if (!config.webPush.vapidPrivateKey) {
      errors.push('VAPID private key is required in production');
    }
    
    if (!config.webPush.vapidEmail || !config.webPush.vapidEmail.startsWith('mailto:')) {
      errors.push('VAPID email must start with "mailto:"');
    }
  }
  
  return errors;
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig(): Partial<RealtimeServiceConfig> {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isProduction) {
    return {
      socket: {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        pingInterval: 25000,
        pingTimeout: 60000,
        maxHttpBufferSize: 1e6,
        cors: {
          origin: process.env.BASE_URL || 'https://your-domain.com',
          credentials: true
        }
      },
      notifications: {
        maxRetries: 5,
        retryDelay: 10000, // 10 seconds in production
        expirationTime: 7 * 24 * 60 * 60 * 1000, // 7 days
        batchSize: 200
      }
    };
  }
  
  if (isDevelopment) {
    return {
      socket: {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        pingInterval: 25000,
        pingTimeout: 60000,
        maxHttpBufferSize: 1e6,
        cors: {
          origin: [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001'
          ],
          credentials: true
        }
      },
      notifications: {
        maxRetries: 1,
        retryDelay: 2000, // 2 seconds in development
        expirationTime: 60 * 60 * 1000, // 1 hour
        batchSize: 50
      }
    };
  }
  
  return {};
}

/**
 * Get configuration for specific deployment platform
 */
export function getPlatformConfig(): Partial<RealtimeServiceConfig> {
  const platform = process.env.DEPLOYMENT_PLATFORM || 'railway';
  
  switch (platform) {
    case 'railway':
      return {
        socket: {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          pingInterval: 25000,
          pingTimeout: 60000,
          maxHttpBufferSize: 1e6,
          cors: {
            origin: process.env.RAILWAY_PUBLIC_DOMAIN 
              ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
              : process.env.BASE_URL || 'https://your-domain.com',
            credentials: true
          }
        }
      };
      
    case 'vercel':
      // Note: Vercel doesn't support WebSockets natively
      return {
        socket: {
          path: '/socket.io',
          transports: ['polling'], // Fallback to polling only
          pingInterval: 25000,
          pingTimeout: 60000,
          maxHttpBufferSize: 1e6,
          cors: {
            origin: process.env.VERCEL_URL 
              ? `https://${process.env.VERCEL_URL}`
              : process.env.BASE_URL || 'https://your-domain.com',
            credentials: true
          }
        }
      };
      
    default:
      return {};
  }
}

/**
 * Merge configurations with priority order
 */
export function mergeConfigurations(): RealtimeServiceConfig {
  const baseConfig = getRealtimeConfig();
  const envConfig = getEnvironmentConfig();
  const platformConfig = getPlatformConfig();
  
  return {
    socket: {
      ...baseConfig.socket,
      ...envConfig.socket,
      ...platformConfig.socket,
      cors: {
        ...baseConfig.socket.cors,
        ...envConfig.socket?.cors,
        ...platformConfig.socket?.cors
      }
    },
    notifications: {
      ...baseConfig.notifications,
      ...envConfig.notifications,
      ...platformConfig.notifications
    },
    webPush: {
      ...baseConfig.webPush,
      ...envConfig.webPush,
      ...platformConfig.webPush
    }
  };
}

// ===== EXPORTS =====

export const REALTIME_CONFIG = mergeConfigurations();

export default REALTIME_CONFIG;
