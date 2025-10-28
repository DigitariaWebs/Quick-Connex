/**
 * Core API Response Types
 * 
 * Standardized response structures for all API endpoints.
 * All endpoints should return these structures for consistency.
 */

/**
 * Standard API Response wrapper
 * All endpoints should return this structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiErrorResponse;
  meta?: ResponseMeta;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationInfo;
  meta?: ResponseMeta;
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  version?: string;
  [key: string]: any;
}

/**
 * API Error structure in responses
 */
export interface ApiErrorResponse {
  code: string; // ErrorCode enum value
  message: string;
  details?: ValidationErrorDetail[] | Record<string, any>;
  retryable?: boolean;
  retryAfter?: number; // seconds
}

/**
 * Field-level validation error
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * HTTP status code constants
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ErrorCode will be imported from error.types.ts when needed
