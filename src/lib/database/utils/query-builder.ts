/**
 * Database Query Builder Utilities
 * 
 * Query building, pagination, and sorting utilities for database operations.
 */

import { Types } from 'mongoose';
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
} from '../../utils/query-params';
import { QueryOptions } from '../core/types';
import { 
  sanitizeString, 
  sanitizeQueryInput 
} from '../../utils/request-validation';

/**
 * Create query options with defaults
 */
export function createQueryOptions(options: Partial<QueryOptions> = {}): QueryOptions {
  return {
    timeout: options.timeout || 30000,
    lean: options.lean || false,
    populate: options.populate,
    select: options.select,
    sort: options.sort,
    limit: options.limit,
    skip: options.skip,
    session: options.session,
    readPreference: options.readPreference,
    writeConcern: options.writeConcern,
    hint: options.hint,
    comment: options.comment,
    maxTimeMS: options.maxTimeMS,
    collation: options.collation,
    allowDiskUse: options.allowDiskUse,
    ...options
  };
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

    // Sanitize string values
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
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
  if (!filters || Object.keys(filters).length === 0) {
    return {};
  }

  const sanitizedFilters = sanitizeQueryParams(filters);
  return buildMongoQuery(sanitizedFilters);
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
  const { page = 1, limit = 10 } = parsePagination(pagination as any);
  
  return {
    skip: (page - 1) * limit,
    limit: Math.min(limit, 100) // Cap at 100
  };
}

// Note: QueryOptions is now imported from core/types
