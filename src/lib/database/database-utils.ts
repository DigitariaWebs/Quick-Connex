/**
 * Database Utilities
 * 
 * Helper functions for the DatabaseService that leverage existing utility modules.
 * Provides clean, reusable functions for common database operations.
 */

import { Types, Model, Document, Query } from 'mongoose';
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
  getNestedProperty,
  setNestedProperty 
} from '../utils/data-helpers';
import { 
  formatDate, 
  formatDateTimeForDisplay,
  getCurrentTimestamp,
  isValidDate,
  parseDate 
} from '../utils/date-time';
import { 
  truncate, 
  capitalize, 
  slugify,
  maskSensitiveData,
  cleanText 
} from '../utils/string-helpers';
import { 
  retry, 
  withTimeout, 
  batchProcess,
  createConcurrencyLimiter 
} from '../utils/async-helpers';
import { QueryOptions, PopulateOptions, PaginationOptions } from './database-types';

/**
 * Validate MongoDB ObjectId
 */
export function validateObjectId(id: any): string {
  if (!id) {
    throw new ValidationError('ID is required');
  }

  const stringId = typeof id === 'string' ? id : id.toString();
  
  if (!isValidObjectId(stringId)) {
    throw new ValidationError('Invalid ObjectId format');
  }

  return stringId;
}

/**
 * Sanitize query input to prevent injection attacks
 */
export function sanitizeQueryInput(input: any): any {
  if (typeof input === 'string') {
    return sanitizeString(input);
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeQueryInput(item));
  }
  
  if (isPlainObject(input)) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeString(key)] = sanitizeQueryInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Build complex query with filters using query-params utils
 */
export function buildQueryWithFilters(
  baseQuery: any = {}, 
  filters: {
    search?: string;
    dateRange?: { start?: Date; end?: Date };
    filters?: Record<string, any>;
    sort?: SortParams;
    pagination?: PaginationParams;
  } = {}
): {
  query: any;
  sort: any;
  pagination: PaginationParams;
} {
  let query = { ...baseQuery };

  // Add search functionality
  if (filters.search) {
    const searchRegex = new RegExp(escapeRegex(filters.search), 'i');
    query.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
      { name: searchRegex },
      { title: searchRegex }
    ];
  }

  // Add date range filter
  if (filters.dateRange) {
    const dateRangeParams = {
      startDate: filters.dateRange.start?.toISOString(),
      endDate: filters.dateRange.end?.toISOString()
    };
    const dateQuery = buildDateRangeQuery(dateRangeParams, 'createdAt');
    query = combineQueries(query, dateQuery);
  }

  // Add custom filters
  if (filters.filters) {
    const filterQuery = buildMongoQuery(filters.filters);
    query = combineQueries(query, filterQuery);
  }

  // Build sort
  const sort = filters.sort ? buildMongoSort(filters.sort) : { createdAt: -1 };

  // Build pagination
  const pagination = filters.pagination || { page: 1, limit: 10, offset: 0 };

  return {
    query: cleanQuery(query),
    sort,
    pagination
  };
}

/**
 * Transform database error to standardized format
 */
export function transformDatabaseError(error: any): DatabaseError {
  if (error.name === 'ValidationError') {
    return new ValidationError(
      formatMongooseErrors(error.errors).message,
      { originalError: error }
    );
  }

  if (error.name === 'CastError') {
    return new ValidationError(
      `Invalid ${error.path}: ${error.value}`,
      { originalError: error }
    );
  }

  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    return new DatabaseError(
      error.message,
      {
        code: error.code,
        codeName: error.codeName,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue,
        originalError: error
      }
    );
  }

  if (error.name === 'DocumentNotFoundError') {
    return new NotFoundError('Document not found');
  }

  return new DatabaseError(
    error.message || 'Database operation failed',
    { originalError: error }
  );
}

/**
 * Parse populate options for Mongoose queries
 */
export function parsePopulateOptions(options: PopulateOptions | PopulateOptions[]): any {
  if (Array.isArray(options)) {
    return options.map(opt => parsePopulateOptions(opt));
  }

  const populate: any = {
    path: options.path
  };

  if (options.select) {
    populate.select = options.select;
  }

  if (options.model) {
    populate.model = options.model;
  }

  if (options.match) {
    populate.match = sanitizeQueryInput(options.match);
  }

  if (options.options) {
    populate.options = sanitizeQueryInput(options.options);
  }

  if (options.populate) {
    populate.populate = parsePopulateOptions(options.populate);
  }

  if (options.transform) {
    populate.transform = options.transform;
  }

  return populate;
}

