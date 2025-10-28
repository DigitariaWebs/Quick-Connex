/**
 * Database Transaction Types
 * 
 * Transaction management and operation types.
 */

export interface TransactionOptions {
  readPreference?: 'primary' | 'secondary' | 'primaryPreferred' | 'secondaryPreferred' | 'nearest';
  readConcern?: any;
  writeConcern?: any;
  maxCommitTimeMS?: number;
  retryWrites?: boolean;
}

export interface TransactionResult<T> {
  result: T;
  session: any;
  executionTime: number;
  operations: number;
}

export interface TransactionCallback<T> {
  (session: any): Promise<T>;
}

export interface TransactionSession {
  startTransaction(options?: TransactionOptions): void;
  commitTransaction(): Promise<void>;
  abortTransaction(): Promise<void>;
  withTransaction<T>(fn: TransactionCallback<T>, options?: TransactionOptions): Promise<T>;
  endSession(): Promise<void>;
}

export interface TransactionManager {
  startSession(): Promise<TransactionSession>;
  withTransaction<T>(fn: TransactionCallback<T>, options?: TransactionOptions): Promise<T>;
  commitTransaction(session: TransactionSession): Promise<void>;
  abortTransaction(session: TransactionSession): Promise<void>;
}

export interface TransactionOperation {
  type: 'create' | 'update' | 'delete' | 'find' | 'aggregate';
  model: string;
  data?: any;
  filter?: any;
  options?: any;
  result?: any;
  error?: string;
  executionTime: number;
}

export interface TransactionLog {
  transactionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'committed' | 'aborted' | 'failed';
  operations: TransactionOperation[];
  totalExecutionTime: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface TransactionStats {
  totalTransactions: number;
  committedTransactions: number;
  abortedTransactions: number;
  failedTransactions: number;
  averageExecutionTime: number;
  averageOperationsPerTransaction: number;
  recentTransactions: TransactionLog[];
}
