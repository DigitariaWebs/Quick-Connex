import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { log } from '@/lib/services/log-service';

/**
 * Error Handling Utilities
 * 
 * Centralized error handling and formatting for consistent error responses.
 * Provides type-safe error classes and automatic error formatting.
 */

// ===== ERROR CLASSES =====

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Authentication error class
 */
export class AuthError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMITED');
  }
}

/**
 * Database error class
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, 500, 'DATABASE_ERROR', true, details);
  }
}

// ===== ERROR HANDLERS =====

/**
 * Handle database errors (MongoDB/Mongoose)
 */
export function handleDatabaseError(error: any): NextResponse {
  log.error('Database error occurred', error, { category: 'database' });

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const validationErrors = Object.values(error.errors).map((err: any) => ({
      field: err.path,
      message: err.message
    }));

    return NextResponse.json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: { validationErrors }
    }, { status: 400 });
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return NextResponse.json({
      success: false,
      error: `${field} already exists`,
      code: 'DUPLICATE_KEY_ERROR'
    }, { status: 409 });
  }

  // Mongoose cast error
  if (error.name === 'CastError') {
    return NextResponse.json({
      success: false,
      error: `Invalid ${error.path}: ${error.value}`,
      code: 'INVALID_ID_ERROR'
    }, { status: 400 });
  }

  // Generic database error
  return NextResponse.json({
    success: false,
    error: 'Database operation failed',
    code: 'DATABASE_ERROR'
  }, { status: 500 });
}

/**
 * Handle validation errors (Zod)
 */
export function handleValidationError(error: ZodError): NextResponse {
  const validationErrors = error.issues.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));

  return NextResponse.json({
    success: false,
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: { validationErrors }
  }, { status: 400 });
}

/**
 * Handle authentication errors
 */
export function handleAuthError(error: any): NextResponse {
  log.error('Authentication error occurred', error, { category: 'auth' });

  if (error instanceof AuthError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code
    }, { status: error.statusCode });
  }

  // Generic auth error
  return NextResponse.json({
    success: false,
    error: 'Authentication required',
    code: 'UNAUTHORIZED'
  }, { status: 401 });
}

/**
 * Handle not found errors
 */
export function handleNotFoundError(resource: string = 'Resource'): NextResponse {
  return NextResponse.json({
    success: false,
    error: `${resource} not found`,
    code: 'NOT_FOUND'
  }, { status: 404 });
}

/**
 * Handle rate limit errors
 */
export function handleRateLimitError(): NextResponse {
  return NextResponse.json({
    success: false,
    error: 'Too many requests',
    code: 'RATE_LIMITED'
  }, { status: 429 });
}

/**
 * Handle generic errors
 */
export function handleGenericError(error: any): NextResponse {
  log.error('Generic error occurred', error, { category: 'system' });

  // Check if it's already an AppError
  if (error instanceof AppError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    }, { status: error.statusCode });
  }

  // Check if it's a ZodError
  if (error instanceof ZodError) {
    return handleValidationError(error);
  }

  // Check if it's a Mongoose error
  if (error.name && error.name.startsWith('Mongoose')) {
    return handleDatabaseError(error);
  }

  // Generic server error
  return NextResponse.json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  }, { status: 500 });
}

// ===== ERROR FORMATTERS =====

/**
 * Format error for client consumption
 */
export function formatErrorForClient(error: any): {
  message: string;
  code: string;
  details?: any;
} {
  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production';

  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      details: isProduction ? undefined : error.details
    };
  }

  if (error instanceof ZodError) {
    return {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: isProduction ? undefined : {
        validationErrors: error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }
    };
  }

  // Generic error
  return {
    message: isProduction ? 'Internal server error' : error.message || 'Unknown error',
    code: 'INTERNAL_ERROR'
  };
}

/**
 * Format Zod validation errors
 */
export function formatZodError(error: ZodError): Array<{
  field: string;
  message: string;
}> {
  return error.issues.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
}

/**
 * Format Mongoose validation errors
 */
