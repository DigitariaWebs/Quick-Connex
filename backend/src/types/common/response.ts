/**
 * Response Types
 * 
 * Common response wrapper types for API endpoints.
 */

import { PaginationMeta } from './pagination';

export { PaginationMeta };

export interface BaseResponse {
  success: boolean;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface SuccessResponse<T = any> extends BaseResponse {
  success: true;
  data: T;
  meta?: Record<string, any>;
}

export interface ErrorResponse extends BaseResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    retryable?: boolean;
    retryAfter?: number;
  };
}

export interface PaginatedResponse<T> extends BaseResponse {
  success: true;
  data: T[];
  pagination: PaginationMeta;
  meta?: Record<string, any>;
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

export interface ValidationErrorResponse extends BaseResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: ValidationErrorDetail[];
  };
}

// Response builder types
export interface ResponseBuilder {
  success<T>(data: T, meta?: Record<string, any>): SuccessResponse<T>;
  error(code: string, message: string, details?: any): ErrorResponse;
  validationError(message: string, errors: ValidationErrorDetail[]): ValidationErrorResponse;
  paginated<T>(data: T[], pagination: PaginationMeta, meta?: Record<string, any>): PaginatedResponse<T>;
}
