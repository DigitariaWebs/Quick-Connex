/**
 * Session Metrics
 * 
 * Simple, clean performance metrics collection.
 * Single responsibility: collect and analyze performance data.
 */

export interface QueryMetric {
  operation: string;
  duration: number;
  timestamp: number;
}

export interface PerformanceMetrics {
  averageQueryTime: number;
  totalQueries: number;
  slowQueries: number;
  cacheHitRate: number;
  memoryUsage: number;
}

export class SessionMetrics {
  private metrics: QueryMetric[] = [];
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private maxMetrics: number = 1000;
  
  /**
   * Record a query metric
   */
  recordQuery(operation: string, duration: number): void {
    this.metrics.push({
      operation,
      duration,
      timestamp: Date.now()
    });
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }
  
  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.cacheHits++;
  }
  
  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    this.cacheMisses++;
  }
  
  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const totalQueries = this.metrics.length;
    const averageQueryTime = totalQueries > 0 
      ? Math.round(this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries)
      : 0;
    
    const slowQueries = this.metrics.filter(m => m.duration > 1000).length;
    
    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalCacheRequests > 0 
      ? Math.round((this.cacheHits / totalCacheRequests) * 100)
      : 0;
    
    return {
      averageQueryTime,
      totalQueries,
      slowQueries,
      cacheHitRate,
      memoryUsage: this.getMemoryUsage()
    };
  }
  
  /**
   * Get query distribution
   */
  getQueryDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const metric of this.metrics) {
      distribution[metric.operation] = (distribution[metric.operation] || 0) + 1;
    }
    
    return distribution;
  }
  
  /**
   * Clear old metrics
   */
  clearOldMetrics(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }
  
  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    if (process.memoryUsage) {
      return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    }
    return 0;
  }
}
