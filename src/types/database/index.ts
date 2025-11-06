/**
 * Database Types
 * 
 * Database and Mongoose-related types.
 */

export * from './models';

// Re-export from database service types for now
// These will be moved here in future refactoring
export type {
  DatabaseConfig,
  TransactionOptions
} from '@/lib/database/core/types';
// Note: PaginationOptions and QueryOptions are exported from ./common to avoid duplicate exports

