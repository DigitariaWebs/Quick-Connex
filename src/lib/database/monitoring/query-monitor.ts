/**
 * Query Monitor
 * 
 * Optional query performance tracking and monitoring for the DatabaseService.
 * Provides insights into query performance, slow queries, and optimization opportunities.
 */

import { QueryStats, RecentQuery, PerformanceMetrics, QueryEvent, SlowQueryEvent } from '../core/types';
import { groupBy, sortBy, chunk } from '../../utils/data-helpers';
import { formatDuration, getCurrentTimestamp } from '../../utils/date-time';

/**
 * Query Monitor Class
 * 
 * Tracks and analyzes database query performance with features:
 * - Query execution time tracking
 * - Slow query identification and alerting
 * - Performance metrics calculation (p50, p95, p99)
 * - Query history and trending
 * - Memory-efficient storage with automatic cleanup
 */
export class QueryMonitor {
  private static instance: QueryMonitor;
  private enabled = false;
  private slowQueryThreshold = 1000; // milliseconds
  private maxQueryHistory = 1000;
  private queryHistory: RecentQuery[] = [];
  private queryStats: QueryStats = {
    totalQueries: 0,
    averageExecutionTime: 0,
    slowQueries: 0,
    queriesByType: {},
    recentQueries: [],
    performanceMetrics: {
      p50: 0,
      p95: 0,
      p99: 0,
      max: 0,
      min: 0,
      standardDeviation: 0
    }
  };
  private eventListeners: Map<string, Function[]> = new Map();

  private constructor() {
    // Auto-cleanup old queries periodically
    setInterval(() => {
      this.cleanupOldQueries();
    }, 300000); // Every 5 minutes
  }

  /**
   * Get singleton instance
   */
  static getInstance(): QueryMonitor {
    if (!QueryMonitor.instance) {
      QueryMonitor.instance = new QueryMonitor();
    }
    return QueryMonitor.instance;
  }

  /**
   * Enable monitoring
   */
  enable(): void {
    this.enabled = true;
    console.log('📊 Query Monitor: Enabled');
  }

  /**
   * Disable monitoring
   */
  disable(): void {
    this.enabled = false;
    console.log('📊 Query Monitor: Disabled');
  }

  /**
   * Check if monitoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set slow query threshold
   */
  setSlowQueryThreshold(threshold: number): void {
    this.slowQueryThreshold = threshold;
    console.log(`📊 Query Monitor: Slow query threshold set to ${threshold}ms`);
  }

  /**
   * Set maximum query history
   */
  setMaxQueryHistory(max: number): void {
    this.maxQueryHistory = max;
    console.log(`📊 Query Monitor: Max query history set to ${max}`);
  }

  /**
   * Track a query execution
   */
  trackQuery(operation: string, model: string, executionTime: number, success: boolean, error?: string): void {
    if (!this.enabled) return;

    const queryId = this.generateQueryId();
    const timestamp = new Date();
    const isSlow = executionTime > this.slowQueryThreshold;

    const recentQuery: RecentQuery = {
      id: queryId,
      operation,
      model,
      executionTime,
      timestamp,
      success,
      error,
      slow: isSlow
    };

    // Add to history
    this.queryHistory.unshift(recentQuery);
    
    // Maintain max history size
    if (this.queryHistory.length > this.maxQueryHistory) {
      this.queryHistory = this.queryHistory.slice(0, this.maxQueryHistory);
    }

    // Update statistics
    this.updateQueryStats(recentQuery);

    // Emit events
    this.emitQueryEvent(recentQuery);

    if (isSlow) {
      this.emitSlowQueryEvent(recentQuery);
    }

    // Log slow queries
    if (isSlow) {
      console.warn(`🐌 Slow Query Detected: ${operation} on ${model} took ${formatDuration(executionTime)}`);
    }
  }

