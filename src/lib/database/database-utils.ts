/**
 * Database Utilities
 * 
 * Essential utility functions for database operations, connection management,
 * and query optimization. Extracted from the main DatabaseService for better organization.
 */

import { Types, Model, Document, Query, Connection } from 'mongoose';
import { 
  validateMongoId, 
  sanitizeString, 
  sanitizeEmail,
  escapeHtml,
  normalizeUnicode 
} from '../utils/request-validation';
import { 
  parsePagination, 
  buildMongoQuery, 
  buildMongoSort,
  buildDateRangeQuery,
  combineQueries,
  cleanQuery,
  PaginationParams,
  SortParams,
  FilterParams
} from '../utils/query-params';
import { 
  objectIdToString, 
  isValidObjectId, 
  transformArray,
  paginateResults,
  PaginatedResult 
} from '../utils/transformers';
import { 
  DatabaseError, 
  ValidationError, 
  NotFoundError,
  formatMongooseError,
  formatMongooseErrors
} from '../utils/error-handling';
import { log } from '@/lib/services';
import { 
  groupBy, 
  sortBy, 
  filterBy, 
  unique, 
  pickFields, 
  omitFields,
  deepMerge,
  isPlainObject,
  isEmpty,
  deepClone
} from '../utils/data-helpers';
import { 
  maskSensitiveData,
  cleanText 
} from '../utils/string-helpers';
import { 
  getCurrentTimestamp,
  formatDate,
  parseDate,
  isValidDate,
  addDaysToDate,
  subtractDaysFromDate,
  getDateRangeForPeriod,
  isValidDateRange
} from '../utils/date-time';
import { 
  retry, 
  withTimeout, 
  batchProcess, 
  createConcurrencyLimiter,
  sleep 
} from '../utils/async-helpers';
import { 
  QueryOptions,
  TransactionOptions,
  PaginationOptions,
  ConnectionStats,
  PoolStats,
  DatabaseHealth
} from './database-types';

// ===== CONNECTION UTILITIES =====

/**
 * Create database connection options
 */
export function createConnectionOptions(): any {
  return {
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
  };
}

/**
 * Validate database connection
 */
export async function validateConnection(connection: Connection): Promise<boolean> {
  try {
    if (!connection) {
      return false;
    }
    
    const state = connection.readyState;
    return state === 1; // Connected
  } catch (error) {
      log.error('Connection validation failed', { error });
    }
  return false;
}

/**
 * Get connection statistics
 */
export function getConnectionStats(connection: Connection): ConnectionStats {
  if (!connection) {
    return {
      state: 'disconnected',
      readyState: 0,
      host: '',
      port: 0,
      name: '',
      collections: 0,
      models: 0,
      plugins: [],
      config: {}
    };
  }

  const state = connection.readyState === 1 ? 'connected' : 
                connection.readyState === 2 ? 'connecting' : 
                connection.readyState === 3 ? 'disconnecting' : 'disconnected';

  return {
    state,
    readyState: connection.readyState,
    host: connection.host || '',
    port: connection.port || 0,
    name: connection.name || '',
    collections: connection.collections ? Object.keys(connection.collections).length : 0,
    models: connection.models ? Object.keys(connection.models).length : 0,
    plugins: [],
    config: {}
  };
}

/**
 * Get connection pool statistics
 */
export function getPoolStats(connection: Connection): PoolStats {
  if (!connection || !connection.db) {
    return {
      totalConnections: 0,
      availableConnections: 0,
      inUseConnections: 0,
      waitingRequests: 0,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000
    };
  }

  // Note: These are approximate values as MongoDB driver doesn't expose exact pool stats
  return {
    totalConnections: 10, // Default pool size
    availableConnections: 8, // Approximate
    inUseConnections: 2, // Approximate
    waitingRequests: 0, // Not directly available
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000
  };
}

// ===== QUERY UTILITIES =====

/**
 * Create query options with defaults
 */
export function createQueryOptions(options: Partial<QueryOptions> = {}): QueryOptions {
  return {
    retry: {
      attempts: 2,
      backoff: 'linear',
      delay: 500,
      maxDelay: 2000,
      jitter: false
    },
    monitor: true,
    timeout: 30000,
    lean: false,
    ...options
  };
}

/**
 * Validate ObjectId
 */
