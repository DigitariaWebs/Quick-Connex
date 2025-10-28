/**
 * Database Configuration Management
 * 
 * Environment-based configuration for MongoDB connection,
 * monitoring, caching, and other database settings.
 */

import { DatabaseConfig, MonitoringConfig, CacheConfig } from '../../../types/database';

/**
 * Get database configuration from environment variables
 */
export function getDatabaseConfig(): DatabaseConfig {
  const config: DatabaseConfig = {
    uri: process.env['MONGODB_URI'] || process.env['DATABASE_URL'] || 'mongodb://localhost:27017/patients_management',
    options: {
      bufferCommands: process.env['MONGODB_BUFFER_COMMANDS'] === 'true' || false,
      maxPoolSize: parseInt(process.env['MONGODB_MAX_POOL_SIZE'] || '10'),
      minPoolSize: parseInt(process.env['MONGODB_MIN_POOL_SIZE'] || '2'),
      maxIdleTimeMS: parseInt(process.env['MONGODB_MAX_IDLE_TIME_MS'] || '30000'),
      serverSelectionTimeoutMS: parseInt(process.env['MONGODB_SERVER_SELECTION_TIMEOUT_MS'] || '5000'),
      socketTimeoutMS: parseInt(process.env['MONGODB_SOCKET_TIMEOUT_MS'] || '45000'),
      connectTimeoutMS: parseInt(process.env['MONGODB_CONNECT_TIMEOUT_MS'] || '10000'),
      retryWrites: process.env['MONGODB_RETRY_WRITES'] === 'true' || true,
      retryReads: process.env['MONGODB_RETRY_READS'] === 'true' || true,
      readPreference: (process.env['MONGODB_READ_PREFERENCE'] as 'primary' | 'secondary' | 'primaryPreferred' | 'secondaryPreferred' | 'nearest') || 'primary',
      writeConcern: {
        w: process.env['MONGODB_WRITE_CONCERN_W'] === 'majority' ? 'majority' : parseInt(process.env['MONGODB_WRITE_CONCERN_W'] || '1'),
        j: process.env['MONGODB_WRITE_CONCERN_J'] === 'true' || true,
        wtimeout: parseInt(process.env['MONGODB_WRITE_CONCERN_WTIMEOUT'] || '10000')
      },
      ...(process.env['MONGODB_AUTH_SOURCE'] ? { authSource: process.env['MONGODB_AUTH_SOURCE'] } : {}),
      ssl: process.env['MONGODB_SSL'] === 'true' || false,
      tls: process.env['MONGODB_TLS'] === 'true' || false,
      tlsInsecure: process.env['MONGODB_TLS_INSECURE'] === 'true' || false
    },
    monitoring: getMonitoringConfig(),
    cache: getCacheConfig()
  };

  return config;
}

/**
 * Get monitoring configuration
 */
export function getMonitoringConfig(): MonitoringConfig {
  return {
    enabled: process.env['DB_MONITORING_ENABLED'] === 'true' || true,
    slowQueryThreshold: parseInt(process.env['DB_SLOW_QUERY_THRESHOLD'] || '1000'),
    maxQueryHistory: parseInt(process.env['DB_MAX_QUERY_HISTORY'] || '1000'),
    trackConnectionPool: process.env['DB_TRACK_CONNECTION_POOL'] === 'true' || true,
    trackMemoryUsage: process.env['DB_TRACK_MEMORY_USAGE'] === 'true' || true,
    logLevel: (process.env['DB_LOG_LEVEL'] as any) || 'info'
  };
}

/**
 * Get cache configuration
 */
export function getCacheConfig(): CacheConfig {
  return {
    enabled: process.env['DB_CACHE_ENABLED'] === 'true' || true,
    defaultTTL: parseInt(process.env['DB_CACHE_DEFAULT_TTL'] || '300'),
    maxSize: parseInt(process.env['DB_CACHE_MAX_SIZE'] || '1000'),
    cleanupInterval: parseInt(process.env['DB_CACHE_CLEANUP_INTERVAL'] || '60')
  };
}

/**
 * Validate database configuration
 */
export function validateDatabaseConfig(config: DatabaseConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.uri) {
    errors.push('MongoDB URI is required');
  }

  if (config.options?.maxPoolSize && config.options.maxPoolSize < 1) {
    errors.push('maxPoolSize must be at least 1');
  }

  if (config.options?.minPoolSize && config.options.minPoolSize < 0) {
    errors.push('minPoolSize must be at least 0');
  }

  if (config.options?.maxPoolSize && config.options?.minPoolSize && 
      config.options.maxPoolSize < config.options.minPoolSize) {
    errors.push('maxPoolSize must be greater than or equal to minPoolSize');
  }

  if (config.monitoring?.slowQueryThreshold && config.monitoring.slowQueryThreshold < 0) {
    errors.push('slowQueryThreshold must be non-negative');
  }

  if (config.cache?.defaultTTL && config.cache.defaultTTL < 0) {
    errors.push('defaultTTL must be non-negative');
  }

  if (config.cache?.maxSize && config.cache.maxSize < 1) {
    errors.push('maxSize must be at least 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get connection string with masked credentials for logging
 */
export function getConnectionString(uri: string): string {
  return uri.replace(/\/\/.*@/, '//***@');
}

/**
 * Check if monitoring is enabled
 */
export function isMonitoringEnabled(config?: DatabaseConfig): boolean {
  return config?.monitoring?.enabled ?? true;
}

/**
 * Check if caching is enabled
 */
export function isCachingEnabled(config?: DatabaseConfig): boolean {
  return config?.cache?.enabled ?? true;
}

/**
 * Get default query timeout
 */
export function getDefaultQueryTimeout(): number {
  return parseInt(process.env['DB_DEFAULT_QUERY_TIMEOUT'] || '30000');
}

/**
 * Get default retry configuration
 */
export function getDefaultRetryConfig() {
  return {
    attempts: parseInt(process.env['DB_DEFAULT_RETRY_ATTEMPTS'] || '3'),
    backoff: (process.env['DB_DEFAULT_RETRY_BACKOFF'] as 'linear' | 'exponential' | 'fixed') || 'exponential',
    delay: parseInt(process.env['DB_DEFAULT_RETRY_DELAY'] || '1000'),
    maxDelay: parseInt(process.env['DB_DEFAULT_RETRY_MAX_DELAY'] || '10000')
  };
}
