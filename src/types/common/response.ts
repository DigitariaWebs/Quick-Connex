/**
 * Response Types
 * 
 * Shared API response types used across the application.
 */

import { PaginationMeta } from './pagination';

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

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    timestamp?: string;
    requestId?: string;
    [key: string]: any;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    pagination: PaginationMeta;
    timestamp?: string;
    requestId?: string;
    [key: string]: any;
  };
}

export type PaginationInfo = PaginationMeta;

export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  version?: string;
  [key: string]: any;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code?: string;
}

