/**
 * Database Health Utilities
 * 
 * Health check, error handling, and retry logic for database operations.
 */

import { Connection } from 'mongoose';
import { log } from '@/lib/services';
import { DatabaseError } from '../../utils/error-handling';
import { DatabaseHealth } from '../core/types';

/**
 * Perform database health check
 */
export async function performHealthCheck(connection: Connection): Promise<DatabaseHealth> {
  try {
    if (!connection) {
      return {
        status: 'critical',
        connection: { 
          connected: false, 
          readyState: 0, 
          host: '', 
          port: 0, 
          database: '', 
          uptime: 0, 
          lastActivity: new Date() 
        },
        performance: { 
          averageQueryTime: 0, 
          slowQueryCount: 0, 
          connectionPoolUtilization: 0, 
          indexHitRatio: 0,
          cacheHitRatio: 0
        },
        memory: { 
          used: 0, 
          available: 0, 
          total: 0, 
          utilization: 0, 
          heapUsed: 0, 
          heapTotal: 0, 
          external: 0 
        },
        issues: ['No database connection available'],
        recommendations: ['Check database connection configuration'],
        lastChecked: new Date()
      };
    }

    const state = connection.readyState;
    if (state !== 1) { // 1 = connected
      return {
        status: 'critical',
        connection: { 
          connected: false, 
          readyState: state, 
          host: connection.host || '', 
          port: connection.port || 0, 
          database: connection.name || '', 
          uptime: 0, 
          lastActivity: new Date() 
        },
        performance: { 
          averageQueryTime: 0, 
          slowQueryCount: 0, 
          connectionPoolUtilization: 0, 
          indexHitRatio: 0,
          cacheHitRatio: 0
        },
        memory: { 
          used: 0, 
          available: 0, 
          total: 0, 
          utilization: 0, 
          heapUsed: 0, 
          heapTotal: 0, 
          external: 0 
        },
        issues: [`Database connection state: ${state}`],
        recommendations: ['Check database connection status'],
        lastChecked: new Date()
      };
    }

    // Test with a simple ping
    if (!connection.db) {
      throw new Error('Database connection not available');
    }
    await connection.db.admin().ping();
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUtilization = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    return {
      status: 'healthy',
      connection: { 
        connected: true, 
        readyState: state, 
        host: connection.host || '', 
        port: connection.port || 0, 
        database: connection.name || '', 
        uptime: process.uptime(), 
        lastActivity: new Date() 
      },
      performance: { 
        averageQueryTime: 0, 
        slowQueryCount: 0, 
        connectionPoolUtilization: 0, 
        indexHitRatio: 0,
        cacheHitRatio: 0
      },
      memory: { 
        used: memoryUtilization, 
        available: 100 - memoryUtilization, 
        total: 100, 
        utilization: memoryUtilization, 
        heapUsed: memoryUsage.heapUsed, 
        heapTotal: memoryUsage.heapTotal, 
        external: memoryUsage.external 
      },
      issues: [],
      recommendations: [],
      lastChecked: new Date()
    };
  } catch (error) {
    log.error('Database health check failed:', error);
    return {
      status: 'critical',
      connection: { 
        connected: false, 
        readyState: 0, 
        host: '', 
        port: 0, 
        database: '', 
        uptime: 0, 
        lastActivity: new Date() 
      },
      performance: { 
        averageQueryTime: 0, 
        slowQueryCount: 0, 
        connectionPoolUtilization: 0, 
        indexHitRatio: 0,
        cacheHitRatio: 0
      },
      memory: { 
        used: 0, 
        available: 0, 
        total: 0, 
        utilization: 0, 
        heapUsed: 0, 
        heapTotal: 0, 
        external: 0 
      },
      issues: [`Health check failed: ${(error as Error).message}`],
      recommendations: ['Check database connection and configuration'],
      lastChecked: new Date()
    };
  }
}

/**
 * Handle database errors
 */
export function handleDatabaseError(error: any, context: string = 'Database operation'): never {
  log.error(`${context} failed:`, error);
  
  if (error.name === 'ValidationError') {
    throw new DatabaseError(`Validation failed: ${error.message}`);
  }
  
  if (error.name === 'CastError') {
    throw new DatabaseError(`Invalid data type: ${error.message}`);
  }
  
  if (error.code === 11000) {
    throw new DatabaseError('Duplicate key error');
  }
  
  if (error.name === 'MongoNetworkError') {
    throw new DatabaseError('Network error: Unable to connect to database');
  }
  
  if (error.name === 'MongoTimeoutError') {
    throw new DatabaseError('Database operation timed out');
  }
  
  throw new DatabaseError(`${context} failed: ${error.message}`);
}

/**
 * Retry database operation with exponential backoff
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Don't retry certain types of errors
      if ((error as Error).name === 'ValidationError' || (error as Error).name === 'CastError') {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      log.warn(`Database operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Monitor query performance
 */
export function monitorQuery<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const startTime = Date.now();
  
  return operation().then(
    result => {
      const duration = Date.now() - startTime;
      log.info(`Query ${operationName} completed in ${duration}ms`);
      return result;
    },
    error => {
      const duration = Date.now() - startTime;
      log.error(`Query ${operationName} failed after ${duration}ms:`, error);
      throw error;
    }
  );
}

/**
 * Process batch operations
 */
export async function processBatchOperations<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => operation(item))
    );
    results.push(...batchResults);
  }
  
  return results;
}

// Note: DatabaseHealth is now imported from core/types
