/**
 * Cache Utilities
 * 
 * In-memory caching layer with TTL management,
 * cache invalidation strategies, and statistics tracking.
 */

import { CacheConfig, CacheStats, CacheOptions, CacheInvalidationOptions } from '../../../types/database';
import { CACHE_CONFIG } from '../core/constants';

/**
 * Cache entry interface
 */
interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
}

/**
 * In-memory cache implementation
 */
export class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    maxSize: CACHE_CONFIG.MAX_ENTRIES,
    entries: 0,
    memoryUsage: 0,
    evictions: 0
  };
  private cleanupInterval: NodeJS.Timeout | null = null;
  private config: CacheConfig;

  constructor(config: CacheConfig = {}) {
    this.config = {
      enabled: config.enabled ?? CACHE_CONFIG.DEFAULT_TTL > 0,
      defaultTTL: config.defaultTTL ?? CACHE_CONFIG.DEFAULT_TTL,
      maxSize: config.maxSize ?? CACHE_CONFIG.MAX_ENTRIES,
      cleanupInterval: config.cleanupInterval ?? CACHE_CONFIG.CLEANUP_INTERVAL
    };

    if (this.config.enabled) {
      this.startCleanup();
    }
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    if (!this.config.enabled) {
      this.stats.misses++;
      return null;
    }

    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    this.stats.hits++;
    this.updateHitRate();
    
    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    if (!this.config.enabled) {
      return;
    }

    const ttl = options.ttl ?? this.config.defaultTTL ?? CACHE_CONFIG.DEFAULT_TTL;
    const tags = options.tags ?? [];
    
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + (ttl * 1000),
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      tags
    };

    // Check if we need to evict entries
    const maxSize = this.config.maxSize ?? CACHE_CONFIG.MAX_ENTRIES;
    if (this.cache.size >= maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.updateStats();
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.updateStats();
  }

  /**
   * Invalidate cache by pattern
   */
  invalidate(options: CacheInvalidationOptions = {}): number {
    let deletedCount = 0;

    if (options.pattern) {
      const regex = new RegExp(options.pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          deletedCount++;
        }
      }
    }

    if (options.tags && options.tags.length > 0) {
      for (const [key, entry] of this.cache.entries()) {
        if (entry.tags.some(tag => options.tags!.includes(tag))) {
          this.cache.delete(key);
          deletedCount++;
        }
      }
    }

    if (options.namespace) {
      const prefix = `${options.namespace}${CACHE_CONFIG.NAMESPACE_SEPARATOR}`;
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
          deletedCount++;
        }
      }
    }

    this.updateStats();
    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval! * 1000);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cache cleanup: removed ${cleanedCount} expired entries`);
      this.updateStats();
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.entries = this.cache.size;
    this.stats.size = this.cache.size;
    this.stats.memoryUsage = this.estimateMemoryUsage();
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry.value).length * 2;
      totalSize += 100; // Overhead for entry metadata
    }
    
    return totalSize;
  }

  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

/**
 * Generate cache key
 */
export function generateCacheKey(
  prefix: string,
  params: Record<string, any> = {},
  namespace?: string
): string {
  const parts = [prefix];
  
  if (namespace) {
    parts.unshift(namespace);
  }
  
  // Sort params for consistent keys
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${JSON.stringify(params[key])}`)
    .join('|');
  
  if (sortedParams) {
    parts.push(sortedParams);
  }
  
  return parts.join(CACHE_CONFIG.NAMESPACE_SEPARATOR);
}

/**
 * Check if query should be cached
 */
export function shouldCacheQuery(
  operation: string,
  modelName: string,
  options: any = {}
): boolean {
  // Don't cache write operations
  if (['create', 'update', 'delete', 'insert', 'remove'].includes(operation)) {
    return false;
  }
  
  // Don't cache if explicitly disabled
  if (options.cache === false) {
    return false;
  }
  
  // Don't cache if session is provided (transactions)
  if (options.session) {
    return false;
  }
  
  return true;
}

/**
 * Create cache key for query
 */
export function createQueryCacheKey(
  operation: string,
  _modelName: string,
  query: any,
  options: any = {}
): string {
  const params = {
    operation,
    query: JSON.stringify(query),
    options: JSON.stringify({
      select: options.select,
      sort: options.sort,
      limit: options.limit,
      skip: options.skip,
      populate: options.populate
    })
  };
  
  return generateCacheKey('query', params, 'db');
}

/**
 * Create cache key for document
 */
export function createDocumentCacheKey(
  _modelName: string,
  id: string,
  options: any = {}
): string {
  const params = {
    id,
    options: JSON.stringify({
      select: options.select,
      populate: options.populate
    })
  };
  
  return generateCacheKey('document', params, 'db');
}

/**
 * Cache middleware for database operations
 */
export function withCache<T>(
  cache: MemoryCache,
  key: string,
  operation: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      // Try to get from cache first
      const cached = cache.get<T>(key);
      if (cached !== null) {
        resolve(cached);
        return;
      }
      
      // Execute operation
      const result = await operation();
      
      // Store in cache
      cache.set(key, result, options);
      
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Cache invalidation helpers
 */
export class CacheInvalidator {
  constructor(private cache: MemoryCache) {}

  /**
   * Invalidate by model
   */
  invalidateModel(modelName: string): number {
    return this.cache.invalidate({
      pattern: `db:.*:model:${modelName}`
    });
  }

  /**
   * Invalidate by document ID
   */
  invalidateDocument(modelName: string, id: string): number {
    return this.cache.invalidate({
      pattern: `db:.*:model:${modelName}.*:id:${id}`
    });
  }

  /**
   * Invalidate by tags
   */
  invalidateByTags(tags: string[]): number {
    return this.cache.invalidate({ tags });
  }

  /**
   * Invalidate all database cache
   */
  invalidateAll(): number {
    return this.cache.invalidate({
      namespace: 'db'
    });
  }
}

// Global cache instance
let globalCache: MemoryCache | null = null;

/**
 * Get global cache instance
 */
export function getGlobalCache(config?: CacheConfig): MemoryCache {
  if (!globalCache) {
    globalCache = new MemoryCache(config);
  }
  return globalCache;
}

/**
 * Destroy global cache
 */
export function destroyGlobalCache(): void {
  if (globalCache) {
    globalCache.destroy();
    globalCache = null;
  }
}
