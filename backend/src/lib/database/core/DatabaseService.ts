/**
 * Centralized Database Service
 * 
 * Single source of truth for all database operations using Mongoose.
 * Provides clean, consistent API with comprehensive functionality.
 * Integrates with monitoring, caching, and utility modules.
 */

import mongoose, { Connection, Model, ClientSession, Types } from 'mongoose';
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
  TransactionCallback,
  PaginatedResult,
  ValidationError,
  ConnectionError,
  TransactionError
} from './types';
import { NotFoundError } from '../../../types/error.types';
import { 
  getDatabaseConfig,
  validateDatabaseConfig
} from './config';
import { TIMEOUTS, LIMITS, RETRY_CONFIG } from './constants';
import { 
  createConnectionOptions,
  getConnectionStats,
  getPoolStats,
  handleDatabaseError,
  retryDatabaseOperation
} from '../utils/connection';
import { 
  validateObjectId,
  sanitizeQueryInput,
  isPlainObject
} from '../utils/validation';
import { 
  withTransaction,
  startSession,
  endSession,
  executeInTransaction
} from '../utils/transaction';
import { 
  MemoryCache,
  shouldCacheQuery,
  createQueryCacheKey,
  createDocumentCacheKey,
  withCache,
  CacheInvalidator
} from '../utils/cache';
import { 
  buildMongoQuery,
  buildMongoSort,
  buildPaginationParams,
  buildPopulateOptions,
  QueryOptimizer
} from '../utils/query-builder';
import { 
  performDatabaseHealthCheck
} from '../utils/health';
import { QueryMonitor } from '../monitoring/query-monitor';
import { DatabaseMonitoringService } from '../monitoring/database-monitoring';

