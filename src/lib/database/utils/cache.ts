/**
 * Database Cache Utilities
 * 
 * Cache key generation and cache management utilities for database operations.
 */

import { createHash } from 'crypto';

/**
 * Generate cache key for database operation
 */
export function generateCacheKey(operation: string, params: any): string {
  const keyData = {
    operation,
    params: JSON.stringify(params, Object.keys(params).sort())
  };
  
  const hash = createHash('md5')
    .update(JSON.stringify(keyData))
    .digest('hex');
    
  return `db:${operation}:${hash}`;
}

/**
 * Check if query should be cached
 */
export function shouldCacheQuery(operation: string, params: any): boolean {
  // Don't cache write operations
  const writeOperations = ['insert', 'update', 'delete', 'bulkWrite'];
  if (writeOperations.includes(operation)) {
    return false;
  }

  // Don't cache operations with time-sensitive parameters
  if (params && typeof params === 'object') {
    const timeSensitiveFields = ['timestamp', 'createdAt', 'updatedAt', 'date'];
    const hasTimeSensitiveFields = timeSensitiveFields.some(field => 
      params.hasOwnProperty(field)
    );
    
    if (hasTimeSensitiveFields) {
      return false;
    }
  }

  // Cache read operations by default
  return true;
}

/**
 * Get cache TTL based on operation type
 */
export function getCacheTTL(operation: string): number {
  const ttlMap: Record<string, number> = {
    find: 300, // 5 minutes
    findOne: 300, // 5 minutes
    count: 600, // 10 minutes
    aggregate: 300, // 5 minutes
    distinct: 600, // 10 minutes
    default: 300 // 5 minutes
  };

  return ttlMap[operation] || ttlMap.default;
}

/**
 * Generate cache key for pagination
 */
export function generatePaginationCacheKey(
  operation: string, 
  params: any, 
  page: number, 
  limit: number
): string {
  const paginationParams = {
    ...params,
    page,
    limit
  };
  
  return generateCacheKey(operation, paginationParams);
}

/**
 * Generate cache key for aggregation
 */
export function generateAggregationCacheKey(
  collection: string,
  pipeline: any[]
): string {
  const params = {
    collection,
    pipeline: JSON.stringify(pipeline)
  };
  
  return generateCacheKey('aggregate', params);
}

/**
 * Check if cache key is valid
 */
export function isValidCacheKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // Check if key follows our pattern: db:operation:hash
  const pattern = /^db:[a-zA-Z_]+:[a-f0-9]{32}$/;
  return pattern.test(key);
}

/**
 * Extract operation from cache key
 */
export function extractOperationFromCacheKey(key: string): string | null {
  if (!isValidCacheKey(key)) {
    return null;
  }

  const parts = key.split(':');
  return parts[1] || null;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalKeys: number;
  hitRate: number;
  missRate: number;
} {
  // This would typically integrate with a real cache system
  // For now, return mock statistics
  return {
    totalKeys: 0,
    hitRate: 0,
    missRate: 0
  };
}
