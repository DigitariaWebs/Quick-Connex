/**
 * Pagination Types
 * 
 * Types for handling paginated data across the backend.
 */

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

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
  totalCount?: boolean;
}

// Helper function type for building pagination
export interface PaginationBuilder {
  buildPagination(page: number, limit: number, total: number): PaginationMeta;
}

// Default pagination values
export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100
} as const;
