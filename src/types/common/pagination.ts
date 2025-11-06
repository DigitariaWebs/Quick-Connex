/**
 * Pagination Types
 * 
 * Shared pagination types used across the application.
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
  sort?: Record<string, 1 | -1> | string;
  totalCount?: boolean;
}




