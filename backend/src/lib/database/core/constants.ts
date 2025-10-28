/**
 * Database Constants
 * 
 * Centralized constants for database operations, timeouts,
 * limits, and default values.
 */

/**
 * Default timeouts (in milliseconds)
 */
export const TIMEOUTS = {
  CONNECTION: 10000,
  QUERY: 30000,
  TRANSACTION: 60000,
  HEALTH_CHECK: 5000,
  CACHE_CLEANUP: 60000,
  RETRY_DELAY: 1000,
  MAX_RETRY_DELAY: 30000
} as const;

/**
 * Default limits
 */
export const LIMITS = {
  MAX_POOL_SIZE: 10,
  MIN_POOL_SIZE: 2,
  MAX_QUERY_HISTORY: 1000,
  MAX_CACHE_SIZE: 1000,
  MAX_BATCH_SIZE: 1000,
  MAX_PAGINATION_LIMIT: 100,
  DEFAULT_PAGINATION_LIMIT: 20,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_GRIDFS_CHUNK_SIZE: 261120 // 255KB
} as const;

/**
 * Default retry configuration
 */
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BACKOFF_MULTIPLIER: 2,
  JITTER: true,
  RETRYABLE_ERRORS: [
    'MongoNetworkError',
    'MongoTimeoutError',
    'MongoServerSelectionError'
  ]
} as const;

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  DEFAULT_TTL: 300, // 5 minutes
  CLEANUP_INTERVAL: 60, // 1 minute
  MAX_ENTRIES: 1000,
  KEY_PREFIX: 'db:',
  NAMESPACE_SEPARATOR: ':'
} as const;

/**
 * Monitoring thresholds
 */
export const MONITORING_THRESHOLDS = {
  SLOW_QUERY: 1000, // 1 second
  MEMORY_WARNING: 80, // 80% memory usage
  CONNECTION_WARNING: 80, // 80% connection pool usage
  ERROR_RATE_WARNING: 5, // 5% error rate
  HEALTH_CHECK_INTERVAL: 30000 // 30 seconds
} as const;

/**
 * GridFS configuration
 */
export const GRIDFS_CONFIG = {
  BUCKET_NAME: 'documents',
  CHUNK_SIZE: 261120, // 255KB
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip'
  ],
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  METADATA_FIELDS: [
    'userId',
    'documentType',
    'originalName',
    'mimeType',
    'size',
    'checksum',
    'uploadedAt',
    'tags',
    'description',
    'isPublic',
    'expiresAt'
  ]
} as const;

/**
 * Query optimization hints
 */
export const QUERY_HINTS = {
  USE_INDEX: 'Use index for better performance',
  AVOID_REGEX: 'Avoid regex without anchors (^$) for better performance',
  LIMIT_RESULTS: 'Consider adding limit to prevent large result sets',
  USE_PROJECTION: 'Use projection to limit returned fields',
  AVOID_SORT_WITHOUT_INDEX: 'Sorting without index can be slow',
  USE_COMPOUND_INDEX: 'Consider compound index for multiple fields'
} as const;

/**
 * Error codes mapping
 */
export const ERROR_CODES = {
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  QUERY_ERROR: 'QUERY_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_KEY: 'DUPLICATE_KEY',
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  TRANSACTION_ERROR: 'TRANSACTION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  INDEX_ERROR: 'INDEX_ERROR',
  GRIDFS_ERROR: 'GRIDFS_ERROR',
  CACHE_ERROR: 'CACHE_ERROR'
} as const;

/**
 * Database operation types
 */
export const OPERATION_TYPES = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  AGGREGATE: 'aggregate',
  TRANSACTION: 'transaction',
  GRIDFS_UPLOAD: 'gridfs_upload',
  GRIDFS_DOWNLOAD: 'gridfs_download',
  GRIDFS_DELETE: 'gridfs_delete'
} as const;

/**
 * Connection states
 */
export const CONNECTION_STATES = {
  DISCONNECTED: 0,
  CONNECTED: 1,
  CONNECTING: 2,
  DISCONNECTING: 3
} as const;

/**
 * Health status levels
 */
export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  CRITICAL: 'critical'
} as const;

/**
 * Performance percentiles
 */
export const PERFORMANCE_PERCENTILES = {
  P50: 0.5,
  P95: 0.95,
  P99: 0.99
} as const;

/**
 * Default sort options
 */
export const DEFAULT_SORT = {
  CREATED_AT_DESC: { createdAt: -1 },
  CREATED_AT_ASC: { createdAt: 1 },
  UPDATED_AT_DESC: { updatedAt: -1 },
  UPDATED_AT_ASC: { updatedAt: 1 },
  ID_ASC: { _id: 1 },
  ID_DESC: { _id: -1 }
} as const;

/**
 * Common field names
 */
export const FIELD_NAMES = {
  ID: '_id',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  DELETED_AT: 'deletedAt',
  USER_ID: 'userId',
  STATUS: 'status',
  TYPE: 'type',
  NAME: 'name',
  EMAIL: 'email'
} as const;

/**
 * Validation patterns
 */
export const VALIDATION_PATTERNS = {
  OBJECT_ID: /^[0-9a-fA-F]{24}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  ALPHANUMERIC_WITH_SPACES: /^[a-zA-Z0-9\s]+$/
} as const;

/**
 * Environment-specific defaults
 */
export const ENVIRONMENT_DEFAULTS = {
  DEVELOPMENT: {
    MONITORING_ENABLED: true,
    CACHE_ENABLED: false,
    LOG_LEVEL: 'debug',
    SLOW_QUERY_THRESHOLD: 500
  },
  PRODUCTION: {
    MONITORING_ENABLED: true,
    CACHE_ENABLED: true,
    LOG_LEVEL: 'info',
    SLOW_QUERY_THRESHOLD: 1000
  },
  TEST: {
    MONITORING_ENABLED: false,
    CACHE_ENABLED: false,
    LOG_LEVEL: 'error',
    SLOW_QUERY_THRESHOLD: 100
  }
} as const;
