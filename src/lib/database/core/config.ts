/**
 * Database Configuration
 * 
 * Centralized configuration for database connections, monitoring, and performance settings.
 * Provides environment-based configuration with sensible defaults.
 */

import { DatabaseConfig, MonitoringConfig, CacheConfig } from './types';

// ===== DEFAULT CONFIGURATIONS =====
// Note: These are now lazy-loaded to avoid process.env reads at module load time

let cachedDefaultConfig: DatabaseConfig | null = null;
let cachedProductionConfig: DatabaseConfig | null = null;

function getDefaultDatabaseConfig(): DatabaseConfig {
  if (cachedDefaultConfig !== null) {
    return cachedDefaultConfig;
  }
  
  cachedDefaultConfig = {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management',
    options: {
      bufferCommands: false,
      maxPoolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true,
      readPreference: 'primary',
      writeConcern: {
        w: 'majority',
        j: true,
        wtimeout: 10000
      }
    },
    monitoring: {
      enabled: process.env.NODE_ENV === 'development' || process.env.DATABASE_MONITORING === 'true',
      slowQueryThreshold: 1000,
      maxQueryHistory: 1000,
      trackConnectionPool: true,
      trackMemoryUsage: true,
      logLevel: 'info'
    },
    cache: {
      enabled: process.env.DATABASE_CACHE === 'true',
      defaultTTL: 300, // 5 minutes
      maxSize: 1000,
      cleanupInterval: 60 // 1 minute
    }
  };
  
  return cachedDefaultConfig;
}

function getProductionDatabaseConfig(): DatabaseConfig {
  if (cachedProductionConfig !== null) {
    return cachedProductionConfig;
  }
  
  cachedProductionConfig = {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management',
    options: {
      bufferCommands: false,
      maxPoolSize: parseInt(process.env.DATABASE_POOL_SIZE || '20'),
      minPoolSize: 5,
      maxIdleTimeMS: 60000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 15000,
      retryWrites: true,
      retryReads: true,
      readPreference: 'primary',
      writeConcern: {
        w: 'majority',
        j: true,
        wtimeout: 15000
      }
    },
    monitoring: {
      enabled: true,
      slowQueryThreshold: 2000,
      maxQueryHistory: 500,
      trackConnectionPool: true,
      trackMemoryUsage: true,
      logLevel: 'warn'
    },
    cache: {
      enabled: true,
      defaultTTL: 600, // 10 minutes
      maxSize: 2000,
      cleanupInterval: 120 // 2 minutes
    }
  };
  
  return cachedProductionConfig;
}

// Export as getters to maintain backward compatibility
// Using Proxy to lazy-load config while maintaining the same API
export const DEFAULT_DATABASE_CONFIG = new Proxy({} as DatabaseConfig, {
  get(_target, prop) {
    const config = getDefaultDatabaseConfig();
    return config[prop as keyof DatabaseConfig];
  },
  ownKeys() {
    const config = getDefaultDatabaseConfig();
    return Reflect.ownKeys(config);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const config = getDefaultDatabaseConfig();
    return Reflect.getOwnPropertyDescriptor(config, prop);
  }
});

export const PRODUCTION_DATABASE_CONFIG = new Proxy({} as DatabaseConfig, {
  get(_target, prop) {
    const config = getProductionDatabaseConfig();
    return config[prop as keyof DatabaseConfig];
  },
  ownKeys() {
    const config = getProductionDatabaseConfig();
    return Reflect.ownKeys(config);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const config = getProductionDatabaseConfig();
    return Reflect.getOwnPropertyDescriptor(config, prop);
  }
});

// ===== CONNECTION SETTINGS =====

export const CONNECTION_SETTINGS = {
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
  CONNECTION_TIMEOUT: 10000,
  QUERY_TIMEOUT: 30000,
  TRANSACTION_TIMEOUT: 60000
};

// ===== QUERY LIMITS =====

export const QUERY_LIMITS = {
  MAX_BATCH_SIZE: 1000,
  MAX_PAGINATION_LIMIT: 100,
  DEFAULT_PAGINATION_LIMIT: 20,
  MAX_SORT_FIELDS: 5,
  MAX_POPULATE_DEPTH: 3,
  MAX_QUERY_COMPLEXITY: 100
};

