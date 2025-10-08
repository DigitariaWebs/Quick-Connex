/**
 * Transfer Error Handling System
 * 
 * This file contains comprehensive error handling for the transfer system,
 * including custom error classes, error codes, and error response utilities.
 */

import { NextResponse } from 'next/server';
import { TRANSFER_ERRORS } from '@/constants/transfer';

/**
 * Transfer Error Codes
 */
export enum TransferErrorCode {
  // Validation Errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_DATA_FORMAT = 'INVALID_DATA_FORMAT',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  INVALID_PRIORITY = 'INVALID_PRIORITY',
  INVALID_STATUS = 'INVALID_STATUS',
  INVALID_TRANSITION = 'INVALID_TRANSITION',
  
  // Authentication & Authorization Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Resource Errors
  TRANSFER_NOT_FOUND = 'TRANSFER_NOT_FOUND',
  PATIENT_NOT_FOUND = 'PATIENT_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  
  // Business Logic Errors
  TRANSFER_ALREADY_ACCEPTED = 'TRANSFER_ALREADY_ACCEPTED',
  TRANSFER_ALREADY_COMPLETED = 'TRANSFER_ALREADY_COMPLETED',
  TRANSFER_ALREADY_CANCELLED = 'TRANSFER_ALREADY_CANCELLED',
  CANNOT_CANCEL_TRANSFER = 'CANNOT_CANCEL_TRANSFER',
  TIMEOUT_EXCEEDED = 'TIMEOUT_EXCEEDED',
  CONFLICT_DETECTED = 'CONFLICT_DETECTED',
  
  // Database Errors
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  DATABASE_UPDATE_ERROR = 'DATABASE_UPDATE_ERROR',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // External Service Errors
  NOTIFICATION_SERVICE_ERROR = 'NOTIFICATION_SERVICE_ERROR',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  EMAIL_SERVICE_ERROR = 'EMAIL_SERVICE_ERROR',
  
  // System Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE'
}

/**
 * Transfer Error Class
 */
export class TransferError extends Error {
  public readonly code: TransferErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly timestamp: string;
  public readonly requestId?: string;

  constructor(
    code: TransferErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any,
    requestId?: string
  ) {
    super(message);
    this.name = 'TransferError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TransferError);
    }
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      success: false,
      error: this.message,
      errorCode: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId
    };
  }

  /**
   * Convert error to NextResponse
   */
  toNextResponse(): NextResponse {
    return NextResponse.json(this.toJSON(), { status: this.statusCode });
  }
}

/**
 * Transfer Error Factory
 */
export class TransferErrorFactory {
  /**
   * Create validation error
   */
  static validationError(
    message: string,
    details?: any,
    requestId?: string
  ): TransferError {
    return new TransferError(
      TransferErrorCode.VALIDATION_FAILED,
      message,
      400,
      details,
      requestId
    );
  }

  /**
   * Create required field error
   */
  static requiredFieldError(
    fieldName: string,
    requestId?: string
  ): TransferError {
    return new TransferError(
      TransferErrorCode.REQUIRED_FIELD_MISSING,
      `${fieldName} is required`,
      400,
      { field: fieldName },
      requestId
    );
  }

  /**
   * Create unauthorized error
   */
  static unauthorizedError(
    message: string = 'Unauthorized access',
    requestId?: string
  ): TransferError {
    return new TransferError(
      TransferErrorCode.UNAUTHORIZED,
      message,
      401,
      undefined,
      requestId
    );
  }

  /**
   * Create forbidden error
   */
  static forbiddenError(
    message: string = 'Access forbidden',
    requestId?: string
  ): TransferError {
    return new TransferError(
      TransferErrorCode.FORBIDDEN,
      message,
      403,
      undefined,
      requestId
    );
  }

  /**
   * Create not found error
   */
  static notFoundError(
    resource: string,
    id?: string,
    requestId?: string
  ): TransferError {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    return new TransferError(
      TransferErrorCode.TRANSFER_NOT_FOUND,
      message,
      404,
      { resource, id },
      requestId
    );
  }

  /**
   * Create conflict error
   */
  static conflictError(
    message: string,
    details?: any,
    requestId?: string
  ): TransferError {
    return new TransferError(
      TransferErrorCode.CONFLICT_DETECTED,
      message,
      409,
      details,
      requestId
    );
  }

