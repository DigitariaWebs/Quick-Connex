/**
 * Connection Management Utilities
 * 
 * Utilities for MongoDB connection pooling, validation,
 * health checks, and statistics retrieval.
 */

import { Connection } from 'mongoose';
import { log } from '../../logging';
import { 
  DatabaseConfig, 
  ConnectionStats, 
  PoolStats, 
  ConnectionHealth,
  DatabaseError,
  ConnectionError
} from '../../../types/database';
import { TIMEOUTS, CONNECTION_STATES } from '../core/constants';

/**
 * Create connection options from config
 */
export function createConnectionOptions(config: DatabaseConfig): any {
  return {
    maxPoolSize: config.options?.maxPoolSize ?? 10,
    minPoolSize: config.options?.minPoolSize ?? 2,
    serverSelectionTimeoutMS: config.options?.serverSelectionTimeoutMS ?? 5000,
    socketTimeoutMS: config.options?.socketTimeoutMS ?? 45000,
    connectTimeoutMS: config.options?.connectTimeoutMS ?? 10000,
    retryWrites: config.options?.retryWrites ?? true,
    retryReads: config.options?.retryReads ?? true,
    readPreference: config.options?.readPreference ?? 'primary'
  };
}

/**
 * Validate connection state
 */
export function validateConnection(connection: Connection | null): boolean {
  if (!connection) {
    return false;
  }
  
  // Connection state 1 means connected
  return connection.readyState === 1;
}

/**
 * Get connection statistics
 */
export function getConnectionStats(connection: Connection | null): ConnectionStats {
  if (!connection) {
    return {
      state: 'disconnected',
      host: 'unknown',
      port: 0,
      name: 'unknown',
      readyState: CONNECTION_STATES.DISCONNECTED,
      collections: 0,
      models: 0,
      plugins: [],
      config: {}
    };
  }

  return {
    state: getConnectionStateString(connection.readyState),
    host: connection.host || 'unknown',
    port: connection.port || 0,
    name: connection.name || 'unknown',
    readyState: connection.readyState,
    collections: connection.collections ? Object.keys(connection.collections).length : 0,
    models: connection.models ? Object.keys(connection.models).length : 0,
    plugins: connection.plugins ? Object.keys(connection.plugins) : [],
    config: connection.config || {}
  };
}

/**
 * Get connection state string
 */
export function getConnectionStateString(readyState: number): 'connected' | 'connecting' | 'disconnected' | 'disconnecting' {
  switch (readyState) {
    case CONNECTION_STATES.CONNECTED:
      return 'connected';
    case CONNECTION_STATES.CONNECTING:
      return 'connecting';
    case CONNECTION_STATES.DISCONNECTING:
      return 'disconnecting';
    default:
      return 'disconnected';
  }
}

/**
 * Get pool statistics
 */
export function getPoolStats(connection: Connection | null, config: DatabaseConfig): PoolStats {
  const isConnected = validateConnection(connection);
  
  return {
    totalConnections: config.options?.maxPoolSize ?? 10,
    availableConnections: isConnected ? (config.options?.maxPoolSize ?? 10) : 0,
    inUseConnections: isConnected ? 0 : (config.options?.minPoolSize ?? 2),
    waitingRequests: 0,
    maxPoolSize: config.options?.maxPoolSize ?? 10,
    minPoolSize: config.options?.minPoolSize ?? 2,
    maxIdleTimeMS: config.options?.maxIdleTimeMS ?? 30000,
    serverSelectionTimeoutMS: config.options?.serverSelectionTimeoutMS ?? 5000,
    socketTimeoutMS: config.options?.socketTimeoutMS ?? 45000,
    connectTimeoutMS: config.options?.connectTimeoutMS ?? 10000
  };
}

/**
 * Perform health check on connection
 */
