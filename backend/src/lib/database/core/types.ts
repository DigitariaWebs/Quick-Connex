/**
 * Database Types
 * 
 * Re-export all database types from backend type system for convenient imports.
 * Provides type aliases and simplifies import paths throughout the database module.
 */

// ===== CORE DATABASE TYPES =====
export * from '../../../types/database';

// ===== ERROR TYPES =====
export { 
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  ServerError
} from '../../../types/error.types';

// ===== COMMON TYPE ALIASES =====
export type { 
  PaginationParams, 
  PaginationMeta, 
  PaginatedResult 
} from '../../../types/common/pagination';

export type { 
  QueryFilter, 
  SortOptions, 
  PopulateOptions 
} from '../../../types/common/query';

export type { 
  SuccessResponse, 
  ErrorResponse, 
  PaginatedResponse 
} from '../../../types/common/response';
