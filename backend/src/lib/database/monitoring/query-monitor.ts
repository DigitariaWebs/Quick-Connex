/**
 * Query Monitor
 * 
 * Singleton class for tracking query execution times,
 * identifying slow queries, and calculating performance statistics.
 */

import { 
  QueryStats, 
  RecentQuery, 
  PerformanceMetrics,
  DatabaseEvent,
  QueryEvent,
  SlowQueryEvent
} from '../../../types/database';
import { MONITORING_THRESHOLDS, PERFORMANCE_PERCENTILES } from '../core/constants';

/**
 * Query Monitor Singleton
 */
export class QueryMonitor {
  private static instance: QueryMonitor;
  private queries: RecentQuery[] = [];
  private enabled = false;
  private slowQueryThreshold: number;
  private maxQueryHistory: number;
  private eventListeners: ((event: DatabaseEvent) => void)[] = [];

  private constructor() {
    this.slowQueryThreshold = MONITORING_THRESHOLDS.SLOW_QUERY;
    this.maxQueryHistory = 1000;
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
   * Enable query monitoring
   */
  enable(): void {
    this.enabled = true;
    console.log('Query monitoring enabled');
  }

  /**
   * Disable query monitoring
   */
  disable(): void {
    this.enabled = false;
    console.log('Query monitoring disabled');
  }

  /**
   * Check if monitoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Track query execution
   */
  trackQuery(
    operation: string,
    model: string,
    executionTime: number,
    success: boolean,
    error?: string
  ): void {
    if (!this.enabled) {
      return;
    }

    const query: RecentQuery = {
      id: this.generateQueryId(),
      operation,
      model,
      executionTime,
      timestamp: new Date(),
      success,
      error,
      slow: executionTime > this.slowQueryThreshold
    };

    // Add to queries array
    this.queries.push(query);

    // Maintain max history
    if (this.queries.length > this.maxQueryHistory) {
      this.queries = this.queries.slice(-this.maxQueryHistory);
    }

    // Emit events
    this.emitQueryEvent(query);
    
    if (query.slow) {
      this.emitSlowQueryEvent(query);
    }
  }

  /**
   * Get query statistics
   */
  getQueryStats(): QueryStats {
    if (this.queries.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        slowQueries: 0,
        queriesByType: {},
        recentQueries: [],
        performanceMetrics: this.getEmptyPerformanceMetrics()
      };
    }

    const successfulQueries = this.queries.filter(q => q.success);
    const slowQueries = this.queries.filter(q => q.slow);
    
    const queriesByType = this.queries.reduce((acc, query) => {
      acc[query.operation] = (acc[query.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const executionTimes = successfulQueries.map(q => q.executionTime);
    const averageExecutionTime = executionTimes.length > 0 
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length 
      : 0;

    return {
      totalQueries: this.queries.length,
      averageExecutionTime,
      slowQueries: slowQueries.length,
      queriesByType,
      recentQueries: this.queries.slice(-50), // Last 50 queries
      performanceMetrics: this.calculatePerformanceMetrics(executionTimes)
    };
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit: number = 10): RecentQuery[] {
    return this.queries
      .filter(q => q.slow)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  /**
   * Get queries by operation type
   */
  getQueriesByOperation(operation: string, limit: number = 10): RecentQuery[] {
    return this.queries
      .filter(q => q.operation === operation)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get queries by model
   */
  getQueriesByModel(model: string, limit: number = 10): RecentQuery[] {
    return this.queries
      .filter(q => q.model === model)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get performance metrics for time range
   */
  getPerformanceMetrics(
    startTime?: Date,
    endTime?: Date
  ): PerformanceMetrics {
    let filteredQueries = this.queries.filter(q => q.success);
    
    if (startTime) {
      filteredQueries = filteredQueries.filter(q => q.timestamp >= startTime);
    }
    
    if (endTime) {
      filteredQueries = filteredQueries.filter(q => q.timestamp <= endTime);
    }

    const executionTimes = filteredQueries.map(q => q.executionTime);
    
    if (executionTimes.length === 0) {
      return this.getEmptyPerformanceMetrics();
    }

    return this.calculatePerformanceMetrics(executionTimes);
  }

  /**
   * Set slow query threshold
   */
  setSlowQueryThreshold(threshold: number): void {
    this.slowQueryThreshold = threshold;
    console.log(`Slow query threshold set to ${threshold}ms`);
  }

  /**
   * Set max query history
   */
  setMaxQueryHistory(maxHistory: number): void {
    this.maxQueryHistory = maxHistory;
    
    // Trim existing queries if necessary
    if (this.queries.length > maxHistory) {
      this.queries = this.queries.slice(-maxHistory);
    }
    
    console.log(`Max query history set to ${maxHistory}`);
  }

  /**
   * Clear query history
   */
  clearHistory(): void {
    this.queries = [];
    console.log('Query history cleared');
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: DatabaseEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: DatabaseEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Get monitoring configuration
   */
  getConfiguration(): {
    enabled: boolean;
    slowQueryThreshold: number;
    maxQueryHistory: number;
    totalQueries: number;
  } {
    return {
      enabled: this.enabled,
      slowQueryThreshold: this.slowQueryThreshold,
      maxQueryHistory: this.maxQueryHistory,
      totalQueries: this.queries.length
    };
  }

  /**
   * Generate unique query ID
   */
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(executionTimes: number[]): PerformanceMetrics {
    if (executionTimes.length === 0) {
      return this.getEmptyPerformanceMetrics();
    }

    const sorted = [...executionTimes].sort((a, b) => a - b);
    const length = sorted.length;

    const p50 = this.calculatePercentile(sorted, PERFORMANCE_PERCENTILES.P50);
    const p95 = this.calculatePercentile(sorted, PERFORMANCE_PERCENTILES.P95);
    const p99 = this.calculatePercentile(sorted, PERFORMANCE_PERCENTILES.P99);
    
    const max = Math.max(...executionTimes);
    const min = Math.min(...executionTimes);
    
    const mean = executionTimes.reduce((sum, time) => sum + time, 0) / length;
    const variance = executionTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / length;
    const standardDeviation = Math.sqrt(variance);

    return {
      p50,
      p95,
      p99,
      max,
      min,
      standardDeviation
    };
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(sorted: number[], percentile: number): number {
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get empty performance metrics
   */
  private getEmptyPerformanceMetrics(): PerformanceMetrics {
    return {
      p50: 0,
      p95: 0,
      p99: 0,
      max: 0,
      min: 0,
      standardDeviation: 0
    };
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

    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in query event listener:', error);
      }
    });
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
        query: {} // In a real implementation, you might include the actual query
      }
    };

    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in slow query event listener:', error);
      }
    });
  }

  /**
   * Get query summary for logging
   */
  getQuerySummary(): string {
    const stats = this.getQueryStats();
    return `Queries: ${stats.totalQueries}, Avg: ${stats.averageExecutionTime.toFixed(2)}ms, Slow: ${stats.slowQueries}`;
  }

  /**
   * Export query data
   */
  exportQueryData(): {
    queries: RecentQuery[];
    stats: QueryStats;
    configuration: any;
  } {
    return {
      queries: [...this.queries],
      stats: this.getQueryStats(),
      configuration: this.getConfiguration()
    };
  }

  /**
   * Import query data
   */
  importQueryData(data: { queries: RecentQuery[] }): void {
    if (Array.isArray(data.queries)) {
      this.queries = data.queries.map(query => ({
        ...query,
        timestamp: new Date(query.timestamp)
      }));
      console.log(`Imported ${this.queries.length} queries`);
    }
  }
}
