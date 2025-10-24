/**
 * Centralized Database Service
 * 
 * Single source of truth for all database operations using Mongoose.
 * Provides clean, consistent API similar to AuthService and AuditService.
 * Integrates with all utility modules for comprehensive functionality.
 */

import mongoose, { Connection, Model, Document, ClientSession, Types } from 'mongoose';
import { 
  retry, 
  withTimeout, 
  batchProcess, 
  createConcurrencyLimiter,
  sleep 
} from '../utils/async-helpers';
import { 
  DatabaseError, 
  ValidationError, 
  NotFoundError,
  transformDatabaseError
} from '../utils/error-handling';
import { log } from '@/lib/services';
import { 
  sanitizeString, 
  sanitizeQueryInput 
} from '../utils/request-validation';
import { 
  createQueryOptions,
  validateObjectId 
} from './database-utils';
import { 
  parsePagination, 
  buildMongoQuery, 
  buildMongoSort,
  buildDateRangeQuery,
  combineQueries,
  cleanQuery,
  PaginationParams,
  SortParams,
  FilterParams
} from '../utils/query-params';
import { 
  objectIdToString, 
  isValidObjectId, 
  transformArray,
  paginateResults,
  PaginatedResult 
} from '../utils/transformers';
import { 
  groupBy, 
  sortBy, 
  filterBy, 
  unique, 
  pickFields, 
  omitFields,
  deepMerge,
  isPlainObject,
  getNestedProperty,
  setNestedProperty 
} from '../utils/data-helpers';
import { 
  formatDate, 
  formatDateTimeForDisplay,
  getCurrentTimestamp,
  isValidDate,
  parseDate 
} from '../utils/date-time';
import { 
  truncate, 
  capitalize, 
  slugify,
  maskSensitiveData,
  cleanText 
} from '../utils/string-helpers';
import { QueryMonitor } from './query-monitor';
import { 
  DatabaseConfig, 
  ConnectionStats, 
  PoolStats, 
  DatabaseHealth,
  QueryOptions,
  TransactionOptions,
  PaginationOptions,
  BulkWriteOperation,
  BulkWriteResult,
  AggregationOptions,
  TransactionCallback
} from './database-types';

// ===== CONFIGURATION =====

function getDefaultConfig(): DatabaseConfig {
  return {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/patients-management',
    options: {
      bufferCommands: false,
      maxPoolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true,
      readPreference: 'primary'
    },
    monitoring: {
      enabled: process.env.DATABASE_MONITORING === 'true',
      slowQueryThreshold: parseInt(process.env.DATABASE_SLOW_QUERY_THRESHOLD || '1000'),
      maxQueryHistory: 1000,
      trackConnectionPool: true,
      trackMemoryUsage: true,
      logLevel: 'info'
    }
  };
}

// ===== MAIN DATABASE SERVICE =====

export class DatabaseService {
  private static instance: DatabaseService;
  private connection: Connection | null = null;
  private config: DatabaseConfig;
  private isConnecting = false;
  private connectionPromise: Promise<Connection> | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck: Date | null = null;
  private connectionAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private connectionStartTime: number = 0;
  private modelRegistry: Map<string, Model<any>> = new Map();
  private static queryMonitor: QueryMonitor;

  private constructor(config: DatabaseConfig = {}) {
    this.config = { ...getDefaultConfig(), ...config };
    DatabaseService.queryMonitor = QueryMonitor.getInstance();
    
    if (this.config.monitoring?.enabled) {
      DatabaseService.queryMonitor.enable();
    }
    
    // Auto-initialize database connection
    this.autoInitialize();
  }

  /**
   * Auto-initialize database connection
   */
  private async autoInitialize(): Promise<void> {
    try {
      // Only initialize if not already connected
      if (!this.connection || this.connection.readyState !== 1) {
        log.database('Auto-initializing connection', { operation: 'auto_initialize' });
        await this.performConnection();
        log.database('Auto-initialized successfully', { operation: 'auto_initialize' });
      } else {
        log.database('Already connected', { operation: 'auto_initialize' });
      }
    } catch (error) {
      log.warn('Auto-initialization failed', { operation: 'auto_initialize' });
      // Don't throw error - let individual operations handle connection
    }
  }

