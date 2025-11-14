/**
 * Database Service Types
 * 
 * Comprehensive TypeScript types for the centralized database service.
 * Provides type safety and clear interfaces for all database operations.
 */

import { Document, Model, Types, Connection } from 'mongoose';
import { Readable, Writable } from 'stream';

// ===== CONFIGURATION TYPES =====

export interface DatabaseConfig {
  uri?: string;
  options?: {
    bufferCommands?: boolean;
    bufferMaxEntries?: number;
    maxPoolSize?: number;
    minPoolSize?: number;
    maxIdleTimeMS?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
    connectTimeoutMS?: number;
    retryWrites?: boolean;
    retryReads?: boolean;
    readPreference?: 'primary' | 'secondary' | 'primaryPreferred' | 'secondaryPreferred' | 'nearest';
    writeConcern?: {
      w?: number | 'majority';
      j?: boolean;
      wtimeout?: number;
    };
    authSource?: string;
    ssl?: boolean;
    tls?: boolean;
    tlsInsecure?: boolean;
  };
  monitoring?: MonitoringConfig;
  cache?: CacheConfig;
}

export interface MonitoringConfig {
  enabled?: boolean;
  slowQueryThreshold?: number; // milliseconds
  maxQueryHistory?: number;
  trackConnectionPool?: boolean;
  trackMemoryUsage?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface CacheConfig {
  enabled?: boolean;
  defaultTTL?: number; // seconds
  maxSize?: number; // number of entries
  cleanupInterval?: number; // seconds
}

// ===== QUERY OPTIONS =====

export interface QueryOptions {
  retry?: RetryConfig;
  monitor?: boolean;
  timeout?: number; // milliseconds
  lean?: boolean;
  populate?: PopulateOptions | PopulateOptions[];
  select?: string | Record<string, 0 | 1>;
  sort?: Record<string, 1 | -1> | string;
  limit?: number;
  skip?: number;
  session?: any; // Mongoose session
  readPreference?: 'primary' | 'secondary' | 'primaryPreferred' | 'secondaryPreferred' | 'nearest';
  writeConcern?: any;
  hint?: any;
  comment?: string;
  maxTimeMS?: number;
  collation?: any;
  allowDiskUse?: boolean;
}

export interface RetryConfig {
  attempts?: number;
  backoff?: 'linear' | 'exponential' | 'fixed';
  delay?: number; // milliseconds
  maxDelay?: number; // milliseconds
  jitter?: boolean;
  retryCondition?: (error: any) => boolean;
}

export interface TransactionOptions {
  readPreference?: 'primary' | 'secondary' | 'primaryPreferred' | 'secondaryPreferred' | 'nearest';
  readConcern?: any;
  writeConcern?: any;
  maxCommitTimeMS?: number;
  retryWrites?: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
  sort?: Record<string, 1 | -1> | string;
  totalCount?: boolean;
}

// ===== GRIDFS TYPES =====

export interface GridFSFileMetadata {
  userId: string;
  documentType: 'cv' | 'opiqPermit' | 'rcr';
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  uploadedAt: Date;
  tags?: string[];
  description?: string;
  isPublic?: boolean;
  expiresAt?: Date;
}

export interface GridFSUploadOptions {
  metadata?: Partial<GridFSFileMetadata>;
  chunkSizeBytes?: number;
  bucketName?: string;
  aliases?: string[];
  contentType?: string;
}

export interface GridFSDownloadOptions {
  start?: number;
  end?: number;
  bucketName?: string;
}

export interface GridFSFileInfo {
  _id: string;
  filename: string;
  length: number;
  chunkSize: number;
  uploadDate: Date;
  contentType?: string;
  aliases?: string[];
  metadata?: GridFSFileMetadata;
}

// ===== POPULATION TYPES =====

export interface PopulateOptions {
  path: string;
  select?: string | Record<string, 0 | 1>;
  model?: string | Model<any>;
  match?: any;
  options?: any;
  populate?: PopulateOptions | PopulateOptions[];
  transform?: (doc: any, ret: any) => any;
}

// ===== STATISTICS TYPES =====

export interface ConnectionStats {
  state: 'connected' | 'connecting' | 'disconnected' | 'disconnecting';
  host: string;
  port: number;
  name: string;
  readyState: number;
  collections: number;
  models: number;
  plugins: string[];
  config: any;
}

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

export interface PoolStats {
  totalConnections: number;
  availableConnections: number;
  inUseConnections: number;
  waitingRequests: number;
  maxPoolSize: number;
  minPoolSize: number;
  maxIdleTimeMS: number;
  serverSelectionTimeoutMS: number;
  socketTimeoutMS: number;
  connectTimeoutMS: number;
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

export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'critical';
  connection: ConnectionHealth;
  performance: PerformanceHealth;
  memory: MemoryHealth;
  issues: string[];
  recommendations: string[];
  lastChecked: Date;
}

export interface ConnectionHealth {
  connected: boolean;
  readyState: number;
  host: string;
  port: number;
  database: string;
  uptime: number;
  lastActivity: Date;
}

export interface PerformanceHealth {
  averageQueryTime: number;
  slowQueryCount: number;
  connectionPoolUtilization: number;
  indexHitRatio: number;
  cacheHitRatio: number;
}

export interface MemoryHealth {
  used: number;
  available: number;
  total: number;
  utilization: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

// ===== OPERATION TYPES =====

export interface BulkWriteOperation {
  insertOne?: { document: any };
  updateOne?: { filter: any; update: any; upsert?: boolean };
  updateMany?: { filter: any; update: any; upsert?: boolean };
  replaceOne?: { filter: any; replacement: any; upsert?: boolean };
  deleteOne?: { filter: any };
  deleteMany?: { filter: any };
}

export interface BulkWriteResult {
  insertedCount: number;
  matchedCount: number;
  modifiedCount: number;
  deletedCount: number;
  upsertedCount: number;
  upsertedIds: Record<string, any>;
  insertedIds: Record<string, any>;
}

export interface AggregationOptions {
  allowDiskUse?: boolean;
  maxTimeMS?: number;
  batchSize?: number;
  cursor?: any;
  hint?: any;
  comment?: string;
  readPreference?: 'primary' | 'secondary' | 'primaryPreferred' | 'secondaryPreferred' | 'nearest';
  readConcern?: any;
  collation?: any;
}

// ===== RESULT TYPES =====

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface QueryResult<T> {
  data: T | T[];
  count?: number;
  executionTime: number;
  cached: boolean;
  query: any;
  options: QueryOptions;
}

export interface TransactionResult<T> {
  result: T;
  session: any;
  executionTime: number;
  operations: number;
}

// ===== ERROR TYPES =====

export interface DatabaseError extends Error {
  code?: number;
  codeName?: string;
  keyPattern?: any;
  keyValue?: any;
  errors?: Record<string, any>;
  operation?: string;
  model?: string;
  query?: any;
  options?: QueryOptions;
}

// ===== UTILITY TYPES =====

export type ModelType<T = any> = Model<T & Document>;
export type DocumentType<T = any> = T & Document;
export type ObjectId = Types.ObjectId;

export interface DatabaseServiceConfig {
  connection?: DatabaseConfig;
  monitoring?: MonitoringConfig;
  cache?: CacheConfig;
  models?: {
    autoIndex?: boolean;
    autoCreate?: boolean;
    strict?: boolean;
  };
}

// ===== EVENT TYPES =====

export interface DatabaseEvent {
  type: 'connect' | 'disconnect' | 'error' | 'query' | 'slow_query' | 'transaction';
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

// ===== TRANSACTION CALLBACK TYPES =====

export interface TransactionCallback<T> {
  (session: any): Promise<T>;
}

// ===== SERVICE CONFIGURATION TYPES =====

export interface DatabaseServiceConfig {
  connection?: DatabaseConfig;
  monitoring?: MonitoringConfig;
  cache?: CacheConfig;
  models?: {
    autoIndex?: boolean;
    autoCreate?: boolean;
    strict?: boolean;
  };
}

// ===== MODEL REGISTRY TYPES =====

export interface ModelRegistry {
  [key: string]: Model<any>;
}

export interface ModelRegistration {
  name: string;
  model: Model<any>;
  schema?: any;
  options?: any;
}

// ===== QUERY BUILDER TYPES =====

export interface QueryBuilder {
  build(): any;
  match(filter: any): QueryBuilder;
  sort(sort: any): QueryBuilder;
  limit(limit: number): QueryBuilder;
  skip(skip: number): QueryBuilder;
  populate(populate: PopulateOptions | PopulateOptions[]): QueryBuilder;
  select(select: string | Record<string, 0 | 1>): QueryBuilder;
}

export interface FilterBuilder {
  build(): any;
  and(condition: any): FilterBuilder;
  or(condition: any): FilterBuilder;
  not(condition: any): FilterBuilder;
  exists(field: string, exists?: boolean): FilterBuilder;
  in(field: string, values: any[]): FilterBuilder;
  nin(field: string, values: any[]): FilterBuilder;
  eq(field: string, value: any): FilterBuilder;
  ne(field: string, value: any): FilterBuilder;
  gt(field: string, value: any): FilterBuilder;
  gte(field: string, value: any): FilterBuilder;
  lt(field: string, value: any): FilterBuilder;
  lte(field: string, value: any): FilterBuilder;
  regex(field: string, pattern: string, options?: string): FilterBuilder;
  text(search: string, options?: any): FilterBuilder;
  near(field: string, coordinates: [number, number], maxDistance?: number): FilterBuilder;
  within(field: string, geometry: any): FilterBuilder;
}

// ===== ADVANCED QUERY TYPES =====

export interface SearchOptions {
  text?: string;
  fields?: string[];
  fuzzy?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

export interface DateRange {
  start?: Date;
  end?: Date;
  field?: string;
}

export interface GeoQuery {
  type: 'point' | 'polygon' | 'lineString';
  coordinates: number[] | number[][];
  maxDistance?: number;
  minDistance?: number;
}

export interface FacetOptions {
  [key: string]: any;
}

export interface GroupByOptions {
  _id: any;
  [key: string]: any;
}

// ===== CACHING TYPES =====

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

// ===== MONITORING ENHANCEMENTS =====

export interface DatabaseMetrics {
  connectionPool: PoolStats;
  queryPerformance: QueryStats;
  memoryUsage: MemoryHealth;
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

// ===== BATCH OPERATION TYPES =====

export interface BatchOperation<T> {
  operation: 'create' | 'update' | 'delete' | 'upsert';
  data: T | Partial<T>;
  filter?: any;
  options?: QueryOptions;
}

export interface BatchResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  index: number;
}

export interface BatchOperationResult<T> {
  results: BatchResult<T>[];
  successCount: number;
  errorCount: number;
  totalCount: number;
  executionTime: number;
}

// ===== MIGRATION TYPES =====

export interface Migration {
  version: string;
  name: string;
  up: (session?: any) => Promise<void>;
  down: (session?: any) => Promise<void>;
  dependencies?: string[];
  description?: string;
}

export interface MigrationResult {
  version: string;
  name: string;
  success: boolean;
  executionTime: number;
  error?: string;
}

export interface MigrationStatus {
  currentVersion: string;
  availableMigrations: Migration[];
  pendingMigrations: Migration[];
  migrationHistory: MigrationResult[];
}

// ===== BACKUP TYPES =====

export interface BackupOptions {
  collections?: string[];
  excludeCollections?: string[];
  compression?: boolean;
  encryption?: boolean;
  metadata?: boolean;
}

export interface BackupResult {
  backupId: string;
  filename: string;
  size: number;
  collections: string[];
  timestamp: Date;
  checksum: string;
  metadata: any;
}

export interface RestoreOptions {
  backupId: string;
  collections?: string[];
  dropExisting?: boolean;
  validate?: boolean;
}

export interface RestoreResult {
  success: boolean;
  collections: string[];
  documents: number;
  executionTime: number;
  error?: string;
}

// ===== EXPORT ALL TYPES =====

export type {
  Document,
  Model,
  Types,
  Connection,
  Readable,
  Writable
};
