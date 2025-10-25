/**
 * Database Constants
 * 
 * Constants for database operations, limits, timeouts, and default values.
 */

/**
 * Default pagination settings
 */
export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1
} as const;

/**
 * Default query options
 */
export const DEFAULT_QUERY_OPTIONS = {
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  BATCH_SIZE: 100,
  MAX_BATCH_SIZE: 1000
} as const;

/**
 * Connection pool settings
 */
export const CONNECTION_POOL = {
  MIN_SIZE: 5,
  MAX_SIZE: 10,
  MAX_IDLE_TIME: 30000, // 30 seconds
  CONNECT_TIMEOUT: 10000, // 10 seconds
  SOCKET_TIMEOUT: 45000 // 45 seconds
} as const;

/**
 * Cache settings
 */
export const CACHE_SETTINGS = {
  DEFAULT_TTL: 300, // 5 minutes
  MAX_TTL: 3600, // 1 hour
  MIN_TTL: 60 // 1 minute
} as const;

/**
 * Health check thresholds
 */
export const HEALTH_THRESHOLDS = {
  MAX_MEMORY_USAGE: 80, // 80%
  MAX_CONNECTION_USAGE: 90, // 90%
  MAX_QUERY_TIME: 5000, // 5 seconds
  MAX_OPERATION_TIME: 10000 // 10 seconds
} as const;

/**
 * Error codes
 */
export const DATABASE_ERROR_CODES = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  QUERY_TIMEOUT: 'QUERY_TIMEOUT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_KEY: 'DUPLICATE_KEY',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  BULK_WRITE_ERROR: 'BULK_WRITE_ERROR'
} as const;

/**
 * Query operation types
 */
export const QUERY_OPERATIONS = {
  FIND: 'find',
  FIND_ONE: 'findOne',
  COUNT: 'count',
  AGGREGATE: 'aggregate',
  INSERT: 'insert',
  UPDATE: 'update',
  DELETE: 'delete',
  BULK_WRITE: 'bulkWrite'
} as const;

/**
 * Sort directions
 */
export const SORT_DIRECTIONS = {
  ASC: 1,
  DESC: -1
} as const;

/**
 * Default sort options
 */
export const DEFAULT_SORT = {
  CREATED_AT: { createdAt: -1 },
  UPDATED_AT: { updatedAt: -1 },
  ID: { _id: 1 }
} as const;

/**
 * Transaction options
 */
export const TRANSACTION_OPTIONS = {
  READ_PREFERENCE: 'primary',
  WRITE_CONCERN: { w: 'majority', j: true },
  MAX_TIME_MS: 30000 // 30 seconds
} as const;

/**
 * GridFS settings
 */
export const GRIDFS_SETTINGS = {
  CHUNK_SIZE: 261120, // 255KB
  MAX_FILE_SIZE: 16777216, // 16MB
  ALLOWED_EXTENSIONS: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.txt'],
  UPLOAD_TIMEOUT: 30000 // 30 seconds
} as const;

/**
 * Performance monitoring
 */
export const PERFORMANCE_MONITORING = {
  SLOW_QUERY_THRESHOLD: 1000, // 1 second
  MEMORY_WARNING_THRESHOLD: 70, // 70%
  CONNECTION_WARNING_THRESHOLD: 80 // 80%
} as const;
