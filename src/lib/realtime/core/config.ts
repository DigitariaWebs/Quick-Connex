export interface RealtimeEnvConfig {
  ablyApiKey?: string;
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
  featureRealtimeEnabled: boolean;
  featureWebPushEnabled: boolean;
  ablyTokenTtlMs: number;
}

export const REALTIME_ENV: RealtimeEnvConfig = {
  ablyApiKey: process.env.ABLY_API_KEY,
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  featureRealtimeEnabled: process.env.REALTIME_ENABLED !== 'false',
  featureWebPushEnabled: process.env.WEB_PUSH_ENABLED !== 'false',
  ablyTokenTtlMs: Number(process.env.ABLY_TOKEN_TTL_MS || 60 * 60 * 1000),
};

/**
 * Realtime Service Configuration
 * 
 * Centralized configuration for Socket.io, notifications, and Web Push.
 * Environment-based settings with sensible defaults.
 */

import { RealtimeServiceConfig, SocketTransport } from './types';
import { DEFAULT_CONFIG } from './constants';

// ===== DEFAULT CONFIGURATION =====

const DEFAULT_REALTIME_CONFIG: RealtimeServiceConfig = {
  socket: {
    path: DEFAULT_CONFIG.SOCKET_PATH,
    transports: DEFAULT_CONFIG.SOCKET_TRANSPORTS,
    pingInterval: DEFAULT_CONFIG.SOCKET_PING_INTERVAL,
    pingTimeout: DEFAULT_CONFIG.SOCKET_PING_TIMEOUT,
    maxHttpBufferSize: DEFAULT_CONFIG.SOCKET_MAX_BUFFER_SIZE,
    cors: {
      origin: process.env.BASE_URL || 'http://localhost:3000',
      credentials: true
    }
  },
  notifications: {
    maxRetries: DEFAULT_CONFIG.NOTIFICATION_MAX_RETRIES,
    retryDelay: DEFAULT_CONFIG.NOTIFICATION_RETRY_DELAY,
    batchSize: DEFAULT_CONFIG.NOTIFICATION_BATCH_SIZE,
    cleanupInterval: DEFAULT_CONFIG.NOTIFICATION_CLEANUP_INTERVAL
  },
  webPush: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidEmail: process.env.VAPID_EMAIL || 'mailto:admin@example.com'
  }
};

// ===== ENVIRONMENT-SPECIFIC CONFIGURATIONS =====

/**
 * Get configuration based on environment
 */
export function getEnvironmentConfig(): RealtimeServiceConfig {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return getProductionConfig();
    case 'test':
      return getStagingConfig();
    case 'development':
    default:
      return getDevelopmentConfig();
  }
}

/**
 * Production configuration
 */
function getProductionConfig(): RealtimeServiceConfig {
  return {
    socket: {
      path: '/socket.io',
      transports: ['websocket', 'polling'] as SocketTransport[],
      pingInterval: 25000,
      pingTimeout: 60000,
      maxHttpBufferSize: 1e6,
      cors: {
        origin: process.env.BASE_URL || 'https://your-domain.com',
        credentials: true
      }
    },
    notifications: {
      maxRetries: 3,
      retryDelay: 5000,
      batchSize: 100,
      cleanupInterval: 300000 // 5 minutes
    },
    webPush: {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
      vapidEmail: process.env.VAPID_EMAIL || 'mailto:admin@example.com'
    }
  };
}

/**
 * Staging configuration
 */
function getStagingConfig(): RealtimeServiceConfig {
  return {
    socket: {
      path: '/socket.io',
      transports: ['websocket', 'polling'] as SocketTransport[],
      pingInterval: 20000,
      pingTimeout: 50000,
      maxHttpBufferSize: 1e6,
      cors: {
        origin: process.env.BASE_URL || 'https://staging.your-domain.com',
        credentials: true
      }
    },
    notifications: {
      maxRetries: 2,
      retryDelay: 3000,
      batchSize: 75,
      cleanupInterval: 180000 // 3 minutes
    },
    webPush: {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
      vapidEmail: process.env.VAPID_EMAIL || 'mailto:admin@example.com'
    }
  };
}

/**
 * Development configuration
 */
function getDevelopmentConfig(): RealtimeServiceConfig {
  return {
    socket: {
      path: '/socket.io',
      transports: ['websocket', 'polling'] as SocketTransport[],
      pingInterval: 15000,
      pingTimeout: 30000,
      maxHttpBufferSize: 1e6,
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true
      }
    },
    notifications: {
      maxRetries: 1,
      retryDelay: 1000,
      batchSize: 25,
      cleanupInterval: 60000 // 1 minute
    },
    webPush: {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
      vapidEmail: process.env.VAPID_EMAIL || 'mailto:admin@example.com'
    }
  };
}

// ===== PLATFORM-SPECIFIC CONFIGURATIONS =====

/**
 * Get configuration based on deployment platform
 */
export function getPlatformConfig(): Partial<RealtimeServiceConfig> {
  const platform = process.env.DEPLOYMENT_PLATFORM || 'unknown';
  
  switch (platform) {
    case 'vercel':
      // Note: Vercel doesn't support WebSockets natively
      return {
        socket: {
          path: '/socket.io',
          transports: ['polling'] as SocketTransport[], // Fallback to polling only
          pingInterval: 25000,
          pingTimeout: 60000,
          maxHttpBufferSize: 1e6,
          cors: {
            origin: process.env.VERCEL_URL 
              ? `https://${process.env.VERCEL_URL}` 
              : 'https://your-domain.vercel.app',
            credentials: true
          }
        }
      };
      
    case 'railway':
      return {
        socket: {
          path: '/socket.io',
          transports: ['websocket', 'polling'] as SocketTransport[],
          pingInterval: 25000,
          pingTimeout: 60000,
          maxHttpBufferSize: 1e6,
          cors: {
            origin: process.env.RAILWAY_PUBLIC_DOMAIN 
              ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
              : 'https://your-app.railway.app',
            credentials: true
          }
        }
      };
      
    case 'heroku':
      return {
        socket: {
          path: '/socket.io',
          transports: ['websocket', 'polling'] as SocketTransport[],
          pingInterval: 25000,
          pingTimeout: 60000,
          maxHttpBufferSize: 1e6,
          cors: {
            origin: process.env.HEROKU_APP_NAME 
              ? `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`
              : 'https://your-app.herokuapp.com',
            credentials: true
          }
        }
      };
      
    default:
      return {};
  }
}

// ===== FINAL CONFIGURATION =====

/**
 * Get the final configuration by merging environment and platform configs
 */
export function getRealtimeConfig(): RealtimeServiceConfig {
  const envConfig = getEnvironmentConfig();
  const platformConfig = getPlatformConfig();
  
  return {
    socket: {
      ...envConfig.socket,
      ...platformConfig.socket
    },
    notifications: {
      ...envConfig.notifications,
      ...platformConfig.notifications
    },
    webPush: {
      ...envConfig.webPush,
      ...platformConfig.webPush
    }
  };
}

// Export the default configuration
export const REALTIME_CONFIG = getRealtimeConfig();