/**
 * Database Monitoring Exports
 * 
 * Central exports for monitoring functionality.
 */

// ===== QUERY MONITOR =====
export { QueryMonitor } from './query-monitor';

// ===== DATABASE MONITORING SERVICE =====
export {
  getDatabaseMetrics,
  getDatabaseStats,
  getCollectionStats,
  getIndexPerformance,
  getRecentQueries,
  getConnectionInfo,
  getDatabaseHealth
} from './database-monitoring';

// ===== UNIFIED TYPES =====
export type {
  QueryPerformance,
  ConnectionInfo,
  IndexPerformance,
  DatabaseStats,
  CollectionStats
} from './types';

// Re-export core types to avoid duplication
export type { DatabaseHealth } from '../core/types';
