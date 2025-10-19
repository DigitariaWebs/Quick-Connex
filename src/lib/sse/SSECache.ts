/**
 * SSE Cache Component
 * 
 * Handles caching for SSE connections and messages.
 * Similar to SessionCache in the session system.
 */

import { SSEMessage, SSEClient, SSEPerformanceMetrics } from './SSETypes';

export interface SSECacheConfig {
  maxCacheSize: number;
  ttl: number;
  cleanupInterval: number;
  enableMetrics: boolean;
}

export const SSE_CACHE_CONFIG: SSECacheConfig = {
  maxCacheSize: 1000,
  ttl: 300000, // 5 minutes
  cleanupInterval: 60000, // 1 minute
  enableMetrics: true
};

export class SSECache {
  private static instance: SSECache;
  
  // Message cache
  private messageCache: Map<string, { message: SSEMessage; timestamp: number }> = new Map();
  
  // Client cache
  private clientCache: Map<string, { client: SSEClient; timestamp: number }> = new Map();
  
  // Performance metrics
  private metrics: SSEPerformanceMetrics = {
    averageConnectionTime: 0,
    averageMessageLatency: 0,
    connectionSuccessRate: 0,
    messageDeliveryRate: 0,
    activeConnections: 0,
    totalMessages: 0,
    errorRate: 0
  };
  
  // Cache statistics
  private cacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    cleanups: 0
  };

  private constructor() {
    if (SSE_CACHE_CONFIG.enableMetrics) {
      this.startCleanupTimer();
    }
  }

  public static getInstance(): SSECache {
    if (!SSECache.instance) {
      SSECache.instance = new SSECache();
    }
    return SSECache.instance;
  }

  /**
   * Cache a message
   */
  public setMessage(messageId: string, message: SSEMessage): void {
    this.messageCache.set(messageId, {
      message,
      timestamp: Date.now()
    });
    this.cacheStats.sets++;
    
    // Enforce cache size limit
    if (this.messageCache.size > SSE_CACHE_CONFIG.maxCacheSize) {
      this.cleanupOldMessages();
    }
  }

  /**
   * Get a cached message
   */
  public getMessage(messageId: string): SSEMessage | null {
    const cached = this.messageCache.get(messageId);
    if (!cached) {
      this.cacheStats.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - cached.timestamp > SSE_CACHE_CONFIG.ttl) {
      this.messageCache.delete(messageId);
      this.cacheStats.misses++;
      return null;
    }

    this.cacheStats.hits++;
    return cached.message;
  }

  /**
   * Cache a client
   */
  public setClient(userId: string, client: SSEClient): void {
    this.clientCache.set(userId, {
      client,
      timestamp: Date.now()
    });
    this.cacheStats.sets++;
  }

  /**
   * Get a cached client
   */
  public getClient(userId: string): SSEClient | null {
    const cached = this.clientCache.get(userId);
    if (!cached) {
      this.cacheStats.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - cached.timestamp > SSE_CACHE_CONFIG.ttl) {
      this.clientCache.delete(userId);
      this.cacheStats.misses++;
      return null;
    }

    this.cacheStats.hits++;
    return cached.client;
  }

  /**
   * Remove a client from cache
   */
  public removeClient(userId: string): void {
    if (this.clientCache.delete(userId)) {
      this.cacheStats.deletes++;
    }
  }

  /**
   * Remove a message from cache
   */
  public removeMessage(messageId: string): void {
    if (this.messageCache.delete(messageId)) {
      this.cacheStats.deletes++;
    }
  }

  /**
   * Get all cached clients
   */
  public getAllClients(): SSEClient[] {
    const now = Date.now();
    const clients: SSEClient[] = [];
    
    this.clientCache.forEach((cached, userId) => {
      if (now - cached.timestamp <= SSE_CACHE_CONFIG.ttl) {
        clients.push(cached.client);
      } else {
        this.clientCache.delete(userId);
      }
    });
    
    return clients;
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
      size: this.messageCache.size + this.clientCache.size,
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      hitRate: total > 0 ? this.cacheStats.hits / total : 0,
      sets: this.cacheStats.sets,
      deletes: this.cacheStats.deletes,
      cleanups: this.cacheStats.cleanups
    };
  }

  /**
   * Update performance metrics
   */
  public updateMetrics(metrics: Partial<SSEPerformanceMetrics>): void {
    this.metrics = { ...this.metrics, ...metrics };
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): SSEPerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear expired messages
   */
  private cleanupOldMessages(): void {
    const now = Date.now();
    const expired: string[] = [];
    
    this.messageCache.forEach((cached, messageId) => {
      if (now - cached.timestamp > SSE_CACHE_CONFIG.ttl) {
        expired.push(messageId);
      }
    });
    
    expired.forEach(messageId => this.messageCache.delete(messageId));
    this.cacheStats.cleanups++;
  }

  /**
   * Clear expired clients
   */
  private cleanupOldClients(): void {
    const now = Date.now();
    const expired: string[] = [];
    
    this.clientCache.forEach((cached, userId) => {
      if (now - cached.timestamp > SSE_CACHE_CONFIG.ttl) {
        expired.push(userId);
      }
    });
    
    expired.forEach(userId => this.clientCache.delete(userId));
    this.cacheStats.cleanups++;
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupOldMessages();
      this.cleanupOldClients();
    }, SSE_CACHE_CONFIG.cleanupInterval);
  }

  /**
   * Clear all cache
   */
  public clear(): void {
    this.messageCache.clear();
    this.clientCache.clear();
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
    return this.messageCache.size + this.clientCache.size;
  }

  /**
   * Check if cache is full
   */
  public isFull(): boolean {
    return this.getSize() >= SSE_CACHE_CONFIG.maxCacheSize;
  }
}