  /**
   * Ensure queryMonitor is initialized for static methods
   */
  private static ensureQueryMonitor(): void {
    if (!DatabaseService.queryMonitor) {
      DatabaseService.queryMonitor = QueryMonitor.getInstance();
    }
  }

  /**
   * Ensure database connection before operations
   */
  private static async ensureConnection(): Promise<void> {
    const instance = DatabaseService.getInstance();
    
    if (!instance.connection || instance.connection.readyState !== 1) {
      try {
        log.database('Ensuring connection', { operation: 'ensure_connection' });
        await instance.performConnection();
        log.database('Connection ensured', { operation: 'ensure_connection' });
      } catch (error) {
        log.error('Failed to ensure connection', error, { operation: 'ensure_connection' });
        throw new DatabaseError(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: DatabaseConfig): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(config);
    }
    return DatabaseService.instance;
  }

  // ===== CONNECTION MANAGEMENT =====

  /**
   * Connect to MongoDB with retry logic
   */
  static async connect(): Promise<Connection> {
    const instance = DatabaseService.getInstance();
    return instance.performConnection();
  }

  /**
   * Disconnect from MongoDB
   */
  static async disconnect(): Promise<void> {
    const instance = DatabaseService.getInstance();
    return instance.performDisconnect();
  }

  /**
   * Reconnect to MongoDB
   */
  static async reconnect(): Promise<Connection> {
    const instance = DatabaseService.getInstance();
    return instance.performReconnect();
  }

  /**
   * Check if connected
   */
  static isConnected(): boolean {
    const instance = DatabaseService.getInstance();
    return instance.connection?.readyState === 1;
  }

  /**
   * Get current connection
   */
  static getConnection(): Connection | null {
    const instance = DatabaseService.getInstance();
    return instance.connection;
  }

  /**
   * Get connection state
   */
  static getConnectionState(): ConnectionStats {
    const instance = DatabaseService.getInstance();
    return instance.getConnectionStateInfo();
  }

  /**
   * Get database health
   */
  static async getDatabaseHealth(): Promise<DatabaseHealth> {
    const instance = DatabaseService.getInstance();
    return instance.performHealthCheck();
  }

  /**
   * Get connection pool statistics
   */
  static getPoolStats(): PoolStats {
    const instance = DatabaseService.getInstance();
    return instance.getPoolStatsInfo();
  }

  // ===== CRUD OPERATIONS =====

  /**
   * Create a single document
   */
  static async create<T>(
    model: Model<T>, 
    data: any, 
    options: QueryOptions = {}
  ): Promise<T> {
    const startTime = Date.now();
    const validatedOptions = createQueryOptions(options);
    
    try {
      const sanitizedData = data;
      const document = new model(sanitizedData);
      const result = await document.save({ session: validatedOptions.session });
      
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('create', model.modelName, executionTime, true);
      
      return result as T;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('create', model.modelName, executionTime, false, (error as Error).message);
      throw transformDatabaseError(error);
    }
  }

  /**
   * Create multiple documents
   */
  static async createMany<T>(
    model: Model<T>, 
    data: any[], 
    options: QueryOptions = {}
  ): Promise<T[]> {
    const startTime = Date.now();
    const validatedOptions = createQueryOptions(options);
    
    try {
      const sanitizedData = data;
      const result = await model.insertMany(sanitizedData, { session: validatedOptions.session });
      
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('createMany', model.modelName, executionTime, true);
      
      return result as T[];
    } catch (error) {
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('createMany', model.modelName, executionTime, false, (error as Error).message);
      throw transformDatabaseError(error);
    }
  }

  /**
   * Bulk write operations
   */
  static async insertBulk<T>(
    model: Model<T>, 
    operations: BulkWriteOperation[], 
    options: QueryOptions = {}
  ): Promise<BulkWriteResult> {
    const startTime = Date.now();
    const validatedOptions = createQueryOptions(options);
    
    try {
      const sanitizedOperations = operations;
      const result = await model.bulkWrite(sanitizedOperations as any, { session: validatedOptions.session });
      
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('bulkWrite', model.modelName, executionTime, true);
      
      return result as BulkWriteResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('bulkWrite', model.modelName, executionTime, false, (error as Error).message);
      throw transformDatabaseError(error);
    }
  }

  /**
   * Find document by ID
   */
  static async findById<T>(
    model: Model<T>, 
    id: string, 
    options: QueryOptions = {}
  ): Promise<T | null> {
    const startTime = Date.now();
    const validatedOptions = createQueryOptions(options);
    const validatedId = validateObjectId(id);
    
    // Ensure queryMonitor is initialized
    DatabaseService.ensureQueryMonitor();
    
    try {
      const query = model.findById(validatedId);
      
      if (validatedOptions.populate) {
        query.populate(validatedOptions.populate);
      }
      
      if (validatedOptions.select) {
        query.select(validatedOptions.select);
      }
      
      if (validatedOptions.session) {
        query.session(validatedOptions.session);
      }
      
      const result = await query.lean(validatedOptions.lean).exec();
      
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('findById', model.modelName, executionTime, true);
      
      return result as T;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('findById', model.modelName, executionTime, false, (error as Error).message);
      throw transformDatabaseError(error);
    }
  }

  /**
   * Find one document
   */
  static async findOne<T>(
    model: Model<T>, 
    query: any, 
    options: QueryOptions = {}
  ): Promise<T | null> {
    const startTime = Date.now();
    const validatedOptions = createQueryOptions(options);
    const sanitizedQuery = query;
    
    // Ensure queryMonitor is initialized
    DatabaseService.ensureQueryMonitor();
    
    // Ensure database connection
    await DatabaseService.ensureConnection();
    
    try {
      const mongoQuery = model.findOne(sanitizedQuery);
      
      if (validatedOptions.populate) {
        mongoQuery.populate(validatedOptions.populate);
      }
      
      if (validatedOptions.select) {
        mongoQuery.select(validatedOptions.select);
      }
      
      if (validatedOptions.sort) {
        mongoQuery.sort(validatedOptions.sort);
      }
      
      if (validatedOptions.session) {
        mongoQuery.session(validatedOptions.session);
      }
      
      const result = await mongoQuery.lean(validatedOptions.lean).exec();
      
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('findOne', model.modelName, executionTime, true);
      
      return result as T;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('findOne', model.modelName, executionTime, false, (error as Error).message);
      throw transformDatabaseError(error);
    }
  }

  /**
   * Find multiple documents
   */
  static async findMany<T>(
    model: Model<T>, 
    query: any, 
    options: QueryOptions = {}
  ): Promise<T[]> {
    const startTime = Date.now();
    const validatedOptions = createQueryOptions(options);
    const sanitizedQuery = query;
    
    // Ensure queryMonitor is initialized
    DatabaseService.ensureQueryMonitor();
    
    try {
      const mongoQuery = model.find(sanitizedQuery);
      
      if (validatedOptions.populate) {
        mongoQuery.populate(validatedOptions.populate);
      }
      
      if (validatedOptions.select) {
        mongoQuery.select(validatedOptions.select);
      }
      
      if (validatedOptions.sort) {
        mongoQuery.sort(validatedOptions.sort);
      }
      
      if (validatedOptions.limit) {
        mongoQuery.limit(validatedOptions.limit);
      }
      
      if (validatedOptions.skip) {
        mongoQuery.skip(validatedOptions.skip);
      }
      
      if (validatedOptions.session) {
        mongoQuery.session(validatedOptions.session);
      }
      
      const result = await mongoQuery.lean(validatedOptions.lean).exec();
      
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('findMany', model.modelName, executionTime, true);
      
      return result as T[];
    } catch (error) {
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('findMany', model.modelName, executionTime, false, (error as Error).message);
      throw transformDatabaseError(error);
    }
  }

  /**
   * Find with pagination
   */
  static async findWithPagination<T>(
    model: Model<T>, 
    query: any, 
    pagination: PaginationOptions, 
    options: QueryOptions = {}
  ): Promise<PaginatedResult<T>> {
    const startTime = Date.now();
    const validatedOptions = createQueryOptions(options);
    const sanitizedQuery = query;
    const paginationParams = pagination;
    
    try {
      const [data, totalCount] = await Promise.all([
        model.find(sanitizedQuery)
          .populate(validatedOptions.populate || [])
          .select(validatedOptions.select || {})
          .sort(validatedOptions.sort || {})
          .skip(paginationParams.offset || 0)
          .limit(paginationParams.limit || 10)
          .lean(validatedOptions.lean)
          .session(validatedOptions.session)
          .exec(),
        model.countDocuments(sanitizedQuery).session(validatedOptions.session)
      ]);
      
      const result = paginateResults(data, paginationParams.page || 1, paginationParams.limit || 10, totalCount);
      
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('findWithPagination', model.modelName, executionTime, true);
      
      return result as PaginatedResult<T>;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('findWithPagination', model.modelName, executionTime, false, (error as Error).message);
      throw transformDatabaseError(error);
    }
  }

  /**
   * Update document by ID
   */
  static async updateById<T>(
    model: Model<T>, 
    id: string, 
    update: any, 
    options: QueryOptions = {}
  ): Promise<T | null> {
    const startTime = Date.now();
    const validatedOptions = createQueryOptions(options);
    const validatedId = validateObjectId(id);
    const sanitizedUpdate = update;
    
    try {
      const result = await model.findByIdAndUpdate(
        validatedId,
        sanitizedUpdate,
        { 
          new: true, 
          runValidators: true,
          session: validatedOptions.session 
        }
      ).lean(validatedOptions.lean).exec();
      
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('updateById', model.modelName, executionTime, true);
      
      return result as T;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('updateById', model.modelName, executionTime, false, (error as Error).message);
      throw transformDatabaseError(error);
    }
  }

  /**
   * Update one document
   */
  static async updateOne<T>(
    model: Model<T>, 
    query: any, 
    update: any, 
    options: QueryOptions = {}
  ): Promise<T | null> {
    const startTime = Date.now();
    const validatedOptions = createQueryOptions(options);
    const sanitizedQuery = query;
    const sanitizedUpdate = update;
    
    try {
      const result = await model.findOneAndUpdate(
        sanitizedQuery,
        sanitizedUpdate,
        { 
          new: true, 
          runValidators: true,
          session: validatedOptions.session 
        }
      ).lean(validatedOptions.lean).exec();
      
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('updateOne', model.modelName, executionTime, true);
      
      return result as T;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('updateOne', model.modelName, executionTime, false, (error as Error).message);
      throw transformDatabaseError(error);
    }
  }

  /**
   * Update multiple documents
   */
  static async updateMany<T>(
    model: Model<T>, 
    query: any, 
    update: any, 
    options: QueryOptions = {}
  ): Promise<{ modifiedCount: number }> {
    const startTime = Date.now();
    const validatedOptions = createQueryOptions(options);
    const sanitizedQuery = query;
    const sanitizedUpdate = update;
    
    try {
      const result = await model.updateMany(
        sanitizedQuery,
        sanitizedUpdate,
        { session: validatedOptions.session }
      ).exec();
      
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('updateMany', model.modelName, executionTime, true);
      
      return { modifiedCount: result.modifiedCount };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('updateMany', model.modelName, executionTime, false, (error as Error).message);
      throw transformDatabaseError(error);
    }
  }

  /**
   * Delete document by ID
   */
  static async deleteById<T>(
    model: Model<T>, 
    id: string, 
    options: QueryOptions = {}
  ): Promise<boolean> {
    const startTime = Date.now();
    const validatedOptions = createQueryOptions(options);
    const validatedId = validateObjectId(id);
    
    try {
      const result = await model.findByIdAndDelete(validatedId, { 
        session: validatedOptions.session 
      }).exec();
      
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('deleteById', model.modelName, executionTime, true);
      
      return !!result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('deleteById', model.modelName, executionTime, false, (error as Error).message);
      throw transformDatabaseError(error);
    }
  }

  /**
   * Delete one document
   */
  static async deleteOne<T>(
    model: Model<T>, 
    query: any, 
    options: QueryOptions = {}
  ): Promise<boolean> {
    const startTime = Date.now();
    const validatedOptions = createQueryOptions(options);
    const sanitizedQuery = query;
    
    try {
      const result = await model.findOneAndDelete(sanitizedQuery, { 
        session: validatedOptions.session 
      }).exec();
      
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('deleteOne', model.modelName, executionTime, true);
      
      return !!result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('deleteOne', model.modelName, executionTime, false, (error as Error).message);
      throw transformDatabaseError(error);
    }
  }

  /**
   * Delete multiple documents
   */
  static async deleteMany<T>(
    model: Model<T>, 
    query: any, 
    options: QueryOptions = {}
  ): Promise<{ deletedCount: number }> {
    const startTime = Date.now();
    const validatedOptions = createQueryOptions(options);
    const sanitizedQuery = query;
    
    try {
      const result = await model.deleteMany(sanitizedQuery, { 
        session: validatedOptions.session 
      }).exec();
      
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('deleteMany', model.modelName, executionTime, true);
      
      return { deletedCount: result.deletedCount };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('deleteMany', model.modelName, executionTime, false, (error as Error).message);
      throw transformDatabaseError(error);
    }
  }

  /**
   * Count documents
   */
  static async count<T>(
    model: Model<T>, 
    query: any, 
    options: QueryOptions = {}
  ): Promise<number> {
    const startTime = Date.now();
    const validatedOptions = createQueryOptions(options);
    const sanitizedQuery = query;
    
    try {
      const result = await model.countDocuments(sanitizedQuery, { 
        session: validatedOptions.session 
      }).exec();
      
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('count', model.modelName, executionTime, true);
      
      return result as number;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('count', model.modelName, executionTime, false, (error as Error).message);
      throw transformDatabaseError(error);
    }
  }

  /**
   * Check if document exists
   */
  static async exists<T>(
    model: Model<T>, 
    query: any
  ): Promise<boolean> {
    const startTime = Date.now();
    const sanitizedQuery = query;
    
    try {
      const result = await model.exists(sanitizedQuery).exec();
      
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('exists', model.modelName, executionTime, true);
      
      return !!result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('exists', model.modelName, executionTime, false, (error as Error).message);
      throw transformDatabaseError(error);
    }
  }

  /**
   * Aggregate documents
   */
  static async aggregate<T>(
    model: Model<T>, 
    pipeline: any[], 
    options: AggregationOptions = {}
  ): Promise<any[]> {
    const startTime = Date.now();
    const sanitizedPipeline = pipeline;
    
    try {
      const result = await model.aggregate(sanitizedPipeline, options).exec();
      
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('aggregate', model.modelName, executionTime, true);
      
      return result as any[];
    } catch (error) {
      const executionTime = Date.now() - startTime;
      DatabaseService.queryMonitor.trackQuery('aggregate', model.modelName, executionTime, false, (error as Error).message);
      throw transformDatabaseError(error);
    }
  }

  // ===== TRANSACTION SUPPORT =====

  /**
   * Execute operations within a transaction
   */
  static async withTransaction<T>(
    callback: (session: ClientSession) => Promise<T>, 
    options: TransactionOptions = {}
  ): Promise<T> {
    const instance = DatabaseService.getInstance();
    const session = await instance.connection?.startSession();
    
    if (!session) {
      throw new DatabaseError('No active database connection for transaction');
    }
    
    try {
      await session.withTransaction(async () => {
        return await callback(session);
      }, options);
      
      return await callback(session);
    } catch (error) {
      throw transformDatabaseError(error);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Start a new session
   */
  static async startSession(options: TransactionOptions = {}): Promise<ClientSession> {
    const instance = DatabaseService.getInstance();
    const session = await instance.connection?.startSession();
    
    if (!session) {
      throw new DatabaseError('No active database connection for session');
    }
    
    return session;
  }

  /**
   * Execute multiple operations in transaction
   */
  static async executeInTransaction<T>(
    operations: TransactionCallback<T>[], 
    options: TransactionOptions = {}
  ): Promise<T[]> {
    return this.withTransaction(async (session) => {
      const results: T[] = [];
      
      for (const operation of operations) {
        const result = await operation(session);
        results.push(result);
      }
      
      return results;
    }, options);
  }

  // ===== QUERY BUILDING & VALIDATION =====

  /**
   * Build query with filters
   */
  static buildQuery(filters: FilterParams): any {
    return buildMongoQuery(filters);
  }

  /**
   * Build paginated query
   */
  static buildPaginatedQuery(
    query: any, 
    pagination: PaginationParams, 
    sort?: SortParams
  ): any {
    const paginationParams = pagination;
    const sortOptions = sort ? buildMongoSort(sort) : { createdAt: -1 };
    
    return {
      query: cleanQuery(query),
      sort: sortOptions,
      pagination: paginationParams
    };
  }

  /**
   * Validate query
   */
  static validateQuery(query: any): any {
    if (!isPlainObject(query)) {
      throw new ValidationError('Query must be a plain object');
    }
    
    return query;
  }

  /**
   * Sanitize query
   */
  static sanitizeQuery(query: any): any {
    return sanitizeQueryInput(query);
  }

  /**
   * Optimize query
   */
  static optimizeQuery(query: any): { query: any; hints: string[]; warnings: string[] } {
    const hints: string[] = [];
    const warnings: string[] = [];
    
    // Check for missing indexes
    if (query.$or && Array.isArray(query.$or)) {
      warnings.push('$or queries can be slow - consider adding compound indexes');
    }
    
    if (query.$regex) {
      warnings.push('Regex queries without anchors (^$) can be slow');
    }
    
    // Check for range queries
    const rangeFields = ['createdAt', 'updatedAt', 'date', 'timestamp'];
    const hasRangeQuery = Object.keys(query).some(key => 
      rangeFields.includes(key) && 
      (query[key].$gte || query[key].$lte || query[key].$gt || query[key].$lt)
    );
    
    if (hasRangeQuery) {
      hints.push('Consider adding indexes on date/time fields for range queries');
    }
    
    return {
      query: cleanQuery(query),
      hints,
      warnings
    };
  }

  // ===== MODEL REGISTRY =====

  /**
   * Register a model
   */
  static registerModel<T>(name: string, model: Model<T>): void {
    const instance = DatabaseService.getInstance();
    instance.modelRegistry.set(name, model);
  }

  /**
   * Get a registered model
   */
  static getModel<T>(name: string): Model<T> {
    const instance = DatabaseService.getInstance();
    const model = instance.modelRegistry.get(name);
    
    if (!model) {
      throw new NotFoundError(`Model '${name}' not found in registry`);
    }
    
    return model;
  }

  /**
   * Get all registered models
   */
  static getAllModels(): Record<string, Model<any>> {
    const instance = DatabaseService.getInstance();
    const models: Record<string, Model<any>> = {};
    
    for (const [name, model] of instance.modelRegistry) {
      models[name] = model;
    }
    
    return models;
  }

  /**
   * Check if model is registered
   */
  static isModelRegistered(name: string): boolean {
    const instance = DatabaseService.getInstance();
    return instance.modelRegistry.has(name);
  }

  // ===== PRIVATE METHODS =====

  private async performConnection(): Promise<Connection> {
    if (this.connection && this.connection.readyState === 1) {
      return this.connection;
    }

    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = this.establishConnection();

    try {
      const connection = await this.connectionPromise;
      this.isConnecting = false;
      this.connectionAttempts = 0;
      this.reconnectDelay = 1000;
      return connection;
    } catch (error) {
      this.isConnecting = false;
      this.connectionPromise = null;
      throw error;
    }
  }

  private async establishConnection(): Promise<Connection> {
    const { uri, options } = this.config;

    if (!uri) {
      throw new DatabaseError('MongoDB URI is required');
    }

    log.database('Connecting to MongoDB', { 
      operation: 'connect',
      uri: uri.replace(/\/\/.*@/, '//***@')
    });

    try {
      const connection = await retry(
        async () => {
          const conn = await mongoose.connect(uri, options);
          log.database('Successfully connected to MongoDB', {
            operation: 'connect',
            database: conn.connection.name,
            host: `${conn.connection.host}:${conn.connection.port}`
          });
          
          this.setupConnectionEvents(conn.connection);
          this.startHealthMonitoring();
          
          return conn.connection;
        },
        {
          maxAttempts: 3
        }
      );

      this.connection = connection;
      this.connectionStartTime = Date.now();
      return connection;

    } catch (error) {
      this.connectionAttempts++;
      log.error('Connection failed', error, { 
        operation: 'connect',
        attempt: this.connectionAttempts,
        maxAttempts: this.maxReconnectAttempts
      });
      
      if (this.connectionAttempts < this.maxReconnectAttempts) {
        log.database(`Retrying connection (${this.connectionAttempts}/${this.maxReconnectAttempts})`, {
          operation: 'connect_retry',
          attempt: this.connectionAttempts,
          delay: this.reconnectDelay
        });
        await sleep(this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
        return this.establishConnection();
      }
      
      throw new DatabaseError(`Failed to connect to MongoDB after ${this.maxReconnectAttempts} attempts: ${(error as Error).message}`);
    }
  }

  private async performDisconnect(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.connection) {
      try {
        await this.connection.close();
        log.database('Disconnected from MongoDB', { operation: 'disconnect' });
      } catch (error) {
        log.error('Error during disconnect', error, { operation: 'disconnect' });
      }
      this.connection = null;
    }

    try {
      await mongoose.disconnect();
    } catch (error) {
      log.error('Error during mongoose disconnect', error, { operation: 'mongoose_disconnect' });
    }
  }

  private async performReconnect(): Promise<Connection> {
    log.database('Forcing reconnection', { operation: 'reconnect' });
    await this.performDisconnect();
    await sleep(1000);
    return this.performConnection();
  }

  private setupConnectionEvents(connection: Connection): void {
    connection.on('connected', () => {
      log.database('Connected to MongoDB', {
        operation: 'connection_event',
        database: connection.name,
        host: `${connection.host}:${connection.port}`
      });
      this.connectionAttempts = 0;
      this.reconnectDelay = 1000;
    });

    connection.on('disconnected', () => {
      log.warn('Disconnected from MongoDB', { operation: 'connection_event' });
      this.connection = null;
    });

    connection.on('error', (error) => {
      log.error('Connection error', error, {
        operation: 'database_connection',
        connectionState: connection.readyState,
        host: connection.host,
        port: connection.port
      });
    });

    connection.on('reconnected', () => {
      log.database('Reconnected to MongoDB', { operation: 'connection_event' });
    });

    connection.on('close', () => {
      log.warn('Connection closed', { operation: 'connection_event' });
      this.connection = null;
    });
  }

  private startHealthMonitoring(): void {
    if (!this.config.monitoring?.enabled) return;

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000);
  }

  private async performHealthCheck(): Promise<DatabaseHealth> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check connection
    const connectionHealth = {
      connected: this.connection?.readyState === 1,
      readyState: this.connection?.readyState || 0,
      host: this.connection?.host || 'unknown',
      port: this.connection?.port || 0,
      database: this.connection?.name || 'unknown',
      uptime: this.connection ? Date.now() - this.connectionStartTime : 0,
      lastActivity: this.lastHealthCheck || new Date()
    };

    if (!connectionHealth.connected) {
      issues.push('Database connection is not active');
      recommendations.push('Check database connectivity and configuration');
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUtilization = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (memoryUtilization > 90) {
      issues.push('High memory utilization');
      recommendations.push('Monitor memory usage and consider garbage collection');
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (issues.length > 2) {
      status = 'critical';
    } else if (issues.length > 0) {
      status = 'degraded';
    }

    this.lastHealthCheck = new Date();

    return {
      status,
      connection: connectionHealth,
      performance: {
        averageQueryTime: 0,
        slowQueryCount: 0,
        connectionPoolUtilization: 0,
        indexHitRatio: 95,
        cacheHitRatio: 85
      },
      memory: {
        used: memoryUsage.heapUsed,
        available: memoryUsage.heapTotal - memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        utilization: memoryUtilization,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external
      },
      issues,
      recommendations,
      lastChecked: new Date()
    };
  }

  private getConnectionStateInfo(): ConnectionStats {
    if (!this.connection) {
      return {
        state: 'disconnected',
        host: 'unknown',
        port: 0,
        name: 'unknown',
        readyState: 0,
        collections: 0,
        models: 0,
        plugins: [],
        config: {}
      };
    }

    return {
      state: this.getConnectionStateString(),
      host: this.connection.host,
      port: this.connection.port,
      name: this.connection.name,
      readyState: this.connection.readyState,
      collections: this.connection.collections ? Object.keys(this.connection.collections).length : 0,
      models: this.connection.models ? Object.keys(this.connection.models).length : 0,
      plugins: this.connection.plugins ? Object.keys(this.connection.plugins) : [],
      config: this.connection.config || {}
    };
  }

  private getConnectionStateString(): 'connected' | 'connecting' | 'disconnected' | 'disconnecting' {
    if (!this.connection) return 'disconnected';
    
    switch (this.connection.readyState) {
      case 0: return 'disconnected';
      case 1: return 'connected';
      case 2: return 'connecting';
      case 3: return 'disconnecting';
      default: return 'disconnected';
    }
  }

  private getPoolStatsInfo(): PoolStats {
    return {
      totalConnections: 1,
      availableConnections: this.connection?.readyState === 1 ? 1 : 0,
      inUseConnections: this.connection?.readyState === 1 ? 0 : 1,
      waitingRequests: 0,
      maxPoolSize: this.config.options?.maxPoolSize || 10,
      minPoolSize: this.config.options?.minPoolSize || 2,
      maxIdleTimeMS: this.config.options?.maxIdleTimeMS || 30000,
      serverSelectionTimeoutMS: this.config.options?.serverSelectionTimeoutMS || 5000,
      socketTimeoutMS: this.config.options?.socketTimeoutMS || 45000,
      connectTimeoutMS: this.config.options?.connectTimeoutMS || 10000
    };
  }

  private createQueryOptions(options: QueryOptions): QueryOptions {
    return {
      lean: true,
      timeout: 30000,
      retry: {
        attempts: 3,
        backoff: 'exponential',
        delay: 1000,
        maxDelay: 10000
      },
      monitor: false,
      ...options
    };
  }

  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      return sanitizeString(data);
    }
    
    if (Array.isArray(data)) {
      return data;
    }
    
    if (isPlainObject(data)) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[sanitizeString(key)] = value;
      }
      return sanitized;
    }
    
    return data;
  }

  private sanitizeBulkOperation(operation: BulkWriteOperation): BulkWriteOperation {
    const sanitized: BulkWriteOperation = {};
    
    if (operation.insertOne) {
      sanitized.insertOne = {
        document: operation.insertOne.document
      };
    }
    
    if (operation.updateOne) {
      sanitized.updateOne = {
        filter: operation.updateOne.filter,
        update: operation.updateOne.update,
        upsert: operation.updateOne.upsert
      };
    }
    
    if (operation.updateMany) {
      sanitized.updateMany = {
        filter: operation.updateMany.filter,
        update: operation.updateMany.update,
        upsert: operation.updateMany.upsert
      };
    }
    
    if (operation.replaceOne) {
      sanitized.replaceOne = {
        filter: operation.replaceOne.filter,
        replacement: operation.replaceOne.replacement,
        upsert: operation.replaceOne.upsert
      };
    }
    
    if (operation.deleteOne) {
      sanitized.deleteOne = {
        filter: operation.deleteOne.filter
      };
    }
    
    if (operation.deleteMany) {
      sanitized.deleteMany = {
        filter: operation.deleteMany.filter
      };
    }
    
    return sanitized;
  }
}
