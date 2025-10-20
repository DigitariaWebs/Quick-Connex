/**
 * Vercel SSE Cache
 * 
 * Caching layer for Vercel-compatible SSE notifications.
 * Follows clean architecture principles - only handles caching.
 */

import { TransferNotification } from './NotificationService';

export interface VercelSSECacheConfig {
  maxCacheSize: number;
  ttl: number;
  cleanupInterval: number;
}

export const VERCEL_SSE_CACHE_CONFIG: VercelSSECacheConfig = {
  maxCacheSize: 100,
  ttl: 300000, // 5 minutes
  cleanupInterval: 60000 // 1 minute
};

export class VercelSSECache {
  private static instance: VercelSSECache;
  
  // Notification cache
  private notificationCache: Map<string, { notification: TransferNotification; timestamp: number }> = new Map();
  
  // Cache statistics
  private cacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    cleanups: 0
  };

  // Cleanup timer
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startCleanupTimer();
  }

  public static getInstance(): VercelSSECache {
    if (!VercelSSECache.instance) {
      VercelSSECache.instance = new VercelSSECache();
    }
    return VercelSSECache.instance;
  }

  /**
   * Cache a notification
   */
  public setNotification(notificationId: string, notification: TransferNotification): void {
    this.notificationCache.set(notificationId, {
      notification,
      timestamp: Date.now()
    });
    this.cacheStats.sets++;
    
    // Enforce cache size limit
    if (this.notificationCache.size > VERCEL_SSE_CACHE_CONFIG.maxCacheSize) {
      this.cleanupOldNotifications();
    }
  }

  /**
   * Get a cached notification
   */
  public getNotification(notificationId: string): TransferNotification | null {
    const cached = this.notificationCache.get(notificationId);
    if (!cached) {
      this.cacheStats.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - cached.timestamp > VERCEL_SSE_CACHE_CONFIG.ttl) {
      this.notificationCache.delete(notificationId);
      this.cacheStats.misses++;
      return null;
    }

    this.cacheStats.hits++;
    return cached.notification;
  }

  /**
   * Remove a notification from cache
   */
  public removeNotification(notificationId: string): void {
    if (this.notificationCache.delete(notificationId)) {
      this.cacheStats.deletes++;
    }
  }

  /**
   * Get all cached notifications
   */
  public getAllNotifications(): TransferNotification[] {
    const now = Date.now();
    const notifications: TransferNotification[] = [];
    
    this.notificationCache.forEach((cached, notificationId) => {
      if (now - cached.timestamp <= VERCEL_SSE_CACHE_CONFIG.ttl) {
        notifications.push(cached.notification);
      } else {
        this.notificationCache.delete(notificationId);
      }
    });
    
    return notifications;
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    sets: number;
    deletes: number;
    cleanups: number;
  } {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return {
      size: this.notificationCache.size,
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      hitRate: total > 0 ? this.cacheStats.hits / total : 0,
      sets: this.cacheStats.sets,
      deletes: this.cacheStats.deletes,
      cleanups: this.cacheStats.cleanups
    };
  }

  /**
   * Clear expired notifications
   */
  private cleanupOldNotifications(): void {
    const now = Date.now();
    const expired: string[] = [];
    
    this.notificationCache.forEach((cached, notificationId) => {
      if (now - cached.timestamp > VERCEL_SSE_CACHE_CONFIG.ttl) {
        expired.push(notificationId);
      }
    });
    
    expired.forEach(notificationId => this.notificationCache.delete(notificationId));
    this.cacheStats.cleanups++;
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldNotifications();
    }, VERCEL_SSE_CACHE_CONFIG.cleanupInterval);
  }

  /**
   * Clear all cache
   */
  public clear(): void {
    this.notificationCache.clear();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      cleanups: 0
    };
  }

  /**
   * Get cache size
   */
  public getSize(): number {
    return this.notificationCache.size;
  }

  /**
   * Check if cache is full
   */
  public isFull(): boolean {
    return this.getSize() >= VERCEL_SSE_CACHE_CONFIG.maxCacheSize;
  }

  /**
   * Cleanup method
   */
  public cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}