export function formatMongooseError(error: any): Array<{
  field: string;
  message: string;
}> {
  if (error.name === 'ValidationError') {
    return Object.values(error.errors).map((err: any) => ({
      field: err.path,
      message: err.message
    }));
  }

  return [{
    field: 'general',
    message: error.message || 'Validation failed'
  }];
}

/**
 * Format Mongoose errors
 */
export function formatMongooseErrors(error: any): {
  message: string;
  code: string;
  details?: any;
} {
  if (error.name === 'ValidationError') {
    return {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: {
        validationErrors: formatMongooseError(error)
      }
    };
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return {
      message: `${field} already exists`,
      code: 'DUPLICATE_KEY_ERROR'
    };
  }

  if (error.name === 'CastError') {
    return {
      message: `Invalid ${error.path}: ${error.value}`,
      code: 'INVALID_ID_ERROR'
    };
  }

  return {
    message: error.message || 'Database error',
    code: 'DATABASE_ERROR'
  };
}

// ===== ERROR LOGGING =====
// Note: Logging functions have been moved to LogService
// Import LogService for logging needs:
// import { log } from '@/lib/services/log-service';

// ===== ERROR RECOVERY =====

/**
 * Check if error is operational (can be handled gracefully)
 */
export function isOperationalError(error: any): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }

  // Some errors are always operational
  if (error instanceof ZodError) return true;
  if (error.name === 'ValidationError') return true;
  if (error.code === 11000) return true; // Duplicate key
  if (error.name === 'CastError') return true;

  return false;
}

/**
 * Check if error should be retried
 */
export function shouldRetryError(error: any): boolean {
  // Network errors
  if (error.code === 'ECONNRESET') return true;
  if (error.code === 'ETIMEDOUT') return true;
  if (error.code === 'ENOTFOUND') return true;

  // Database connection errors
  if (error.name === 'MongoNetworkError') return true;
  if (error.name === 'MongoTimeoutError') return true;

  return false;
}

// ===== ERROR WRAPPERS =====

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorHandler?: (error: any) => NextResponse
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (errorHandler) {
        return errorHandler(error);
      }
      return handleGenericError(error);
    }
  };
}

/**
 * Create error handler for specific error types
 */
export function createErrorHandler(
  errorType: 'database' | 'validation' | 'auth' | 'generic'
) {
  switch (errorType) {
    case 'database':
      return handleDatabaseError;
    case 'validation':
      return handleValidationError;
    case 'auth':
      return handleAuthError;
    default:
      return handleGenericError;
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Create error response from any error
 */
export function createErrorResponse(error: any): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    }, { status: error.statusCode });
  }

  if (error instanceof ZodError) {
    return handleValidationError(error);
  }

  return handleGenericError(error);
}

/**
 * Sanitize error for production
 */
export function sanitizeErrorForProduction(error: any): any {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    return error;
  }

  // Remove sensitive information
  const sanitized = { ...error };
  
  // Remove stack traces in production
  delete sanitized.stack;
  
  // Remove internal details
  if (sanitized.details && typeof sanitized.details === 'object') {
    delete sanitized.details.internal;
    delete sanitized.details.stack;
  }

  return sanitized;
}

/**
 * Transform database errors to standardized format
 */
export function transformDatabaseError(error: any): DatabaseError {
  if (error.name === 'ValidationError') {
    return new ValidationError(
      'Database validation failed',
      formatMongooseErrors(error)
    );
  }
  
  if (error.name === 'CastError') {
    return new ValidationError(
      'Invalid data format',
      [{ field: error.path, message: `Invalid ${error.kind} for field ${error.path}` }]
    );
  }
  
  if (error.code === 11000) {
    return new ValidationError(
      'Duplicate entry',
      [{ field: Object.keys(error.keyPattern)[0], message: 'This value already exists' }]
    );
  }
  
  return new DatabaseError(
    'Database operation failed',
    error.message || 'Unknown database error'
  );
}

// ===== GENERAL LOGGING UTILITIES =====
// Note: Logging functions have been moved to LogService
// Use LogService for all logging needs:
// import { log } from '@/lib/services/log-service';
