import { NextResponse } from 'next/server';

/**
 * API Response Utilities
 * 
 * Standardized response formatting for all API endpoints.
 * Provides consistent structure and automatic status code handling.
 */

// ===== TYPES =====

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    pagination?: PaginationMeta;
    timestamp?: string;
    requestId?: string;
    [key: string]: any;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

// ===== SUCCESS RESPONSES =====

/**
 * Create a standard success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString()
    }
  };

  if (message) {
    response.meta!.message = message;
  }

  return NextResponse.json(response, { status });
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  meta?: Record<string, any>
): NextResponse<ApiResponse<T[]>> {
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  
  const paginationMeta: PaginationMeta = {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    totalPages,
    hasNext: pagination.page < totalPages,
    hasPrev: pagination.page > 1
  };

  const response: ApiResponse<T[]> = {
    success: true,
    data,
    meta: {
      pagination: paginationMeta,
      timestamp: new Date().toISOString(),
      ...meta
    }
  };

  return NextResponse.json(response);
}

/**
 * Quick success wrapper
 */
export function respondWithData<T>(data: T): NextResponse<ApiResponse<T>> {
  return createSuccessResponse(data);
}

// ===== ERROR RESPONSES =====

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  code?: string,
  status: number = 400,
  details?: any
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    success: false,
    error,
    code,
    details
  };

  return NextResponse.json(response, { status });
}

/**
 * Respond with validation errors (Zod format)
 */
export function respondWithValidationErrors(
  errors: Array<{ field: string; message: string }>,
  status: number = 400
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    'Validation failed',
    'VALIDATION_ERROR',
    status,
    { validationErrors: errors }
  );
}

/**
 * Respond with 404 Not Found
 */
export function respondWithNotFound(
  resource: string = 'Resource'
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    `${resource} not found`,
    'NOT_FOUND',
    404
  );
}

/**
 * Respond with 401 Unauthorized
 */
export function respondWithUnauthorized(
  message: string = 'Authentication required'
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    message,
    'UNAUTHORIZED',
    401
  );
}

/**
 * Respond with 403 Forbidden
 */
export function respondWithForbidden(
  message: string = 'Access denied'
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    message,
    'FORBIDDEN',
    403
  );
}

/**
 * Respond with 429 Rate Limited
 */
export function respondWithRateLimited(
  message: string = 'Too many requests'
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    message,
    'RATE_LIMITED',
    429
  );
}

/**
 * Respond with 500 Internal Server Error
 */
export function respondWithServerError(
  message: string = 'Internal server error'
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    message,
    'INTERNAL_ERROR',
    500
  );
}

// ===== UTILITY FUNCTIONS =====

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

/**
 * Add metadata to response
 */
export function addResponseMeta<T>(
  response: ApiResponse<T>,
  meta: Record<string, any>
): ApiResponse<T> {
  return {
    ...response,
    meta: {
      ...response.meta,
      ...meta
    }
  };
}

/**
 * Create a response with custom metadata
 */
export function createResponseWithMeta<T>(
  data: T,
  meta: Record<string, any>,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };

  return NextResponse.json(response, { status });
}
