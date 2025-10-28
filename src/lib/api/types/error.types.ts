/**
 * Frontend Error Types
 * 
 * Error types and classes that mirror the backend error system.
 * Provides type-safe error handling on the frontend.
 */

/**
 * Error codes - must match backend ErrorCode enum
 */
export enum ErrorCode {
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  
  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  
  // Conflict errors (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // Rate limiting (429)
  RATE_LIMITED = 'RATE_LIMITED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // Server errors (500)
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Network errors (client-side)
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  ABORTED = 'ABORTED',
}

/**
 * Normalized API error for ResponseBuilder responses
 */
export interface NormalizedApiError extends Error {
  code: string;
  details?: unknown;
  status?: number;
}

/**
 * Custom error class for API errors
 */
export class ApiErrorException extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number,
    public details?: ValidationErrorDetail[] | Record<string, any>,
    public retryable: boolean = false,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'ApiErrorException';
  }
}

/**
 * Network error class
 */
export class NetworkError extends ApiErrorException {
  constructor(message: string = 'Network error occurred') {
    super(ErrorCode.NETWORK_ERROR, message, 0, undefined, true);
    this.name = 'NetworkError';
  }
}

/**
 * Timeout error class
 */
export class TimeoutError extends ApiErrorException {
  constructor(message: string = 'Request timeout') {
    super(ErrorCode.TIMEOUT, message, 0, undefined, true);
    this.name = 'TimeoutError';
  }
}

/**
 * Aborted request error class
 */
export class AbortedError extends ApiErrorException {
  constructor(message: string = 'Request was aborted') {
    super(ErrorCode.ABORTED, message, 0, undefined, false);
    this.name = 'AbortedError';
  }
}

/**
 * Validation error class
 */
export class ValidationError extends ApiErrorException {
  constructor(message: string, details?: ValidationErrorDetail[]) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Unauthorized error class
 */
export class UnauthorizedError extends ApiErrorException {
  constructor(message: string = 'Unauthorized') {
    super(ErrorCode.UNAUTHORIZED, message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error class
 */
export class ForbiddenError extends ApiErrorException {
  constructor(message: string = 'Forbidden') {
    super(ErrorCode.FORBIDDEN, message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends ApiErrorException {
  constructor(message: string = 'Resource not found') {
    super(ErrorCode.NOT_FOUND, message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends ApiErrorException {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.CONFLICT, message, 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * Server error class
 */
export class ServerError extends ApiErrorException {
  constructor(message: string = 'Internal server error') {
    super(ErrorCode.SERVER_ERROR, message, 500, undefined, true);
    this.name = 'ServerError';
  }
}

// Re-export ValidationErrorDetail from response.types.ts
export type { ValidationErrorDetail } from './response.types';
