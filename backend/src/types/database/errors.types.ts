/**
 * Database Error Types
 * 
 * Database-specific error handling and error types.
 */

export interface DatabaseErrorInterface extends Error {
  code?: DatabaseErrorCode;
  codeName?: string;
  keyPattern?: any;
  keyValue?: any;
  errors?: Record<string, any>;
  operation?: string;
  model?: string;
  query?: any;
  options?: any;
}

export enum DatabaseErrorCode {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DUPLICATE_KEY = 'DUPLICATE_KEY',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  INDEX_ERROR = 'INDEX_ERROR',
  GRIDFS_ERROR = 'GRIDFS_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  MIGRATION_ERROR = 'MIGRATION_ERROR',
  BACKUP_ERROR = 'BACKUP_ERROR',
  RESTORE_ERROR = 'RESTORE_ERROR'
}

export class DatabaseError extends Error {
  constructor(
    public code: DatabaseErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: any,
    public operation?: string,
    public model?: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string = 'Database connection failed', details?: any) {
    super(DatabaseErrorCode.CONNECTION_ERROR, message, 503, details);
    this.name = 'ConnectionError';
  }
}

export class QueryError extends DatabaseError {
  constructor(message: string, _query?: any, details?: any) {
    super(DatabaseErrorCode.QUERY_ERROR, message, 400, details, 'query');
    this.name = 'QueryError';
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string, errors?: Record<string, any>) {
    super(DatabaseErrorCode.VALIDATION_ERROR, message, 400, errors);
    this.name = 'ValidationError';
  }
}

export class DuplicateKeyError extends DatabaseError {
  constructor(message: string, keyValue?: any) {
    super(DatabaseErrorCode.DUPLICATE_KEY, message, 409, { keyValue });
    this.name = 'DuplicateKeyError';
  }
}

export class NotFoundError extends DatabaseError {
  constructor(message: string = 'Resource not found', model?: string) {
    super(DatabaseErrorCode.DOCUMENT_NOT_FOUND, message, 404, undefined, 'find', model);
    this.name = 'NotFoundError';
  }
}

export class DocumentNotFoundError extends DatabaseError {
  constructor(message: string = 'Document not found', model?: string) {
    super(DatabaseErrorCode.DOCUMENT_NOT_FOUND, message, 404, undefined, 'find', model);
    this.name = 'DocumentNotFoundError';
  }
}

export class TransactionError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(DatabaseErrorCode.TRANSACTION_ERROR, message, 500, details, 'transaction');
    this.name = 'TransactionError';
  }
}

export class TimeoutError extends DatabaseError {
  constructor(message: string = 'Database operation timeout', operation?: string) {
    super(DatabaseErrorCode.TIMEOUT_ERROR, message, 408, undefined, operation);
    this.name = 'TimeoutError';
  }
}

export class GridFSError extends DatabaseError {
  constructor(message: string, operation?: string, details?: any) {
    super(DatabaseErrorCode.GRIDFS_ERROR, message, 500, details, operation);
    this.name = 'GridFSError';
  }
}

export class CacheError extends DatabaseError {
  constructor(message: string, operation?: string, details?: any) {
    super(DatabaseErrorCode.CACHE_ERROR, message, 500, details, operation);
    this.name = 'CacheError';
  }
}

export interface DatabaseErrorResponse {
  success: false;
  error: {
    code: DatabaseErrorCode;
    message: string;
    details?: any;
    operation?: string;
    model?: string;
    retryable?: boolean;
  };
  timestamp: string;
}
