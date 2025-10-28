/**
 * Error Handler
 * 
 * Parses and processes API errors, determines retry strategies,
 * and provides user-friendly error messages.
 */

import { ApiError, ApiErrorException, ErrorCode, NetworkError, ValidationErrorDetail } from '../types/error.types';
import { NormalizedApiError } from '../types/normalized-error.types';

/**
 * Error Handler - Parses and processes API errors
 */
export class ErrorHandler {
  /**
   * Parse API error from response
   */
  static parseApiError(error: ApiError, statusCode: number): ApiErrorException {
    return new ApiErrorException(
      error.code,
      error.message,
      statusCode,
      error.details,
      error.retryable,
      error.retryAfter
    );
  }

  /**
   * Determine if error should be retried
   */
  static shouldRetry(error: Error, attempt: number, maxRetries: number): boolean {
    if (attempt >= maxRetries) {
      return false;
    }

    // Retry on network errors
    if (error instanceof NetworkError) {
      return true;
    }

    // Retry on API errors marked as retryable
    if (error instanceof ApiErrorException) {
      return error.retryable || false;
    }

    // Retry on timeout
    if (error.name === 'TimeoutError') {
      return true;
    }

    return false;
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: ApiErrorException): string {
    switch (error.code) {
      case ErrorCode.VALIDATION_ERROR:
        return 'Please check your input and try again.';
      case ErrorCode.UNAUTHORIZED:
      case ErrorCode.SESSION_EXPIRED:
        return 'Your session has expired. Please log in again.';
      case ErrorCode.FORBIDDEN:
        return 'You do not have permission to perform this action.';
      case ErrorCode.NOT_FOUND:
        return 'The requested resource was not found.';
      case ErrorCode.CONFLICT:
        return 'This operation conflicts with existing data.';
      case ErrorCode.RATE_LIMITED:
        return `Too many requests. Please try again in ${error.retryAfter || 60} seconds.`;
      case ErrorCode.SERVER_ERROR:
        return 'An unexpected error occurred. Please try again later.';
      case ErrorCode.NETWORK_ERROR:
        return 'Network error. Please check your connection.';
      case ErrorCode.TIMEOUT:
        return 'Request timed out. Please try again.';
      default:
        return error.message;
    }
  }

  /**
   * Get field-specific validation errors
   */
  static getFieldErrors(error: ApiErrorException): Record<string, string[]> {
    if (error.code !== ErrorCode.VALIDATION_ERROR || !error.details) {
      return {};
    }

    const fieldErrors: Record<string, string[]> = {};
    
    if (Array.isArray(error.details)) {
      error.details.forEach((detail: ValidationErrorDetail) => {
        if (!fieldErrors[detail.field]) {
          fieldErrors[detail.field] = [];
        }
        fieldErrors[detail.field].push(detail.message);
      });
    }

    return fieldErrors;
  }

  /**
   * Check if error is authentication related
   */
  static isAuthError(error: ApiErrorException): boolean {
    return [
      ErrorCode.UNAUTHORIZED,
      ErrorCode.INVALID_CREDENTIALS,
      ErrorCode.SESSION_EXPIRED,
      ErrorCode.TOKEN_INVALID,
    ].includes(error.code);
  }

  /**
   * Check if error is validation related
   */
  static isValidationError(error: ApiErrorException): boolean {
    return [
      ErrorCode.VALIDATION_ERROR,
      ErrorCode.INVALID_INPUT,
      ErrorCode.MISSING_REQUIRED_FIELD,
    ].includes(error.code);
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: ApiErrorException): boolean {
    return error.retryable || [
      ErrorCode.SERVER_ERROR,
      ErrorCode.DATABASE_ERROR,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT,
    ].includes(error.code);
  }

  /**
   * Get retry delay in milliseconds
   */
  static getRetryDelay(error: ApiErrorException, attempt: number): number {
    if (error.retryAfter) {
      return error.retryAfter * 1000; // Convert seconds to milliseconds
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
  }

  /**
   * Format error for logging
   */
  static formatForLogging(error: Error): Record<string, any> {
    const baseInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    if (error instanceof ApiErrorException) {
      return {
        ...baseInfo,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        retryable: error.retryable,
        retryAfter: error.retryAfter,
      };
    }

    return baseInfo;
  }
}

/**
 * Convert any error to a user-friendly error message
 */
export function toUserError(error: unknown): { code: string; message: string } {
  if (error instanceof NormalizedApiError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof ApiErrorException) {
    return {
      code: error.code,
      message: ErrorHandler.getUserMessage(error),
    };
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
  };
}
