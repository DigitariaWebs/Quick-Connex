/**
 * Common Types
 * 
 * Shared types used across all backend modules.
 * Provides utility types, enums, and common interfaces.
 */

// Re-export from specific files
export * from './pagination';
export * from './query';
export * from './response';

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

