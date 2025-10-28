/**
 * Response Builder Utility
 * 
 * Standardized response formatters for all API endpoints.
 * Provides consistent response structure and automatic status code handling.
 */

import { Response } from 'express';
import { ApiResponse, PaginatedResponse, PaginationInfo, ResponseMeta, HTTP_STATUS } from '../types/api.types';
import { ErrorResponse, ValidationErrorResponse, ValidationErrorDetail } from '../types/common/response';
import { v4 as uuidv4 } from 'uuid';

/**
 * Response Builder - Standardized response formatters
 */
export class ResponseBuilder {
  /**
   * Success response
   */
  static success<T>(
    res: Response,
    payload: T,
    meta?: Partial<ResponseMeta>,
    statusCode: number = HTTP_STATUS.OK
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      timestamp: new Date().toISOString(),
      payload,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: uuidv4(),
        ...meta,
      },
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Paginated response
   */
  static paginated<T>(
    res: Response,
    payload: T[],
    pagination: PaginationInfo,
    meta?: Partial<ResponseMeta>
  ): Response {
    const response: PaginatedResponse<T> = {
      success: true,
      timestamp: new Date().toISOString(),
      payload,
      pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: uuidv4(),
        ...meta,
      },
    };
    return res.status(HTTP_STATUS.OK).json(response);
  }

  /**
   * Created response (201)
   */
  static created<T>(res: Response, payload: T, meta?: Partial<ResponseMeta>): Response {
    return this.success(res, payload, meta, HTTP_STATUS.CREATED);
  }

  /**
   * No content response (204)
   */
  static noContent(res: Response): Response {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  /**
   * Helper to build pagination info
   */
  static buildPagination(page: number, limit: number, total: number): PaginationInfo {
    const totalPages = Math.ceil(total / limit);
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Create response with custom metadata
   */
  static withMeta<T>(
    res: Response,
    payload: T,
    meta: Record<string, any>,
    statusCode: number = HTTP_STATUS.OK
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      timestamp: new Date().toISOString(),
      payload,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: uuidv4(),
        ...meta,
      },
    };
    return res.status(statusCode).json(response);
  }

  // ===== ERROR RESPONSE METHODS =====

  /**
   * Generic error response
   */
  static error(
    res: Response,
    code: string,
    message: string,
    details?: any,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    meta?: Partial<ResponseMeta>
  ): Response {
    const response: ErrorResponse = {
      success: false,
      timestamp: new Date().toISOString(),
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: uuidv4(),
        ...meta,
      },
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Bad request error (400)
   */
  static badRequest(
    res: Response,
    message: string = 'Bad request',
    details?: any,
    meta?: Partial<ResponseMeta>
  ): Response {
    return this.error(res, 'BAD_REQUEST', message, details, HTTP_STATUS.BAD_REQUEST, meta);
  }

  /**
   * Unauthorized error (401)
   */
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized',
    details?: any,
    meta?: Partial<ResponseMeta>
  ): Response {
    return this.error(res, 'UNAUTHORIZED', message, details, HTTP_STATUS.UNAUTHORIZED, meta);
  }

  /**
   * Forbidden error (403)
   */
  static forbidden(
    res: Response,
    message: string = 'Forbidden',
    details?: any,
    meta?: Partial<ResponseMeta>
  ): Response {
    return this.error(res, 'FORBIDDEN', message, details, HTTP_STATUS.FORBIDDEN, meta);
  }

  /**
   * Not found error (404)
   */
  static notFound(
    res: Response,
    message: string = 'Resource not found',
    details?: any,
    meta?: Partial<ResponseMeta>
  ): Response {
    return this.error(res, 'NOT_FOUND', message, details, HTTP_STATUS.NOT_FOUND, meta);
  }

  /**
   * Conflict error (409)
   */
  static conflict(
    res: Response,
    message: string = 'Conflict',
    details?: any,
    meta?: Partial<ResponseMeta>
  ): Response {
    return this.error(res, 'CONFLICT', message, details, HTTP_STATUS.CONFLICT, meta);
  }

  /**
   * Validation error (422)
   */
  static validationError(
    res: Response,
    message: string,
    errors: ValidationErrorDetail[],
    meta?: Partial<ResponseMeta>
  ): Response {
    const response: ValidationErrorResponse = {
      success: false,
      timestamp: new Date().toISOString(),
      error: {
        code: 'VALIDATION_ERROR',
        message,
        details: errors,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: uuidv4(),
        ...meta,
      },
    };
    return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json(response);
  }

  /**
   * Rate limited error (429)
   */
  static rateLimited(
    res: Response,
    message: string = 'Too many requests',
    retryAfter?: number,
    meta?: Partial<ResponseMeta>
  ): Response {
    return this.error(res, 'RATE_LIMITED', message, { retryAfter }, HTTP_STATUS.TOO_MANY_REQUESTS, meta);
  }

  /**
   * Server error (500)
   */
  static serverError(
    res: Response,
    message: string = 'Internal server error',
    details?: any,
    meta?: Partial<ResponseMeta>
  ): Response {
    return this.error(res, 'SERVER_ERROR', message, details, HTTP_STATUS.INTERNAL_SERVER_ERROR, meta);
  }

  /**
   * Service unavailable error (503)
   */
  static serviceUnavailable(
    res: Response,
    message: string = 'Service unavailable',
    details?: any,
    meta?: Partial<ResponseMeta>
  ): Response {
    return this.error(res, 'SERVICE_UNAVAILABLE', message, details, HTTP_STATUS.SERVICE_UNAVAILABLE, meta);
  }
}