/**
 * Core API Response Types
 * 
 * Standardized response structures for all API endpoints.
 * All endpoints should return these structures for consistency.
 */

import { 
  PaginatedResponse as BasePaginatedResponse,
  SuccessResponse as BaseSuccessResponse,
  ValidationErrorDetail 
} from './common/response';
import { PaginationMeta } from './common/pagination';

/**
 * Standard API Response wrapper
 * All endpoints should return this structure
 */
export interface ApiResponse<T = any> extends BaseSuccessResponse<T> {
  timestamp?: string;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> extends BasePaginatedResponse<T> {}

/**
 * Pagination information (alias for PaginationMeta)
 */
export type PaginationInfo = PaginationMeta;

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