  /**
   * Create business logic error
   */
  static businessLogicError(
    code: TransferErrorCode,
    message: string,
    details?: any,
    requestId?: string
  ): TransferError {
    return new TransferError(
      code,
      message,
      422,
      details,
      requestId
    );
  }

  /**
   * Create database error
   */
  static databaseError(
    message: string,
    details?: any,
    requestId?: string
  ): TransferError {
    return new TransferError(
      TransferErrorCode.DATABASE_QUERY_ERROR,
      message,
      500,
      details,
      requestId
    );
  }

  /**
   * Create internal server error
   */
  static internalServerError(
    message: string = 'Internal server error',
    details?: any,
    requestId?: string
  ): TransferError {
    return new TransferError(
      TransferErrorCode.INTERNAL_SERVER_ERROR,
      message,
      500,
      details,
      requestId
    );
  }

  /**
   * Create service unavailable error
   */
  static serviceUnavailableError(
    message: string = 'Service temporarily unavailable',
    requestId?: string
  ): TransferError {
    return new TransferError(
      TransferErrorCode.SERVICE_UNAVAILABLE,
      message,
      503,
      undefined,
      requestId
    );
  }
}

/**
 * Error Response Utilities
 */
export class TransferErrorResponse {
  /**
   * Create standardized error response
   */
  static createErrorResponse(
    error: TransferError | Error | string,
    requestId?: string
  ): NextResponse {
    if (error instanceof TransferError) {
      return error.toNextResponse();
    }

    if (error instanceof Error) {
      const transferError = new TransferError(
        TransferErrorCode.INTERNAL_SERVER_ERROR,
        error.message,
        500,
        { originalError: error.name },
        requestId
      );
      return transferError.toNextResponse();
    }

    // String error
    const transferError = new TransferError(
      TransferErrorCode.INTERNAL_SERVER_ERROR,
      error,
      500,
      undefined,
      requestId
    );
    return transferError.toNextResponse();
  }

  /**
   * Create validation error response
   */
  static createValidationErrorResponse(
    errors: string[],
    warnings?: string[],
    requestId?: string
  ): NextResponse {
    const error = TransferErrorFactory.validationError(
      'Validation failed',
      { errors, warnings },
      requestId
    );
    return error.toNextResponse();
  }

  /**
   * Create not found error response
   */
  static createNotFoundErrorResponse(
    resource: string,
    id?: string,
    requestId?: string
  ): NextResponse {
    const error = TransferErrorFactory.notFoundError(resource, id, requestId);
    return error.toNextResponse();
  }

  /**
   * Create unauthorized error response
   */
  static createUnauthorizedErrorResponse(
    message?: string,
    requestId?: string
  ): NextResponse {
    const error = TransferErrorFactory.unauthorizedError(message, requestId);
    return error.toNextResponse();
  }

  /**
   * Create forbidden error response
   */
  static createForbiddenErrorResponse(
    message?: string,
    requestId?: string
  ): NextResponse {
    const error = TransferErrorFactory.forbiddenError(message, requestId);
    return error.toNextResponse();
  }
}

/**
 * Error Handler Middleware
 */
export class TransferErrorHandler {
  /**
   * Handle async function with error catching
   */
  static async handleAsync<T>(
    asyncFn: () => Promise<T>,
    requestId?: string
  ): Promise<T> {
    try {
      return await asyncFn();
    } catch (error) {
      throw this.processError(error, requestId);
    }
  }

