/**
 * Health Check Utilities
 * 
 * Utilities for database health checks, performance metrics
 * calculation, memory usage monitoring, and connection pool monitoring.
 */

import { 
  DatabaseHealth, 
  PerformanceHealth, 
  MemoryHealth,
  ConnectionHealth,
  DatabaseMetrics,
  IndexUsageStats
} from '../../../types/database';
import { HEALTH_STATUS, MONITORING_THRESHOLDS } from '../core/constants';

/**
 * Calculate performance health metrics
 */
export function calculatePerformanceHealth(
  queryStats: any,
  connectionStats: any
): PerformanceHealth {
  return {
    averageQueryTime: queryStats?.averageExecutionTime || 0,
    slowQueryCount: queryStats?.slowQueries || 0,
    connectionPoolUtilization: calculateConnectionPoolUtilization(connectionStats),
    indexHitRatio: calculateIndexHitRatio(queryStats),
    cacheHitRatio: queryStats?.cacheHitRatio || 0
  };
}

/**
 * Calculate memory health metrics
 */
export function calculateMemoryHealth(): MemoryHealth {
  const memoryUsage = process.memoryUsage();
  const utilization = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  return {
    used: memoryUsage.heapUsed,
    available: memoryUsage.heapTotal - memoryUsage.heapUsed,
    total: memoryUsage.heapTotal,
    utilization,
    heapUsed: memoryUsage.heapUsed,
    heapTotal: memoryUsage.heapTotal,
    external: memoryUsage.external
  };
}

/**
 * Calculate connection pool utilization
 */
export function calculateConnectionPoolUtilization(connectionStats: any): number {
  if (!connectionStats || !connectionStats.maxPoolSize) {
    return 0;
  }
  
  const inUseConnections = connectionStats.inUseConnections || 0;
  const maxPoolSize = connectionStats.maxPoolSize;
  
  return (inUseConnections / maxPoolSize) * 100;
}

/**
 * Calculate index hit ratio
 */
export function calculateIndexHitRatio(queryStats: any): number {
  if (!queryStats || !queryStats.totalQueries) {
    return 95; // Default optimistic value
  }
  
  const indexHits = queryStats.indexHits || 0;
  const totalQueries = queryStats.totalQueries;
  
  return totalQueries > 0 ? (indexHits / totalQueries) * 100 : 95;
}

/**
 * Perform comprehensive database health check
 */
export async function performDatabaseHealthCheck(
  connection: any,
  queryStats: any,
  connectionStats: any
): Promise<DatabaseHealth> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check connection health
  const connectionHealth = await checkConnectionHealth(connection);
  if (!connectionHealth.connected) {
    issues.push('Database connection is not active');
    recommendations.push('Check database connectivity and configuration');
  }
  
  // Check performance health
  const performanceHealth = calculatePerformanceHealth(queryStats, connectionStats);
  if (performanceHealth.averageQueryTime > MONITORING_THRESHOLDS.SLOW_QUERY) {
    issues.push(`Average query time is high: ${performanceHealth.averageQueryTime}ms`);
    recommendations.push('Consider optimizing queries or adding indexes');
  }
  
  if (performanceHealth.slowQueryCount > 10) {
    issues.push(`High number of slow queries: ${performanceHealth.slowQueryCount}`);
    recommendations.push('Review and optimize slow queries');
  }
  
  if (performanceHealth.connectionPoolUtilization > MONITORING_THRESHOLDS.CONNECTION_WARNING) {
    issues.push(`High connection pool utilization: ${performanceHealth.connectionPoolUtilization.toFixed(1)}%`);
    recommendations.push('Consider increasing connection pool size');
  }
  
  if (performanceHealth.indexHitRatio < 80) {
    issues.push(`Low index hit ratio: ${performanceHealth.indexHitRatio.toFixed(1)}%`);
    recommendations.push('Review and optimize database indexes');
  }
  
  // Check memory health
  const memoryHealth = calculateMemoryHealth();
  if (memoryHealth.utilization > MONITORING_THRESHOLDS.MEMORY_WARNING) {
    issues.push(`High memory utilization: ${memoryHealth.utilization.toFixed(1)}%`);
    recommendations.push('Monitor memory usage and consider garbage collection');
  }
  
  // Determine overall status
  let status: 'healthy' | 'degraded' | 'critical' = HEALTH_STATUS.HEALTHY;
  if (issues.length > 3) {
    status = HEALTH_STATUS.CRITICAL;
  } else if (issues.length > 0) {
    status = HEALTH_STATUS.DEGRADED;
  }
  
  return {
    status,
    connection: connectionHealth,
    performance: performanceHealth,
    memory: memoryHealth,
    issues,
    recommendations,
    lastChecked: new Date()
  };
}

