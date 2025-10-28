/**
 * Common Types
 * 
 * Shared types used across all backend modules.
 * Provides utility types, enums, and common interfaces.
 */

// Common utility types
export type ObjectId = string;
export type Timestamp = Date | string;
export type UUID = string;

// Common enums
export enum SortOrder {
  ASC = 1,
  DESC = -1
}

export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  ARCHIVED = 'archived'
}

// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// Common response patterns
export interface BaseEntity {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeleteEntity extends BaseEntity {
  deletedAt?: Date;
  isDeleted: boolean;
}

// Common filter types
export interface DateRange {
  start?: Date;
  end?: Date;
}

export interface TextSearch {
  query: string;
  fields: string[];
  caseSensitive?: boolean;
}

export interface SortField {
  field: string;
  order: SortOrder;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Query types
export interface QueryFilter {
  [key: string]: any;
}

export interface SortOptions {
  [key: string]: 1 | -1 | 'asc' | 'desc';
}

export interface PopulateOptions {
  path: string;
  select?: string;
  model?: string;
  match?: any;
  options?: any;
  populate?: PopulateOptions | PopulateOptions[];
}

export interface QueryOptions {
  select?: string | string[];
  sort?: SortOptions;
  limit?: number;
  skip?: number;
  populate?: PopulateOptions | PopulateOptions[];
  lean?: boolean;
}

// Response types
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