/**
 * Main Database Service Class
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private connection: Connection | null = null;
  private config: DatabaseConfig;
  private isConnecting = false;
  private connectionPromise: Promise<Connection> | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private connectionAttempts = 0;
  private maxReconnectAttempts = RETRY_CONFIG.MAX_ATTEMPTS;
  private reconnectDelay = RETRY_CONFIG.BACKOFF_MULTIPLIER * 1000;
  private modelRegistry: Map<string, Model<any>> = new Map();
  private cache: MemoryCache;
  private cacheInvalidator: CacheInvalidator;
  private queryMonitor: QueryMonitor;
  private monitoringService: DatabaseMonitoringService;

  private constructor(config: DatabaseConfig = {}) {
    this.config = { ...getDatabaseConfig(), ...config };
    
    // Validate configuration
    const validation = validateDatabaseConfig(this.config);
    if (!validation.valid) {
      throw new ValidationError(`Invalid database configuration: ${validation.errors.join(', ')}`);
    }
    
    // Initialize components
    this.cache = new MemoryCache(this.config.cache);
    this.cacheInvalidator = new CacheInvalidator(this.cache);
    this.queryMonitor = QueryMonitor.getInstance();
    this.monitoringService = DatabaseMonitoringService.getInstance();
    
    if (this.config.monitoring?.enabled) {
      this.queryMonitor.enable();
    }
    
    // Auto-initialize database connection
    this.autoInitialize();
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

  /**
   * Auto-initialize database connection
   */
  private async autoInitialize(): Promise<void> {
    try {
      if (!this.connection || this.connection.readyState !== 1) {
        console.log('Auto-initializing database connection...');
        await this.performConnection();
        console.log('Database connection auto-initialized successfully');
      }
    } catch (error) {
      console.warn('Auto-initialization failed:', error);
      // Don't throw error - let individual operations handle connection
    }
  }

  // ===== CONNECTION MANAGEMENT =====

  /**
   * Connect to MongoDB with retry logic
   */
  static async connect(config?: DatabaseConfig): Promise<Connection> {
    const instance = DatabaseService.getInstance(config);
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
    const instance = DatabaseService.getInstance();
    return instance.performCreate(model, data, options);
  }

  /**
   * Create multiple documents
   */
  static async createMany<T>(
    model: Model<T>, 
    data: any[], 
    options: QueryOptions = {}
  ): Promise<T[]> {
    const instance = DatabaseService.getInstance();
    return instance.performCreateMany(model, data, options);
  }

  /**
   * Bulk write operations
   */
  static async insertBulk<T>(
    model: Model<T>, 
    operations: BulkWriteOperation[], 
    options: QueryOptions = {}
  ): Promise<BulkWriteResult> {
    const instance = DatabaseService.getInstance();
    return instance.performBulkWrite(model, operations, options);
  }

  /**
   * Find document by ID
   */
  static async findById<T>(
    model: Model<T>, 
    id: string, 
    options: QueryOptions = {}
  ): Promise<T | null> {
    const instance = DatabaseService.getInstance();
    return instance.performFindById(model, id, options);
  }

  /**
   * Find one document
   */
  static async findOne<T>(
    model: Model<T>, 
    query: any, 
    options: QueryOptions = {}
  ): Promise<T | null> {
    const instance = DatabaseService.getInstance();
    return instance.performFindOne(model, query, options);
  }

  /**
   * Find multiple documents
   */
  static async findMany<T>(
    model: Model<T>, 
    query: any, 
    options: QueryOptions = {}
  ): Promise<T[]> {
    const instance = DatabaseService.getInstance();
    return instance.performFindMany(model, query, options);
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
    const instance = DatabaseService.getInstance();
    return instance.performFindWithPagination(model, query, pagination, options);
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
    const instance = DatabaseService.getInstance();
    return instance.performUpdateById(model, id, update, options);
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
    const instance = DatabaseService.getInstance();
    return instance.performUpdateOne(model, query, update, options);
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
    const instance = DatabaseService.getInstance();
    return instance.performUpdateMany(model, query, update, options);
  }

  /**
   * Delete document by ID
   */
  static async deleteById<T>(
    model: Model<T>, 
    id: string, 
    options: QueryOptions = {}
  ): Promise<boolean> {
    const instance = DatabaseService.getInstance();
    return instance.performDeleteById(model, id, options);
  }

  /**
   * Delete one document
   */
  static async deleteOne<T>(
    model: Model<T>, 
    query: any, 
    options: QueryOptions = {}
  ): Promise<boolean> {
    const instance = DatabaseService.getInstance();
    return instance.performDeleteOne(model, query, options);
  }

  /**
   * Delete multiple documents
   */
  static async deleteMany<T>(
    model: Model<T>, 
    query: any, 
    options: QueryOptions = {}
  ): Promise<{ deletedCount: number }> {
    const instance = DatabaseService.getInstance();
    return instance.performDeleteMany(model, query, options);
  }

  /**
   * Count documents
   */
  static async count<T>(
    model: Model<T>, 
    query: any, 
    options: QueryOptions = {}
  ): Promise<number> {
    const instance = DatabaseService.getInstance();
    return instance.performCount(model, query, options);
  }

  /**
   * Check if document exists
   */
  static async exists<T>(
    model: Model<T>, 
    query: any
  ): Promise<boolean> {
    const instance = DatabaseService.getInstance();
    return instance.performExists(model, query);
  }

  /**
   * Aggregate documents
   */
  static async aggregate<T>(
    model: Model<T>, 
    pipeline: any[], 
    options: AggregationOptions = {}
  ): Promise<any[]> {
    const instance = DatabaseService.getInstance();
    return instance.performAggregate(model, pipeline, options);
  }

  // ===== TRANSACTION SUPPORT =====

  /**
   * Execute operations within a transaction
   */
  static async withTransaction<T>(
    callback: TransactionCallback<T>, 
    _options: TransactionOptions = {}
  ): Promise<T> {
    const instance = DatabaseService.getInstance();
    return instance.performWithTransaction(callback, _options);
  }

  /**
   * Start a new session
   */
  static async startSession(_options: TransactionOptions = {}): Promise<ClientSession> {
    const instance = DatabaseService.getInstance();
    return instance.performStartSession(_options);
  }

  /**
   * Execute multiple operations in transaction
   */
  static async executeInTransaction<T>(
    operations: TransactionCallback<T>[], 
    options: TransactionOptions = {}
  ): Promise<T[]> {
    const instance = DatabaseService.getInstance();
    return instance.performExecuteInTransaction(operations, options);
  }

  // ===== QUERY BUILDING & VALIDATION =====

  /**
   * Build query with filters
   */
  static buildQuery(filters: any): any {
    return buildMongoQuery(filters);
  }

  /**
   * Build paginated query
   */
  static buildPaginatedQuery(
    query: any, 
    pagination: PaginationOptions, 
    sort?: any
  ): any {
    const paginationParams = buildPaginationParams(pagination);
    const sortOptions = sort ? buildMongoSort(sort) : { createdAt: -1 };
    
    return {
      query: sanitizeQueryInput(query),
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
    const analysis = QueryOptimizer.analyzeQuery(query);
    return {
      query: QueryOptimizer.optimizeQuery(query),
      hints: analysis.hints,
      warnings: analysis.warnings
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

  // ===== PRIVATE IMPLEMENTATION METHODS =====

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
      this.reconnectDelay = RETRY_CONFIG.BACKOFF_MULTIPLIER * 1000;
      
      // Initialize monitoring
      await this.monitoringService.initialize(connection, this.config);
      
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
      throw new ConnectionError('MongoDB URI is required');
    }

    console.log('Connecting to MongoDB...');

    try {
      const connection = await retryDatabaseOperation(
        async () => {
          const conn = await mongoose.connect(uri, createConnectionOptions(this.config));
          console.log('Successfully connected to MongoDB');
          
          this.setupConnectionEvents(conn.connection);
          this.startHealthMonitoring();
          
          return conn.connection;
        },
        RETRY_CONFIG.MAX_ATTEMPTS,
        RETRY_CONFIG.BACKOFF_MULTIPLIER * 1000,
        TIMEOUTS.MAX_RETRY_DELAY
      );

      this.connection = connection;
      return connection;

    } catch (error) {
      this.connectionAttempts++;
      console.error('Connection failed:', error);
      
      if (this.connectionAttempts < this.maxReconnectAttempts) {
        console.log(`Retrying connection (${this.connectionAttempts}/${this.maxReconnectAttempts})`);
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, TIMEOUTS.MAX_RETRY_DELAY);
        return this.establishConnection();
      }
      
      throw new ConnectionError(`Failed to connect to MongoDB after ${this.maxReconnectAttempts} attempts: ${(error as Error).message}`);
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
        console.log('Disconnected from MongoDB');
      } catch (error) {
        console.error('Error during disconnect:', error);
      }
      this.connection = null;
    }

    try {
      await mongoose.disconnect();
    } catch (error) {
      console.error('Error during mongoose disconnect:', error);
    }
  }

  private async performReconnect(): Promise<Connection> {
    console.log('Forcing reconnection...');
    await this.performDisconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    return this.performConnection();
  }

  private setupConnectionEvents(connection: Connection): void {
    connection.on('connected', () => {
      console.log('Connected to MongoDB');
      this.connectionAttempts = 0;
      this.reconnectDelay = RETRY_CONFIG.BACKOFF_MULTIPLIER * 1000;
    });

    connection.on('disconnected', () => {
      console.warn('Disconnected from MongoDB');
      this.connection = null;
    });

    connection.on('error', (error) => {
      console.error('Connection error:', error);
    });

    connection.on('reconnected', () => {
      console.log('Reconnected to MongoDB');
    });

    connection.on('close', () => {
      console.warn('Connection closed');
      this.connection = null;
    });
  }

  private startHealthMonitoring(): void {
    if (!this.config.monitoring?.enabled) return;

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // 30 seconds
  }

  private async performHealthCheck(): Promise<DatabaseHealth> {
    const connectionStats = getConnectionStats(this.connection);
    const queryStats = this.queryMonitor.getQueryStats();
    
    return performDatabaseHealthCheck(this.connection, queryStats, connectionStats);
  }

  private getConnectionStateInfo(): ConnectionStats {
    return getConnectionStats(this.connection);
  }

  private getPoolStatsInfo(): PoolStats {
    return getPoolStats(this.connection, this.config);
  }

  // ===== CRUD IMPLEMENTATION METHODS =====

  private async performCreate<T>(
    model: Model<T>, 
    data: any, 
    options: QueryOptions = {}
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      const sanitizedData = sanitizeQueryInput(data);
      const document = new model(sanitizedData);
      const result = await document.save({ session: options.session });
      
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('create', model.modelName, executionTime, true);
      
      // Invalidate cache
      this.cacheInvalidator.invalidateModel(model.modelName);
      
      return result as T;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('create', model.modelName, executionTime, false, (error as Error).message);
      throw handleDatabaseError(error, 'create');
    }
  }

  private async performCreateMany<T>(
    model: Model<T>, 
    data: any[], 
    options: QueryOptions = {}
  ): Promise<T[]> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      const sanitizedData = data.map(item => sanitizeQueryInput(item));
      const result = await model.insertMany(sanitizedData, { session: options.session });
      
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('createMany', model.modelName, executionTime, true);
      
      // Invalidate cache
      this.cacheInvalidator.invalidateModel(model.modelName);
      
      return result as T[];
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('createMany', model.modelName, executionTime, false, (error as Error).message);
      throw handleDatabaseError(error, 'createMany');
    }
  }

  private async performBulkWrite<T>(
    model: Model<T>, 
    operations: BulkWriteOperation[], 
    options: QueryOptions = {}
  ): Promise<BulkWriteResult> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      const sanitizedOperations = operations.map(op => sanitizeQueryInput(op));
      const result = await model.bulkWrite(sanitizedOperations as any, { session: options.session });
      
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('bulkWrite', model.modelName, executionTime, true);
      
      // Invalidate cache
      this.cacheInvalidator.invalidateModel(model.modelName);
      
      return result as BulkWriteResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('bulkWrite', model.modelName, executionTime, false, (error as Error).message);
      throw handleDatabaseError(error, 'bulkWrite');
    }
  }

  private async performFindById<T>(
    model: Model<T>, 
    id: string, 
    options: QueryOptions = {}
  ): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      const validatedId = validateObjectId(id);
      
      // Check cache first
      if (shouldCacheQuery('findById', model.modelName, options)) {
        const cacheKey = createDocumentCacheKey(model.modelName, id, options);
        return withCache(this.cache, cacheKey, async () => {
          return this.executeFindById(model, validatedId, options);
        });
      }
      
      return this.executeFindById(model, validatedId, options);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('findById', model.modelName, executionTime, false, (error as Error).message);
      throw handleDatabaseError(error, 'findById');
    }
  }

  private async executeFindById<T>(
    model: Model<T>, 
    id: Types.ObjectId, 
    options: QueryOptions
  ): Promise<T | null> {
    const query = model.findById(id);
    
    if (options.populate) {
      query.populate(buildPopulateOptions(options.populate));
    }
    
    if (options.select) {
      query.select(options.select);
    }
    
    if (options.session) {
      query.session(options.session);
    }
    
    const result = await query.lean(options.lean ?? true).exec();
    return result as T;
  }

  private async performFindOne<T>(
    model: Model<T>, 
    query: any, 
    options: QueryOptions = {}
  ): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      const sanitizedQuery = sanitizeQueryInput(query);
      
      // Check cache first
      if (shouldCacheQuery('findOne', model.modelName, options)) {
        const cacheKey = createQueryCacheKey('findOne', model.modelName, sanitizedQuery, options);
        return withCache(this.cache, cacheKey, async () => {
          return this.executeFindOne(model, sanitizedQuery, options);
        });
      }
      
      return this.executeFindOne(model, sanitizedQuery, options);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('findOne', model.modelName, executionTime, false, (error as Error).message);
      throw handleDatabaseError(error, 'findOne');
    }
  }

  private async executeFindOne<T>(
    model: Model<T>, 
    query: any, 
    options: QueryOptions
  ): Promise<T | null> {
    const mongoQuery = model.findOne(query);
    
    if (options.populate) {
      mongoQuery.populate(buildPopulateOptions(options.populate));
    }
    
    if (options.select) {
      mongoQuery.select(options.select);
    }
    
    if (options.sort) {
      mongoQuery.sort(buildMongoSort(options.sort));
    }
    
    if (options.session) {
      mongoQuery.session(options.session);
    }
    
    const result = await mongoQuery.lean(options.lean ?? true).exec();
    return result as T;
  }

  private async performFindMany<T>(
    model: Model<T>, 
    query: any, 
    options: QueryOptions = {}
  ): Promise<T[]> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      const sanitizedQuery = sanitizeQueryInput(query);
      
      // Check cache first
      if (shouldCacheQuery('findMany', model.modelName, options)) {
        const cacheKey = createQueryCacheKey('findMany', model.modelName, sanitizedQuery, options);
        return withCache(this.cache, cacheKey, async () => {
          return this.executeFindMany(model, sanitizedQuery, options);
        });
      }
      
      return this.executeFindMany(model, sanitizedQuery, options);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('findMany', model.modelName, executionTime, false, (error as Error).message);
      throw handleDatabaseError(error, 'findMany');
    }
  }

  private async executeFindMany<T>(
    model: Model<T>, 
    query: any, 
    options: QueryOptions
  ): Promise<T[]> {
    const mongoQuery = model.find(query);
    
    if (options.populate) {
      mongoQuery.populate(buildPopulateOptions(options.populate));
    }
    
    if (options.select) {
      mongoQuery.select(options.select);
    }
    
    if (options.sort) {
      mongoQuery.sort(buildMongoSort(options.sort));
    }
    
    if (options.limit) {
      mongoQuery.limit(options.limit);
    }
    
    if (options.skip) {
      mongoQuery.skip(options.skip);
    }
    
    if (options.session) {
      mongoQuery.session(options.session);
    }
    
    const result = await mongoQuery.lean(options.lean ?? true).exec();
    return result as T[];
  }

  private async performFindWithPagination<T>(
    model: Model<T>, 
    query: any, 
    pagination: PaginationOptions, 
    options: QueryOptions = {}
  ): Promise<PaginatedResult<T>> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      const sanitizedQuery = sanitizeQueryInput(query);
      const paginationParams = buildPaginationParams(pagination);
      
      const [data, totalCount] = await Promise.all([
        model.find(sanitizedQuery)
          .populate(options.populate ? buildPopulateOptions(options.populate) : [])
          .select(options.select || {})
          .sort(options.sort ? buildMongoSort(options.sort) : { createdAt: -1 })
          .skip(paginationParams.offset || 0)
          .limit(paginationParams.limit || LIMITS.DEFAULT_PAGINATION_LIMIT)
          .lean(options.lean ?? true)
          .session(options.session)
          .exec(),
        model.countDocuments(sanitizedQuery).session(options.session)
      ]);
      
      const result: PaginatedResult<T> = {
        data: data as T[],
        pagination: {
          ...paginationParams,
          total: totalCount,
          totalPages: Math.ceil(totalCount / paginationParams.limit),
          hasNext: paginationParams.page < Math.ceil(totalCount / paginationParams.limit),
          hasPrev: paginationParams.page > 1
        }
      };
      
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('findWithPagination', model.modelName, executionTime, true);
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('findWithPagination', model.modelName, executionTime, false, (error as Error).message);
      throw handleDatabaseError(error, 'findWithPagination');
    }
  }

  private async performUpdateById<T>(
    model: Model<T>, 
    id: string, 
    update: any, 
    options: QueryOptions = {}
  ): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      const validatedId = validateObjectId(id);
      const sanitizedUpdate = sanitizeQueryInput(update);
      
      const result = await model.findByIdAndUpdate(
        validatedId,
        sanitizedUpdate,
        { 
          new: true, 
          runValidators: true,
          session: options.session 
        }
      ).lean(options.lean ?? true).exec();
      
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('updateById', model.modelName, executionTime, true);
      
      // Invalidate cache
      this.cacheInvalidator.invalidateDocument(model.modelName, id);
      
      return result as T;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('updateById', model.modelName, executionTime, false, (error as Error).message);
      throw handleDatabaseError(error, 'updateById');
    }
  }

  private async performUpdateOne<T>(
    model: Model<T>, 
    query: any, 
    update: any, 
    options: QueryOptions = {}
  ): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      const sanitizedQuery = sanitizeQueryInput(query);
      const sanitizedUpdate = sanitizeQueryInput(update);
      
      const result = await model.findOneAndUpdate(
        sanitizedQuery,
        sanitizedUpdate,
        { 
          new: true, 
          runValidators: true,
          session: options.session 
        }
      ).lean(options.lean ?? true).exec();
      
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('updateOne', model.modelName, executionTime, true);
      
      // Invalidate cache
      this.cacheInvalidator.invalidateModel(model.modelName);
      
      return result as T;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('updateOne', model.modelName, executionTime, false, (error as Error).message);
      throw handleDatabaseError(error, 'updateOne');
    }
  }

  private async performUpdateMany<T>(
    model: Model<T>, 
    query: any, 
    update: any, 
    options: QueryOptions = {}
  ): Promise<{ modifiedCount: number }> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      const sanitizedQuery = sanitizeQueryInput(query);
      const sanitizedUpdate = sanitizeQueryInput(update);
      
      const result = await model.updateMany(
        sanitizedQuery,
        sanitizedUpdate,
        { session: options.session }
      ).exec();
      
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('updateMany', model.modelName, executionTime, true);
      
      // Invalidate cache
      this.cacheInvalidator.invalidateModel(model.modelName);
      
      return { modifiedCount: result.modifiedCount };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('updateMany', model.modelName, executionTime, false, (error as Error).message);
      throw handleDatabaseError(error, 'updateMany');
    }
  }

  private async performDeleteById<T>(
    model: Model<T>, 
    id: string, 
    options: QueryOptions = {}
  ): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      const validatedId = validateObjectId(id);
      
      const result = await model.findByIdAndDelete(validatedId, { 
        session: options.session 
      }).exec();
      
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('deleteById', model.modelName, executionTime, true);
      
      // Invalidate cache
      this.cacheInvalidator.invalidateDocument(model.modelName, id);
      
      return !!result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('deleteById', model.modelName, executionTime, false, (error as Error).message);
      throw handleDatabaseError(error, 'deleteById');
    }
  }

  private async performDeleteOne<T>(
    model: Model<T>, 
    query: any, 
    options: QueryOptions = {}
  ): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      const sanitizedQuery = sanitizeQueryInput(query);
      
      const result = await model.findOneAndDelete(sanitizedQuery, { 
        session: options.session 
      }).exec();
      
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('deleteOne', model.modelName, executionTime, true);
      
      // Invalidate cache
      this.cacheInvalidator.invalidateModel(model.modelName);
      
      return !!result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('deleteOne', model.modelName, executionTime, false, (error as Error).message);
      throw handleDatabaseError(error, 'deleteOne');
    }
  }

  private async performDeleteMany<T>(
    model: Model<T>, 
    query: any, 
    options: QueryOptions = {}
  ): Promise<{ deletedCount: number }> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      const sanitizedQuery = sanitizeQueryInput(query);
      
      const result = await model.deleteMany(sanitizedQuery, { 
        session: options.session 
      }).exec();
      
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('deleteMany', model.modelName, executionTime, true);
      
      // Invalidate cache
      this.cacheInvalidator.invalidateModel(model.modelName);
      
      return { deletedCount: result.deletedCount };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('deleteMany', model.modelName, executionTime, false, (error as Error).message);
      throw handleDatabaseError(error, 'deleteMany');
    }
  }

  private async performCount<T>(
    model: Model<T>, 
    query: any, 
    options: QueryOptions = {}
  ): Promise<number> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      const sanitizedQuery = sanitizeQueryInput(query);
      
      const result = await model.countDocuments(sanitizedQuery, { 
        session: options.session 
      }).exec();
      
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('count', model.modelName, executionTime, true);
      
      return result as number;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('count', model.modelName, executionTime, false, (error as Error).message);
      throw handleDatabaseError(error, 'count');
    }
  }

  private async performExists<T>(
    model: Model<T>, 
    query: any
  ): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      const sanitizedQuery = sanitizeQueryInput(query);
      
      const result = await model.exists(sanitizedQuery).exec();
      
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('exists', model.modelName, executionTime, true);
      
      return !!result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('exists', model.modelName, executionTime, false, (error as Error).message);
      throw handleDatabaseError(error, 'exists');
    }
  }

  private async performAggregate<T>(
    model: Model<T>, 
    pipeline: any[], 
    options: AggregationOptions = {}
  ): Promise<any[]> {
    const startTime = Date.now();
    
    try {
      await this.ensureConnection();
      
      const sanitizedPipeline = pipeline.map(stage => sanitizeQueryInput(stage));
      
      const result = await model.aggregate(sanitizedPipeline, options).exec();
      
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('aggregate', model.modelName, executionTime, true);
      
      return result as any[];
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.queryMonitor.trackQuery('aggregate', model.modelName, executionTime, false, (error as Error).message);
      throw handleDatabaseError(error, 'aggregate');
    }
  }

  // ===== TRANSACTION IMPLEMENTATION METHODS =====

  private async performWithTransaction<T>(
    callback: TransactionCallback<T>, 
    options: TransactionOptions = {}
  ): Promise<T> {
    const session = await this.performStartSession(options);
    
    try {
      return await withTransaction(session, callback, options);
    } finally {
      await endSession(session);
    }
  }

  private async performStartSession(options: TransactionOptions = {}): Promise<ClientSession> {
    await this.ensureConnection();
    
    if (!this.connection) {
      throw new TransactionError('No active database connection for session');
    }
    
    return startSession(this.connection, options);
  }

  private async performExecuteInTransaction<T>(
    operations: TransactionCallback<T>[], 
    options: TransactionOptions = {}
  ): Promise<T[]> {
    const session = await this.performStartSession(options);
    
    try {
      return await executeInTransaction(session, operations, options);
    } finally {
      await endSession(session);
    }
  }

  // ===== HELPER METHODS =====

  private async ensureConnection(): Promise<void> {
    if (!this.connection || this.connection.readyState !== 1) {
      try {
        await this.performConnection();
      } catch (error) {
        throw new ConnectionError(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}