/**
 * Check connection health
 */
export async function checkConnectionHealth(connection: any): Promise<ConnectionHealth> {
  const startTime = Date.now();
  
  if (!connection) {
    return {
      connected: false,
      readyState: 0,
      host: 'unknown',
      port: 0,
      database: 'unknown',
      uptime: 0,
      lastActivity: new Date()
    };
  }
  
  try {
    // Simple ping to check connection
    await connection.db.admin().ping();
    
    return {
      connected: connection.readyState === 1,
      readyState: connection.readyState,
      host: connection.host || 'unknown',
      port: connection.port || 0,
      database: connection.name || 'unknown',
      uptime: Date.now() - startTime,
      lastActivity: new Date()
    };
  } catch (error) {
    return {
      connected: false,
      readyState: connection.readyState,
      host: connection.host || 'unknown',
      port: connection.port || 0,
      database: connection.name || 'unknown',
      uptime: Date.now() - startTime,
      lastActivity: new Date()
    };
  }
}

/**
 * Calculate database metrics
 */
export function calculateDatabaseMetrics(
  connectionStats: any,
  queryStats: any,
  memoryHealth: MemoryHealth,
  indexStats: IndexUsageStats,
  slowQueries: any[],
  errors: any[]
): DatabaseMetrics {
  return {
    connectionPool: connectionStats,
    queryPerformance: queryStats,
    memoryUsage: memoryHealth,
    indexUsage: indexStats,
    slowQueries,
    errors,
    uptime: process.uptime() * 1000, // Convert to milliseconds
    lastActivity: new Date()
  };
}

/**
 * Calculate index usage statistics
 */
export function calculateIndexUsageStats(
  collectionStats: any[] = []
): IndexUsageStats {
  const totalIndexes = collectionStats.reduce((sum, stats) => sum + (stats.indexes || 0), 0);
  const usedIndexes = collectionStats.reduce((sum, stats) => sum + (stats.usedIndexes || 0), 0);
  const unusedIndexes: string[] = [];
  
  // Calculate unused indexes (simplified)
  collectionStats.forEach(stats => {
    if (stats.unusedIndexes) {
      unusedIndexes.push(...stats.unusedIndexes);
    }
  });
  
  const indexHitRatio = totalIndexes > 0 ? (usedIndexes / totalIndexes) * 100 : 100;
  const indexSize = collectionStats.reduce((sum, stats) => sum + (stats.indexSize || 0), 0);
  
  const recommendations: string[] = [];
  if (indexHitRatio < 80) {
    recommendations.push('Consider removing unused indexes');
  }
  if (unusedIndexes.length > 0) {
    recommendations.push(`Remove unused indexes: ${unusedIndexes.join(', ')}`);
  }
  
  return {
    totalIndexes,
    usedIndexes,
    unusedIndexes,
    indexHitRatio,
    indexSize,
    recommendations
  };
}

/**
 * Monitor memory usage
 */
export function monitorMemoryUsage(): {
  current: MemoryHealth;
  peak: MemoryHealth;
  trend: 'increasing' | 'decreasing' | 'stable';
} {
  const current = calculateMemoryHealth();
  
  // In a real implementation, you'd track historical data
  const peak: MemoryHealth = {
    ...current,
    utilization: Math.max(current.utilization, 85) // Simulated peak
  };
  
  // Simulate trend calculation
  const trend: 'increasing' | 'decreasing' | 'stable' = 
    current.utilization > 80 ? 'increasing' : 
    current.utilization < 50 ? 'decreasing' : 'stable';
  
  return { current, peak, trend };
}