// ===== RETRY CONFIGURATIONS =====

export const RETRY_CONFIGS = {
  CONNECTION: {
    attempts: 3,
    backoff: 'exponential' as const,
    delay: 1000,
    maxDelay: 10000,
    jitter: true
  },
  QUERY: {
    attempts: 2,
    backoff: 'linear' as const,
    delay: 500,
    maxDelay: 2000,
    jitter: false
  },
  TRANSACTION: {
    attempts: 3,
    backoff: 'exponential' as const,
    delay: 1000,
    maxDelay: 5000,
    jitter: true
  }
};

// ===== MONITORING THRESHOLDS =====

export const MONITORING_THRESHOLDS = {
  SLOW_QUERY_MS: 1000,
  MEMORY_WARNING_MB: 100,
  CONNECTION_POOL_WARNING: 0.8,
  QUERY_ERROR_THRESHOLD: 0.05, // 5% error rate
  CONNECTION_TIMEOUT_MS: 10000
};

// ===== CACHE SETTINGS =====
// Note: CACHE_SETTINGS is now in constants.ts

// ===== SECURITY SETTINGS =====

export const SECURITY_SETTINGS = {
  ENABLE_QUERY_LOGGING: process.env.NODE_ENV === 'development',
  MASK_SENSITIVE_DATA: true,
  SANITIZE_QUERIES: true,
  ENABLE_AUDIT_LOG: true,
  MAX_QUERY_LENGTH: 10000
};

// ===== PERFORMANCE SETTINGS =====

export const PERFORMANCE_SETTINGS = {
  ENABLE_QUERY_CACHING: true,
  ENABLE_CONNECTION_POOLING: true,
  ENABLE_INDEX_HINTS: false,
  ENABLE_QUERY_OPTIMIZATION: true,
  ENABLE_BATCH_OPERATIONS: true
};

// ===== HELPER FUNCTIONS =====

// Memoization cache for config values (computed once per process)
let cachedDatabaseEnvironment: 'development' | 'production' | null = null;
let cachedMongoDbUri: string | null = null;
let cachedDatabaseConfig: DatabaseConfig | null = null;
let cachedMonitoringConfig: MonitoringConfig | null = null;
let cachedCacheConfig: CacheConfig | null = null;

/**
 * Get the current database environment
 * Returns 'development' or 'production' based on DATABASE_ENV override or NODE_ENV
 * Memoized to avoid repeated process.env reads
 */
export function getDatabaseEnvironment(): 'development' | 'production' {
  if (cachedDatabaseEnvironment !== null) {
    return cachedDatabaseEnvironment;
  }
  
  const dbEnv = process.env.DATABASE_ENV?.toLowerCase();
  
  // Manual override takes precedence
  if (dbEnv === 'development' || dbEnv === 'production') {
    cachedDatabaseEnvironment = dbEnv;
    return cachedDatabaseEnvironment;
  }
  
  // If DATABASE_ENV is 'auto' or not set, use NODE_ENV
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  cachedDatabaseEnvironment = nodeEnv === 'production' ? 'production' : 'development';
  return cachedDatabaseEnvironment;
}

/**
 * Extract database name from MongoDB connection string
 */