/**
 * Build aggregation pipeline with validation
 */
export function buildAggregationPipeline(config: {
  match?: any;
  group?: any;
  sort?: any;
  limit?: number;
  skip?: number;
  project?: any;
  unwind?: any;
  lookup?: any;
  facet?: any;
}): any[] {
  const pipeline: any[] = [];

  // Add match stage
  if (config.match) {
    pipeline.push({
      $match: sanitizeQueryInput(config.match)
    });
  }

  // Add lookup stages
  if (config.lookup) {
    const lookups = Array.isArray(config.lookup) ? config.lookup : [config.lookup];
    lookups.forEach(lookup => {
      pipeline.push({
        $lookup: sanitizeQueryInput(lookup)
      });
    });
  }

  // Add unwind stage
  if (config.unwind) {
    pipeline.push({
      $unwind: config.unwind
    });
  }

  // Add group stage
  if (config.group) {
    pipeline.push({
      $group: sanitizeQueryInput(config.group)
    });
  }

  // Add project stage
  if (config.project) {
    pipeline.push({
      $project: sanitizeQueryInput(config.project)
    });
  }

  // Add facet stage
  if (config.facet) {
    pipeline.push({
      $facet: sanitizeQueryInput(config.facet)
    });
  }

  // Add sort stage
  if (config.sort) {
    pipeline.push({
      $sort: sanitizeQueryInput(config.sort)
    });
  }

  // Add skip stage
  if (config.skip && config.skip > 0) {
    pipeline.push({
      $skip: config.skip
    });
  }

  // Add limit stage
  if (config.limit && config.limit > 0) {
    pipeline.push({
      $limit: config.limit
    });
  }

  return pipeline;
}

/**
 * Optimize query for better performance
 */
export function optimizeQuery(query: any): {
  query: any;
  hints: string[];
  warnings: string[];
} {
  const hints: string[] = [];
  const warnings: string[] = [];

  // Check for missing indexes
  if (query.$or && Array.isArray(query.$or)) {
    warnings.push('$or queries can be slow - consider adding compound indexes');
  }

  if (query.$regex) {
    warnings.push('Regex queries without anchors (^$) can be slow');
  }

  // Check for range queries
  const rangeFields = ['createdAt', 'updatedAt', 'date', 'timestamp'];
  const hasRangeQuery = Object.keys(query).some(key => 
    rangeFields.includes(key) && 
    (query[key].$gte || query[key].$lte || query[key].$gt || query[key].$lt)
  );

  if (hasRangeQuery) {
    hints.push('Consider adding indexes on date/time fields for range queries');
  }

  // Check for text search
  if (query.$text) {
    hints.push('Text search requires text index - ensure it exists');
  }

  // Check for sort without index
  if (query.sort && !query.hint) {
    warnings.push('Sorting without index hint may be slow on large datasets');
  }

  return {
    query,
    hints,
    warnings
  };
}

/**
 * Estimate query performance cost
 */
export function estimateQueryPerformance(model: Model<any>, query: any): {
  estimatedCost: 'low' | 'medium' | 'high';
  factors: string[];
  recommendations: string[];
} {
  const factors: string[] = [];
  const recommendations: string[] = [];

  let cost: 'low' | 'medium' | 'high' = 'low';

  // Check for $or queries
  if (query.$or && Array.isArray(query.$or) && query.$or.length > 3) {
    factors.push('Multiple $or conditions');
    cost = 'medium';
  }

  // Check for regex queries
  if (query.$regex || Object.values(query).some((v: any) => 
    typeof v === 'object' && v.$regex
  )) {
    factors.push('Regex queries');
    cost = 'medium';
  }

  // Check for range queries on multiple fields
  const rangeFields = Object.keys(query).filter(key => 
    typeof query[key] === 'object' && 
    (query[key].$gte || query[key].$lte || query[key].$gt || query[key].$lt)
  );

  if (rangeFields.length > 2) {
    factors.push('Multiple range queries');
    cost = 'high';
  }

  // Check for text search
  if (query.$text) {
    factors.push('Text search');
    cost = 'medium';
  }

  // Generate recommendations
  if (cost === 'high') {
    recommendations.push('Consider adding compound indexes');
    recommendations.push('Use pagination to limit results');
    recommendations.push('Consider caching frequently accessed data');
  }

  if (cost === 'medium') {
    recommendations.push('Monitor query performance');
    recommendations.push('Consider adding specific indexes');
  }

  return {
    estimatedCost: cost,
    factors,
    recommendations
  };
}