  /**
   * Process and standardize errors
   */
  static processError(error: any, requestId?: string): TransferError {
    // Already a TransferError
    if (error instanceof TransferError) {
      return error;
    }

    // MongoDB/Mongoose errors
    if (error.name === 'ValidationError') {
      const details = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message
      }));
      return TransferErrorFactory.validationError(
        'Database validation failed',
        details,
        requestId
      );
    }

    if (error.name === 'CastError') {
      return TransferErrorFactory.validationError(
        `Invalid ${error.path}: ${error.value}`,
        { field: error.path, value: error.value },
        requestId
      );
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return TransferErrorFactory.conflictError(
        `${field} already exists`,
        { field, value: error.keyValue[field] },
        requestId
      );
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      return TransferErrorFactory.unauthorizedError(
        'Invalid authentication token',
        requestId
      );
    }

    if (error.name === 'TokenExpiredError') {
      return TransferErrorFactory.unauthorizedError(
        'Authentication token expired',
        requestId
      );
    }

    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return TransferErrorFactory.serviceUnavailableError(
        'External service unavailable',
        requestId
      );
    }

    // Generic error
    return TransferErrorFactory.internalServerError(
      error.message || 'An unexpected error occurred',
      { originalError: error.name },
      requestId
    );
  }

  /**
   * Log error with context
   */
  static logError(error: TransferError, context?: any): void {
    const logData = {
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
        timestamp: error.timestamp,
        requestId: error.requestId
      },
      context,
      stack: error.stack
    };

    // Log based on severity
    if (error.statusCode >= 500) {
      console.error('Transfer System Error:', logData);
    } else if (error.statusCode >= 400) {
      console.warn('Transfer System Warning:', logData);
    } else {
      console.info('Transfer System Info:', logData);
    }
  }
}

/**
 * Error Recovery Utilities
 */
export class TransferErrorRecovery {
  /**
   * Retry operation with exponential backoff
   */
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        // Don't retry certain types of errors
        if (error instanceof TransferError) {
          if (error.statusCode < 500 || error.code === TransferErrorCode.VALIDATION_FAILED) {
            throw error;
          }
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Fallback operation
   */
  static async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>
  ): Promise<T> {
    try {
      return await primaryOperation();
    } catch (error) {
      console.warn('Primary operation failed, using fallback:', error);
      return await fallbackOperation();
    }
  }

  /**
   * Circuit breaker pattern
   */
  static createCircuitBreaker(
    operation: () => Promise<any>,
    failureThreshold: number = 5,
    timeout: number = 60000
  ) {
    let failures = 0;
    let lastFailureTime = 0;
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    return async () => {
      const now = Date.now();

      // Check if circuit should be reset
      if (state === 'OPEN' && now - lastFailureTime > timeout) {
        state = 'HALF_OPEN';
      }

      // Circuit is open, reject immediately
      if (state === 'OPEN') {
        throw TransferErrorFactory.serviceUnavailableError(
          'Service temporarily unavailable due to repeated failures'
        );
      }

      try {
        const result = await operation();
        
        // Success - reset circuit
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failures = 0;
        }
        
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = now;

        // Open circuit if threshold reached
        if (failures >= failureThreshold) {
          state = 'OPEN';
        }

        throw error;
      }
    };
  }
}

/**
 * Error Monitoring and Analytics
 */
export class TransferErrorMonitor {
  private static errorCounts: Map<TransferErrorCode, number> = new Map();
  private static errorHistory: Array<{
    code: TransferErrorCode;
    timestamp: string;
    message: string;
    details?: any;
  }> = [];

  /**
   * Record error occurrence
   */
  static recordError(error: TransferError): void {
    const count = this.errorCounts.get(error.code) || 0;
    this.errorCounts.set(error.code, count + 1);

    this.errorHistory.push({
      code: error.code,
      timestamp: error.timestamp,
      message: error.message,
      details: error.details
    });

    // Keep only last 1000 errors
    if (this.errorHistory.length > 1000) {
      this.errorHistory = this.errorHistory.slice(-1000);
    }
  }

  /**
   * Get error statistics
   */
  static getErrorStats(): {
    totalErrors: number;
    errorCounts: Record<string, number>;
    recentErrors: Array<{
      code: TransferErrorCode;
      timestamp: string;
      message: string;
    }>;
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    
    const errorCounts: Record<string, number> = {};
    this.errorCounts.forEach((count, code) => {
      errorCounts[code] = count;
    });

    const recentErrors = this.errorHistory
      .slice(-50)
      .map(error => ({
        code: error.code,
        timestamp: error.timestamp,
        message: error.message
      }));

    return {
      totalErrors,
      errorCounts,
      recentErrors
    };
  }

  /**
   * Clear error statistics
   */
  static clearStats(): void {
    this.errorCounts.clear();
    this.errorHistory = [];
  }
}