  /**
   * Generate unique query ID
   */
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update query statistics
   */
  private updateQueryStats(query: RecentQuery): void {
    this.queryStats.totalQueries++;
    
    if (query.slow) {
      this.queryStats.slowQueries++;
    }

    // Update queries by type
    const typeKey = `${query.operation}_${query.model}`;
    this.queryStats.queriesByType[typeKey] = (this.queryStats.queriesByType[typeKey] || 0) + 1;

    // Update recent queries (last 100)
    this.queryStats.recentQueries = this.queryHistory.slice(0, 100);

    // Recalculate performance metrics
    this.calculatePerformanceMetrics();
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(): void {
    if (this.queryHistory.length === 0) return;

    const executionTimes = this.queryHistory.map(q => q.executionTime);
    const sortedTimes = sortBy(executionTimes, (time) => time);

    // Calculate percentiles
    const p50Index = Math.floor(sortedTimes.length * 0.5);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    this.queryStats.performanceMetrics = {
      p50: sortedTimes[p50Index] || 0,
      p95: sortedTimes[p95Index] || 0,
      p99: sortedTimes[p99Index] || 0,
      max: Math.max(...executionTimes),
      min: Math.min(...executionTimes),
      standardDeviation: this.calculateStandardDeviation(executionTimes)
    };

    // Calculate average execution time
    const totalTime = executionTimes.reduce((sum, time) => sum + time, 0);
    this.queryStats.averageExecutionTime = totalTime / executionTimes.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Get query statistics
   */
  getQueryStats(): QueryStats {
    return { ...this.queryStats };
  }

  /**
   * Get recent queries
   */
  getRecentQueries(limit = 50): RecentQuery[] {
    return this.queryHistory.slice(0, limit);
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit = 20): RecentQuery[] {
    return this.queryHistory
      .filter(query => query.slow)
      .slice(0, limit);
  }

  /**
   * Get queries by model
   */
  getQueriesByModel(model: string, limit = 50): RecentQuery[] {
    return this.queryHistory
      .filter(query => query.model === model)
      .slice(0, limit);
  }

  /**
   * Get queries by operation
   */
  getQueriesByOperation(operation: string, limit = 50): RecentQuery[] {
    return this.queryHistory
      .filter(query => query.operation === operation)
      .slice(0, limit);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalQueries: number;
    averageExecutionTime: number;
    slowQueryCount: number;
    slowQueryPercentage: number;
    topSlowQueries: Array<{ operation: string; model: string; count: number; avgTime: number }>;
    performanceTrend: 'improving' | 'degrading' | 'stable';
  } {
    const slowQueries = this.queryHistory.filter(q => q.slow);
    const slowQueryPercentage = this.queryStats.totalQueries > 0 
      ? (this.queryStats.slowQueries / this.queryStats.totalQueries) * 100 
      : 0;

    // Group slow queries by operation and model
    const slowQueryGroups = groupBy(slowQueries, q => `${q.operation}_${q.model}`);
    const topSlowQueries = Object.entries(slowQueryGroups)
      .map(([key, queries]) => {
        const [operation, model] = key.split('_');
        const avgTime = queries.reduce((sum, q) => sum + q.executionTime, 0) / queries.length;
        return { operation, model, count: queries.length, avgTime };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate performance trend (simplified)
    const recentQueries = this.queryHistory.slice(0, 50);
    const olderQueries = this.queryHistory.slice(50, 100);
    
    let performanceTrend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (recentQueries.length > 0 && olderQueries.length > 0) {
      const recentAvg = recentQueries.reduce((sum, q) => sum + q.executionTime, 0) / recentQueries.length;
      const olderAvg = olderQueries.reduce((sum, q) => sum + q.executionTime, 0) / olderQueries.length;
      
      if (recentAvg < olderAvg * 0.9) performanceTrend = 'improving';
      else if (recentAvg > olderAvg * 1.1) performanceTrend = 'degrading';
    }

    return {
      totalQueries: this.queryStats.totalQueries,
      averageExecutionTime: this.queryStats.averageExecutionTime,
      slowQueryCount: this.queryStats.slowQueries,
      slowQueryPercentage,
      topSlowQueries,
      performanceTrend
    };
  }

  /**
   * Clear query statistics
   */
  clearStats(): void {
    this.queryHistory = [];
    this.queryStats = {
      totalQueries: 0,
      averageExecutionTime: 0,
      slowQueries: 0,
      queriesByType: {},
      recentQueries: [],
      performanceMetrics: {
        p50: 0,
        p95: 0,
        p99: 0,
        max: 0,
        min: 0,
        standardDeviation: 0
      }
    };
    console.log('📊 Query Monitor: Statistics cleared');
  }

  /**
   * Clean up old queries
   */
  private cleanupOldQueries(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const initialLength = this.queryHistory.length;
    
    this.queryHistory = this.queryHistory.filter(query => query.timestamp > cutoffTime);
    
    const removedCount = initialLength - this.queryHistory.length;
    if (removedCount > 0) {
      console.log(`📊 Query Monitor: Cleaned up ${removedCount} old queries`);
    }
  }

  /**
   * Add event listener
   */
  addEventListener(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit query event
   */
  private emitQueryEvent(query: RecentQuery): void {
    const event: QueryEvent = {
      type: 'query',
      timestamp: query.timestamp,
      data: {
        operation: query.operation,
        model: query.model,
        executionTime: query.executionTime,
        success: query.success,
        error: query.error
      }
    };

    this.emitEvent('query', event);
  }

  /**
   * Emit slow query event
   */
  private emitSlowQueryEvent(query: RecentQuery): void {
    const event: SlowQueryEvent = {
      type: 'slow_query',
      timestamp: query.timestamp,
      data: {
        operation: query.operation,
        model: query.model,
        executionTime: query.executionTime,
        threshold: this.slowQueryThreshold,
        query: {} // Could include actual query details
      }
    };

    this.emitEvent('slow_query', event);
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('📊 Query Monitor: Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Export query data for analysis
   */
  exportData(): {
    stats: QueryStats;
    recentQueries: RecentQuery[];
    slowQueries: RecentQuery[];
    performanceSummary: any;
  } {
    return {
      stats: this.getQueryStats(),
      recentQueries: this.getRecentQueries(100),
      slowQueries: this.getSlowQueries(50),
      performanceSummary: this.getPerformanceSummary()
    };
  }
}