export function getDatabaseName(uri: string): string | null {
  try {
    // Match database name in connection string
    // Format: mongodb://host:port/database or mongodb+srv://host/database
    const match = uri.match(/\/([^\/\?]+)(\?|$)/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get the appropriate MongoDB URI based on environment
 * Memoized to avoid repeated process.env reads
 */
function getMongoDbUri(): string {
  if (cachedMongoDbUri !== null) {
    return cachedMongoDbUri;
  }
  
  const dbEnv = getDatabaseEnvironment();
  
  // Try environment-specific URI first
  if (dbEnv === 'development') {
    if (process.env.MONGODB_URI_DEV) {
      cachedMongoDbUri = process.env.MONGODB_URI_DEV;
      return cachedMongoDbUri;
    }
  } else {
    if (process.env.MONGODB_URI_PROD) {
      cachedMongoDbUri = process.env.MONGODB_URI_PROD;
      return cachedMongoDbUri;
    }
  }
  
  // Fallback to generic MONGODB_URI for backward compatibility
  if (process.env.MONGODB_URI) {
    cachedMongoDbUri = process.env.MONGODB_URI;
    return cachedMongoDbUri;
  }
  
  // Final fallback to default
  cachedMongoDbUri = 'mongodb://localhost:27017/patients_management';
  return cachedMongoDbUri;
}

/**
 * Get database configuration based on environment
 * Memoized to avoid repeated computation and process.env reads
 */
export function getDatabaseConfig(): DatabaseConfig {
  if (cachedDatabaseConfig !== null) {
    return cachedDatabaseConfig;
  }
  
  const dbEnv = getDatabaseEnvironment();
  const isProduction = dbEnv === 'production';
  const baseConfig = isProduction ? getProductionDatabaseConfig() : getDefaultDatabaseConfig();
  
  // Get the appropriate URI based on environment
  const uri = getMongoDbUri();
  
  cachedDatabaseConfig = {
    ...baseConfig,
    uri
  };
  
  return cachedDatabaseConfig;
}

/**
 * Get monitoring configuration
 * Memoized to avoid repeated computation
 */
export function getMonitoringConfig(): MonitoringConfig {
  if (cachedMonitoringConfig !== null) {
    return cachedMonitoringConfig;
  }
  
  const config = getDatabaseConfig();
  cachedMonitoringConfig = config.monitoring || getDefaultDatabaseConfig().monitoring!;
  return cachedMonitoringConfig;
}

/**
 * Get cache configuration
 * Memoized to avoid repeated computation
 */
export function getCacheConfig(): CacheConfig {
  if (cachedCacheConfig !== null) {
    return cachedCacheConfig;
  }
  
  const config = getDatabaseConfig();
  cachedCacheConfig = config.cache || getDefaultDatabaseConfig().cache!;
  return cachedCacheConfig;
}

/**
 * Validate database configuration
 */
export function validateDatabaseConfig(config: DatabaseConfig): string[] {
  const errors: string[] = [];
  
  if (!config.uri) {
    errors.push('Database URI is required');
  }
  
  if (config.options?.maxPoolSize && config.options.maxPoolSize < 1) {
    errors.push('maxPoolSize must be at least 1');
  }
  
  if (config.options?.minPoolSize && config.options.minPoolSize < 1) {
    errors.push('minPoolSize must be at least 1');
  }
  
  if (config.options?.maxPoolSize && config.options?.minPoolSize && 
      config.options.maxPoolSize < config.options.minPoolSize) {
    errors.push('maxPoolSize must be greater than or equal to minPoolSize');
  }
  
  return errors;
}

/**
 * Get connection string with environment variables
 */
export function getConnectionString(): string {
  const config = getDatabaseConfig();
  if (!config.uri) {
    throw new Error('MongoDB URI is required. Please set MONGODB_URI_DEV, MONGODB_URI_PROD, or MONGODB_URI environment variable.');
  }
  return config.uri;
}

/**
 * Validate database environment configuration
 */
export function validateDatabaseEnvironment(): string[] {
  const errors: string[] = [];
  const dbEnv = getDatabaseEnvironment();
  
  // Check if environment-specific URI is set
  if (dbEnv === 'development' && !process.env.MONGODB_URI_DEV && !process.env.MONGODB_URI) {
    errors.push('MONGODB_URI_DEV or MONGODB_URI environment variable is required for development environment');
  }
  
  if (dbEnv === 'production' && !process.env.MONGODB_URI_PROD && !process.env.MONGODB_URI) {
    errors.push('MONGODB_URI_PROD or MONGODB_URI environment variable is required for production environment');
  }
  
  // Validate DATABASE_ENV if set
  const dbEnvOverride = process.env.DATABASE_ENV?.toLowerCase();
  if (dbEnvOverride && !['development', 'production', 'auto'].includes(dbEnvOverride)) {
    errors.push(`Invalid DATABASE_ENV value: ${dbEnvOverride}. Must be 'development', 'production', or 'auto'`);
  }
  
  return errors;
}

/**
 * Check if database monitoring is enabled
 */
export function isMonitoringEnabled(): boolean {
  return getMonitoringConfig().enabled || false;
}

/**
 * Check if database caching is enabled
 */
export function isCachingEnabled(): boolean {
  return getCacheConfig().enabled || false;
}
