/**
 * Error Response Builder Utility
 * 
 * Standardized error response formatters for all API endpoints.
 * Provides consistent error structure and automatic status code handling.
 */

// Note: Express types would be imported here in a real Express app
// For now, we'll define the Response interface locally
interface Response {
  status(code: number): Response;
  json(data: any): Response;
}
import { ApiResponse, ApiError, ErrorCode, HTTP_STATUS, ValidationErrorDetail } from '../types/api.types';

/**
 * Error Response Builder
 */
export class ErrorBuilder {
  /**
   * Send error response
   */
  static sendError(
    res: Response,
    code: ErrorCode,
    message: string,
    statusCode: number,
    details?: ValidationErrorDetail[] | Record<string, any>,
    retryable: boolean = false,
    retryAfter?: number
  ): Response {
    const error: ApiError = {
      code,
      message,
      details,
      retryable,
      retryAfter,
    };

    const response: ApiResponse = {
      success: false,
      error,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Validation error (400)
   */
  static validationError(
    res: Response,
    message: string,
    details: ValidationErrorDetail[]
  ): Response {
    return this.sendError(
      res,
      ErrorCode.VALIDATION_ERROR,
      message,
      HTTP_STATUS.BAD_REQUEST,
      details
    );
  }

  /**
   * Unauthorized error (401)
   */
  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return this.sendError(
      res,
      ErrorCode.UNAUTHORIZED,
      message,
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  /**
   * Forbidden error (403)
   */
  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return this.sendError(
      res,
      ErrorCode.FORBIDDEN,
      message,
      HTTP_STATUS.FORBIDDEN
    );
  }

  /**
   * Not found error (404)
   */
  static notFound(res: Response, message: string = 'Resource not found'): Response {
    return this.sendError(
      res,
      ErrorCode.NOT_FOUND,
      message,
      HTTP_STATUS.NOT_FOUND
    );
  }

  /**
   * Conflict error (409)
   */
  static conflict(res: Response, message: string, details?: Record<string, any>): Response {
    return this.sendError(
      res,
      ErrorCode.CONFLICT,
      message,
      HTTP_STATUS.CONFLICT,
      details
    );
  }

  /**
   * Rate limit error (429)
   */
  static rateLimited(res: Response, retryAfter: number): Response {
    return this.sendError(
      res,
      ErrorCode.RATE_LIMITED,
      'Too many requests',
      HTTP_STATUS.TOO_MANY_REQUESTS,
      undefined,
      true,
      retryAfter
    );
  }

  /**
   * Server error (500)
   */
  static serverError(res: Response, message: string = 'Internal server error'): Response {
    return this.sendError(
      res,
      ErrorCode.SERVER_ERROR,
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      undefined,
      true
    );
  }

  /**
   * Database error (500)
   */
  static databaseError(res: Response, message: string = 'Database error'): Response {
    return this.sendError(
      res,
      ErrorCode.DATABASE_ERROR,
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      undefined,
      true
    );
  }

  /**
   * External service error (503)
   */
  static externalServiceError(res: Response, message: string = 'External service unavailable'): Response {
    return this.sendError(
      res,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      message,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      undefined,
      true
    );
  }

  /**
   * Handle and format any error
   */
  static handleError(res: Response, error: any): Response {
    console.error('Error:', error);

    // Handle specific error types
    if (error.name === 'ValidationError') {
      return this.validationError(res, error.message, error.details || []);
    }

    if (error.name === 'UnauthorizedError' || error.message === 'Unauthorized') {
      return this.unauthorized(res, error.message);
    }

    if (error.name === 'ForbiddenError') {
      return this.forbidden(res, error.message);
    }

    if (error.name === 'NotFoundError') {
      return this.notFound(res, error.message);
    }

    if (error.name === 'ConflictError') {
      return this.conflict(res, error.message, error.details);
    }

    // Handle MongoDB errors
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return this.databaseError(res, 'Database operation failed');
    }

    // Handle validation errors from libraries
    if (error.name === 'CastError') {
      return this.validationError(res, 'Invalid data format', [
        { field: error.path, message: `Invalid ${error.path}`, code: 'invalid_format' }
      ]);
    }

    // Default to server error
    return this.serverError(res, 
      process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message
    );
  }
}
