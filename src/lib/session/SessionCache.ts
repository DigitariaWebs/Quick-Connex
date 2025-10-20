/**
 * Session Cache
 * 
 * Simple, clean session caching with TTL support.
 * Single responsibility: cache session data.
 */

export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
}

export class SessionCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  
  constructor(config: CacheConfig = { maxSize: 1000, defaultTTL: 5 * 60 * 1000 }) {
    this.config = config;
  }
  
  /**
   * Get cached session data
   */
  get(sessionId: string): any | null {
    const entry = this.cache.get(sessionId);
    
    if (!entry) {
      return null;
    }
    
    if (this.isExpired(entry)) {
      this.cache.delete(sessionId);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Set session data in cache
   */
  set(sessionId: string, data: any, ttl?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(sessionId, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL
    });
  }
  
  /**
   * Remove session from cache
   */
  delete(sessionId: string): void {
    this.cache.delete(sessionId);
  }
  
  /**
   * Clear all expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize
    };
  }
  
  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }
}
