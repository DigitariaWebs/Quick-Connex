/**
 * Database Monitoring Types
 * 
 * Database monitoring, metrics, and performance tracking types.
 */

import { DatabaseError } from './errors.types';

export interface QueryStats {
  totalQueries: number;
  averageExecutionTime: number;
  slowQueries: number;
  queriesByType: Record<string, number>;
  recentQueries: RecentQuery[];
  performanceMetrics: PerformanceMetrics;
}

export interface RecentQuery {
  id: string;
  operation: string;
  model: string;
  executionTime: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  slow: boolean;
}

export interface PerformanceMetrics {
  p50: number; // 50th percentile
  p95: number; // 95th percentile
  p99: number; // 99th percentile
  max: number;
  min: number;
  standardDeviation: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  entries: number;
  memoryUsage: number;
  evictions: number;
}

export interface DatabaseMetrics {
  connectionPool: any; // PoolStats
  queryPerformance: QueryStats;
  memoryUsage: any; // MemoryHealth
  indexUsage: IndexUsageStats;
  slowQueries: RecentQuery[];
  errors: DatabaseError[];
  uptime: number;
  lastActivity: Date;
}

export interface IndexUsageStats {
  totalIndexes: number;
  usedIndexes: number;
  unusedIndexes: string[];
  indexHitRatio: number;
  indexSize: number;
  recommendations: string[];
}

export interface DatabaseAlert {
  id: string;
  type: 'performance' | 'connection' | 'memory' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata: any;
}

export interface DatabaseEvent {
  type: 'connect' | 'disconnect' | 'error' | 'query' | 'slow_query' | 'transaction' | 'alert';
  timestamp: Date;
  data: any;
}

export interface QueryEvent extends DatabaseEvent {
  type: 'query';
  data: {
    operation: string;
    model: string;
    executionTime: number;
    success: boolean;
    error?: string;
  };
}

export interface SlowQueryEvent extends DatabaseEvent {
  type: 'slow_query';
  data: {
    operation: string;
    model: string;
    executionTime: number;
    threshold: number;
    query: any;
  };
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
  tags?: string[]; // Cache tags for invalidation
  namespace?: string; // Cache namespace
}

export interface CacheInvalidationOptions {
  pattern?: string; // Pattern to match keys
  tags?: string[]; // Tags to invalidate
  namespace?: string; // Namespace to clear
}
