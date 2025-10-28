/**
 * Database Query Types
 * 
 * Query options, operations, and result types.
 */

import { PopulateOptions } from '../common/query';

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


export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
  sort?: Record<string, 1 | -1> | string;
  totalCount?: boolean;
}

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

export interface QueryResult<T> {
  data: T | T[];
  count?: number;
  executionTime: number;
  cached: boolean;
  query: any;
  options: QueryOptions;
}


export interface QueryBuilder {
  build(): any;
  match(filter: any): QueryBuilder;
  sort(sort: any): QueryBuilder;
  limit(limit: number): QueryBuilder;
  skip(skip: number): QueryBuilder;
  populate(populate: PopulateOptions | PopulateOptions[]): QueryBuilder;
  select(select: string | Record<string, 0 | 1>): QueryBuilder;
}

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
