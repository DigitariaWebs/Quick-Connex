/**
 * Unified Database Monitoring Types
 * 
 * Consolidated types from both monitoring systems for consistent
 * database performance tracking and analysis.
 */

export interface DatabaseMetrics {
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: number;
  connectionPoolSize: number;
  activeConnections: number;
  idleConnections: number;
  databaseSize: number;
  indexHitRatio: number;
  cacheHitRatio: number;
  queriesPerSecond: number;
  uptime: number;
  version: string;
  host: string;
  port: number;
}

export interface QueryPerformance {
  query: string;
  executionTime: number;
  timestamp: Date;
  type: 'select' | 'insert' | 'update' | 'delete' | 'aggregate';
  collection: string;
  slow: boolean;
  operation: string;
}

export interface ConnectionInfo {
  id: string;
  status: 'active' | 'idle' | 'waiting';
  connectedAt: Date;
  lastQuery: Date;
  queryCount: number;
  totalTime: number;
  user: string;
  host: string;
  port: number;
}

export interface IndexPerformance {
  name: string;
  collection: string;
  size: number;
  usage: number;
  efficiency: number;
  lastUsed: Date;
  keys: Record<string, number>;
  unique: boolean;
}

export interface DatabaseStats {
  collections: number;
  documents: number;
  indexes: number;
  dataSize: number;
  storageSize: number;
  indexSize: number;
  avgObjSize: number;
}

// DatabaseHealth is imported from ../core/types to avoid duplication

export interface CollectionStats {
  name: string;
  count: number;
  size: number;
  avgObjSize: number;
  storageSize: number;
  totalIndexSize: number;
  indexSizes: Record<string, number>;
}