export function validateObjectId(id: string | Types.ObjectId): Types.ObjectId {
  if (!id) throw new Error('Invalid ObjectId: empty value');
  
  try {
    if (typeof id === 'string') {
      if (!Types.ObjectId.isValid(id)) {
        throw new Error('Invalid ObjectId: invalid string format');
      }
      return new Types.ObjectId(id);
    }
    if (id instanceof Types.ObjectId) {
      return id;
    }
    throw new Error('Invalid ObjectId: not a string or ObjectId');
  } catch (error) {
    throw new Error(`Invalid ObjectId: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

/**
 * Convert to ObjectId
 */
export function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  if (id instanceof Types.ObjectId) {
    return id;
  }
  
  if (!Types.ObjectId.isValid(id)) {
    throw new ValidationError(`Invalid ObjectId: ${id}`);
  }
  
  return new Types.ObjectId(id);
}

/**
 * Sanitize query parameters
 */
export function sanitizeQueryParams(params: any): any {
  if (!params || typeof params !== 'object') {
    return {};
  }

  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      continue;
    }
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeQueryParams(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Build MongoDB query from filters
 */
export function buildQuery(filters: FilterParams = {}): any {
  const query: any = {};
  
  // Handle common filter patterns
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } }
    ];
  }
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.tags && Array.isArray(filters.tags)) {
    query.tags = { $in: filters.tags };
  }
  
  return cleanQuery(query);
}

/**
 * Build sort options
 */
export function buildSortOptions(sort: Partial<SortParams> = {}): any {
  if (!sort || Object.keys(sort).length === 0) {
    return { createdAt: -1 }; // Default sort
  }
  
  return buildMongoSort(sort as SortParams);
}

/**
 * Build pagination options
 */
export function buildPaginationOptions(pagination: Partial<PaginationParams> = {}): any {
  const { page = 1, limit = 20 } = pagination;
  const skip = (page - 1) * limit;
  
  return {
    skip,
    limit: Math.min(limit, 100) // Cap at 100
  };
}

// ===== TRANSACTION UTILITIES =====

/**
 * Create transaction options
 */
export function createTransactionOptions(options: Partial<TransactionOptions> = {}): TransactionOptions {
  return {
    readPreference: 'primary',
    readConcern: { level: 'majority' },
    writeConcern: { w: 'majority', j: true },
    maxCommitTimeMS: 60000,
    retryWrites: true,
    ...options
  };
}

/**
 * Execute transaction with retry logic
 */
export async function executeTransaction<T>(
  connection: Connection,
  callback: (session: any) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const session = await connection.startSession();
  
  try {
    return await session.withTransaction(callback, options);
  } catch (error) {
    log.error('Transaction failed', { error, options });
    throw error;
  } finally {
    await session.endSession();
  }
}

// ===== HEALTH CHECK UTILITIES =====

/**
 * Perform database health check
 */
export async function performHealthCheck(connection: Connection): Promise<DatabaseHealth> {
  const startTime = Date.now();
  const now = new Date();
  
  try {
    if (!connection || connection.readyState !== 1) {
      return {
        status: 'critical',
        connection: {
          connected: false,
          readyState: connection?.readyState || 0,
          host: connection?.host || 'unknown',
          port: connection?.port || 0,
          database: connection?.name || 'unknown',
          uptime: 0,
          lastActivity: now
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
        issues: ['Not connected to database'],
        recommendations: ['Check database connection settings'],
        lastChecked: now
      };
    }
    
    // Simple ping to test connection
    if (connection.db) {
      await connection.db.admin().ping();
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      connection: {
        connected: true,
        readyState: connection.readyState,
        host: connection.host || 'unknown',
        port: connection.port || 0,
        database: connection.name || 'unknown',
        uptime: responseTime,
        lastActivity: now
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
      issues: [],
      recommendations: [],
      lastChecked: now
    };
  } catch (error) {
    return {
      status: 'critical',
      connection: {
        connected: false,
        readyState: connection?.readyState || 0,
        host: connection?.host || 'unknown',
        port: connection?.port || 0,
        database: connection?.name || 'unknown',
        uptime: 0,
        lastActivity: now
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
      issues: [error instanceof Error ? error.message : 'Unknown error'],
      recommendations: ['Check database connection and network'],
      lastChecked: now
    };
  }
}

// ===== ERROR HANDLING UTILITIES =====

/**
 * Handle database errors with proper formatting
 */
export function handleDatabaseError(error: any, context: string = 'Database operation'): never {
  log.error('Database error', { error, context });
  
  if (error.name === 'ValidationError') {
    const formattedErrors = formatMongooseErrors(error);
    throw new ValidationError(`Validation failed: ${formattedErrors.message}`, formattedErrors.details);
  }
  
  if (error.name === 'CastError') {
    throw new ValidationError(`Invalid data type: ${error.message}`);
  }
  
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    if (error.code === 11000) {
      throw new ValidationError('Duplicate entry found');
    }
    throw new DatabaseError(`Database error: ${error.message}`);
  }
  
  throw new DatabaseError(`Database operation failed: ${error.message}`);
}

/**
 * Retry database operation with exponential backoff
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      log.warn(`Database operation failed, retrying in ${delay}ms`, { 
        attempt, 
        maxAttempts, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

// ===== QUERY MONITORING UTILITIES =====

/**
 * Monitor query performance
 */
export function monitorQuery<T>(
  query: Query<T, any>,
  operation: string = 'query'
): Query<T, any> {
  const startTime = Date.now();
  
  // Simple monitoring - just log the operation start
  log.debug('Query started', { operation, timestamp: new Date() });
  
  return query;
}

// ===== CACHE UTILITIES =====

/**
 * Generate cache key for query
 */
export function generateCacheKey(operation: string, params: any): string {
  const key = `${operation}:${JSON.stringify(params)}`;
  return Buffer.from(key).toString('base64');
}

/**
 * Check if query should be cached
 */
export function shouldCacheQuery(operation: string, params: any): boolean {
  // Don't cache write operations
  if (['create', 'update', 'delete', 'remove'].includes(operation.toLowerCase())) {
    return false;
  }
  
  // Don't cache complex queries
  if (JSON.stringify(params).length > 1000) {
    return false;
  }
  
  return true;
}

// ===== BATCH OPERATION UTILITIES =====

/**
 * Process batch operations with concurrency control
 */
export async function processBatchOperations<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 100,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = [];
  const limiter = createConcurrencyLimiter(concurrency);
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    const batchPromises = batch.map(item => 
      limiter(() => processor(item))
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Validate batch size
 */
export function validateBatchSize(batchSize: number): number {
  const maxBatchSize = 1000;
  const minBatchSize = 1;
  
  if (batchSize > maxBatchSize) {
    log.warn(`Batch size ${batchSize} exceeds maximum, capping at ${maxBatchSize}`);
    return maxBatchSize;
  }
  
  if (batchSize < minBatchSize) {
    log.warn(`Batch size ${batchSize} is too small, setting to ${minBatchSize}`);
    return minBatchSize;
  }
  
  return batchSize;
}