/**
 * Check for memory leaks
 */
export function checkForMemoryLeaks(
  memoryHistory: MemoryHealth[] = []
): {
  hasLeak: boolean;
  severity: 'low' | 'medium' | 'high';
  recommendations: string[];
} {
  if (memoryHistory.length < 10) {
    return {
      hasLeak: false,
      severity: 'low',
      recommendations: ['Collect more memory usage data for leak detection']
    };
  }
  
  // Simple leak detection based on trend
  const recent = memoryHistory.slice(-5);
  const older = memoryHistory.slice(-10, -5);
  
  const recentAvg = recent.reduce((sum, m) => sum + m.utilization, 0) / recent.length;
  const olderAvg = older.reduce((sum, m) => sum + m.utilization, 0) / older.length;
  
  const increase = recentAvg - olderAvg;
  
  let hasLeak = false;
  let severity: 'low' | 'medium' | 'high' = 'low';
  const recommendations: string[] = [];
  
  if (increase > 10) {
    hasLeak = true;
    severity = 'high';
    recommendations.push('Potential memory leak detected - investigate memory usage patterns');
    recommendations.push('Consider garbage collection or memory optimization');
  } else if (increase > 5) {
    hasLeak = true;
    severity = 'medium';
    recommendations.push('Monitor memory usage trend - potential leak developing');
  }
  
  return { hasLeak, severity, recommendations };
}

/**
 * Generate health report
 */
export function generateHealthReport(health: DatabaseHealth): {
  summary: string;
  details: Record<string, any>;
  actionItems: string[];
} {
  const actionItems: string[] = [];
  
  // Generate summary
  let summary = `Database is ${health.status}`;
  if (health.issues.length > 0) {
    summary += ` with ${health.issues.length} issue${health.issues.length > 1 ? 's' : ''}`;
  }
  
  // Add action items based on issues
  health.issues.forEach(issue => {
    if (issue.includes('connection')) {
      actionItems.push('Check database connection configuration');
    }
    if (issue.includes('query time')) {
      actionItems.push('Optimize slow queries');
    }
    if (issue.includes('memory')) {
      actionItems.push('Monitor memory usage and optimize');
    }
    if (issue.includes('index')) {
      actionItems.push('Review and optimize database indexes');
    }
  });
  
  // Add recommendations as action items
  actionItems.push(...health.recommendations);
  
  const details = {
    status: health.status,
    connection: {
      connected: health.connection.connected,
      host: health.connection.host,
      database: health.connection.database
    },
    performance: {
      averageQueryTime: `${health.performance.averageQueryTime}ms`,
      slowQueries: health.performance.slowQueryCount,
      connectionPoolUtilization: `${health.performance.connectionPoolUtilization.toFixed(1)}%`,
      indexHitRatio: `${health.performance.indexHitRatio.toFixed(1)}%`
    },
    memory: {
      utilization: `${health.memory.utilization.toFixed(1)}%`,
      used: `${Math.round(health.memory.used / 1024 / 1024)}MB`,
      total: `${Math.round(health.memory.total / 1024 / 1024)}MB`
    },
    issues: health.issues,
    lastChecked: health.lastChecked
  };
  
  return { summary, details, actionItems };
}

/**
 * Health check scheduler
 */
export class HealthCheckScheduler {
  private interval: NodeJS.Timeout | null = null;
  private callbacks: ((health: DatabaseHealth) => void)[] = [];
  
  constructor(
    private healthCheckFn: () => Promise<DatabaseHealth>,
    private intervalMs: number = MONITORING_THRESHOLDS.HEALTH_CHECK_INTERVAL
  ) {}
  
  start(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
    
    this.interval = setInterval(async () => {
      try {
        const health = await this.healthCheckFn();
        this.callbacks.forEach(callback => callback(health));
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, this.intervalMs);
  }
  
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  
  onHealthUpdate(callback: (health: DatabaseHealth) => void): void {
    this.callbacks.push(callback);
  }
  
  removeCallback(callback: (health: DatabaseHealth) => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }
}