/**
 * Create paginated result
 */
export function createPaginatedResult<T>(
  data: T[],
  pagination: PaginationParams,
  totalCount: number
): PaginatedResult<T> {
  return paginateResults(data, pagination.page, pagination.limit, totalCount);
}

/**
 * Safe object transformation for database operations
 */
export function safeTransformObject(obj: any, options: {
  excludeFields?: string[];
  includeFields?: string[];
  transformDates?: boolean;
  sanitizeStrings?: boolean;
} = {}): any {
  const {
    excludeFields = [],
    includeFields = [],
    transformDates = true,
    sanitizeStrings = true
  } = options;

  if (!isPlainObject(obj)) {
    return obj;
  }

  let transformed = { ...obj };

  // Filter fields
  if (includeFields.length > 0) {
    transformed = pickFields(transformed, includeFields);
  }

  if (excludeFields.length > 0) {
    transformed = omitFields(transformed, excludeFields);
  }

  // Transform each field
  for (const [key, value] of Object.entries(transformed)) {
    if (value === null || value === undefined) {
      continue;
    }

    // Transform dates
    if (transformDates && value instanceof Date) {
      transformed[key] = value.toISOString();
    }

    // Sanitize strings
    if (sanitizeStrings && typeof value === 'string') {
      transformed[key] = sanitizeString(value);
    }

    // Transform nested objects
    if (isPlainObject(value)) {
      transformed[key] = safeTransformObject(value, options);
    }

    // Transform arrays
    if (Array.isArray(value)) {
      transformed[key] = value.map(item => 
        isPlainObject(item) ? safeTransformObject(item, options) : item
      );
    }
  }

  return transformed;
}

/**
 * Create query options with defaults
 */
export function createQueryOptions(options: Partial<QueryOptions> = {}): QueryOptions {
  return {
    lean: true,
    timeout: 30000,
    retry: {
      attempts: 3,
      backoff: 'exponential',
      delay: 1000,
      maxDelay: 10000
    },
    monitor: false,
    ...options
  };
}

/**
 * Validate and sanitize query options
 */
export function validateQueryOptions(options: QueryOptions): QueryOptions {
  const validated = { ...options };

  // Validate timeout
  if (validated.timeout && (validated.timeout < 1000 || validated.timeout > 300000)) {
    validated.timeout = 30000; // Default to 30 seconds
  }

  // Validate retry config
  if (validated.retry) {
    if (validated.retry.attempts && (validated.retry.attempts < 1 || validated.retry.attempts > 10)) {
      validated.retry.attempts = 3;
    }
    if (validated.retry.delay && (validated.retry.delay < 100 || validated.retry.delay > 60000)) {
      validated.retry.delay = 1000;
    }
  }

  // Validate limit
  if (validated.limit && (validated.limit < 1 || validated.limit > 1000)) {
    validated.limit = 100;
  }

  return validated;
}

/**
 * Escape regex special characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Log database operation for debugging
 */
export function logDatabaseOperation(
  operation: string,
  model: string,
  query: any,
  options: QueryOptions,
  executionTime: number,
  success: boolean,
  error?: any
): void {
  const logData = {
    operation,
    model,
    query: sanitizeQueryInput(query),
    options: {
      lean: options.lean,
      timeout: options.timeout,
      monitor: options.monitor
    },
    executionTime,
    success,
    timestamp: new Date().toISOString()
  };

  if (success) {
    console.log(`📊 Database: ${operation} on ${model} completed in ${executionTime}ms`);
  } else {
    console.error(`❌ Database: ${operation} on ${model} failed after ${executionTime}ms:`, error);
    log.error(`Database ${operation} on ${model} failed`, error, {
      operation,
      model,
      query: sanitizeQueryInput(query),
      executionTime
    });
  }
}
