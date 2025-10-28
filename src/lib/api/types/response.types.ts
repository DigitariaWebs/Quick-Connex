/**
 * Frontend Response Types
 * 
 * Response types that mirror the backend API response structures.
 * These types ensure type safety between frontend and backend communication.
 */

/**
 * Standard API Response wrapper
 * Mirrors backend ApiResponse structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
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
 * Pagination query parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * API Error structure in responses
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: ValidationErrorDetail[] | Record<string, any>;
  retryable?: boolean;
  retryAfter?: number;
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

// Re-export ErrorCode from error.types.ts
export { ErrorCode } from './error.types';