export async function performHealthCheck(connection: Connection | null): Promise<ConnectionHealth> {
  const startTime = Date.now();
  
  if (!connection) {
    return {
      connected: false,
      readyState: CONNECTION_STATES.DISCONNECTED,
      host: 'unknown',
      port: 0,
      database: 'unknown',
      uptime: 0,
      lastActivity: new Date()
    };
  }

  try {
    // Simple ping to check connection
    await connection.db?.admin().ping();
    
    return {
      connected: connection.readyState === CONNECTION_STATES.CONNECTED,
      readyState: connection.readyState,
      host: connection.host || 'unknown',
      port: connection.port || 0,
      database: connection.name || 'unknown',
      uptime: Date.now() - startTime,
      lastActivity: new Date()
    };
  } catch (error) {
    return {
      connected: false,
      readyState: connection.readyState,
      host: connection.host || 'unknown',
      port: connection.port || 0,
      database: connection.name || 'unknown',
      uptime: Date.now() - startTime,
      lastActivity: new Date()
    };
  }
}

/**
 * Handle database connection errors
 */
export function handleDatabaseError(error: any, operation: string = 'database_operation'): DatabaseError {
  if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
    return new ConnectionError(`Network error during ${operation}: ${error.message}`, {
      originalError: error,
      operation
    });
  }
  
  if (error.name === 'MongoServerSelectionError') {
    return new ConnectionError(`Server selection failed during ${operation}: ${error.message}`, {
      originalError: error,
      operation
    });
  }
  
  if (error.name === 'MongoError') {
    return new DatabaseError(
      'DATABASE_ERROR' as any,
      `Database error during ${operation}: ${error.message}`,
      500,
      {
        originalError: error,
        operation,
        code: error.code,
        codeName: error.codeName
      },
      operation
    );
  }
  
  return new DatabaseError(
    'DATABASE_ERROR' as any,
    `Unexpected error during ${operation}: ${error.message}`,
    500,
    { originalError: error, operation },
    operation
  );
}

/**
 * Retry database operation with exponential backoff
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        break;
      }
      
      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
        maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  const retryableErrors = [
    'MongoNetworkError',
    'MongoTimeoutError',
    'MongoServerSelectionError',
    'MongoWriteConcernError'
  ];
  
  return retryableErrors.includes(error.name);
}

/**
 * Monitor query execution
 */
export function monitorQuery<T>(
  operation: string,
  modelName: string,
  query: any,
  options: any = {}
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();
    
    try {
      const result = await query;
      const executionTime = Date.now() - startTime;
      
      // Log slow queries
      if (executionTime > 1000) {
        log.warn(`Slow query detected: ${operation} on ${modelName} took ${executionTime}ms`, {
          operation,
          model: modelName,
          executionTime,
          query: JSON.stringify(options)
        });
      }
      
      resolve(result);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      log.error(`Query failed: ${operation} on ${modelName} after ${executionTime}ms`, {
        operation,
        model: modelName,
        executionTime,
        error: error instanceof Error ? error.message : String(error),
        query: JSON.stringify(options)
      });
      
      reject(error);
    }
  });
}

/**
 * Wait for connection to be ready
 */
export async function waitForConnection(
  connection: Connection | null,
  timeout: number = TIMEOUTS.CONNECTION
): Promise<void> {
  if (!connection) {
    throw new ConnectionError('No connection provided');
  }
  
  // Connection state 1 means connected
  const CONNECTED_STATE = 1;
  if ((connection.readyState as number) === CONNECTED_STATE) {
    return;
  }
  
  const startTime = Date.now();
  
  while ((connection.readyState as number) !== CONNECTED_STATE) {
    if (Date.now() - startTime > timeout) {
      throw new ConnectionError(`Connection timeout after ${timeout}ms`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Get connection info for logging
 */
export function getConnectionInfo(connection: Connection | null): Record<string, any> {
  if (!connection) {
    return { state: 'disconnected' };
  }
  
  return {
    state: getConnectionStateString(connection.readyState),
    host: connection.host,
    port: connection.port,
    database: connection.name,
    readyState: connection.readyState,
    collections: connection.collections ? Object.keys(connection.collections).length : 0,
    models: connection.models ? Object.keys(connection.models).length : 0
  };
}
