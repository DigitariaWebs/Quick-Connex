/**
 * Database Validation Utilities
 * 
 * ObjectId validation, batch size validation, and other validation functions.
 */

import { Types } from 'mongoose';
import { ValidationError } from '../../utils/error-handling';

/**
 * Validate ObjectId
 */
export function validateObjectId(id: string | Types.ObjectId): Types.ObjectId {
  if (!id) {
    throw new ValidationError('ObjectId is required');
  }

  try {
    return new Types.ObjectId(id);
  } catch (error) {
    throw new ValidationError(`Invalid ObjectId: ${id}`);
  }
}

/**
 * Convert string to ObjectId
 */
export function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  if (id instanceof Types.ObjectId) {
    return id;
  }

  if (typeof id === 'string') {
    return validateObjectId(id);
  }

  throw new ValidationError('Invalid ObjectId format');
}

/**
 * Validate batch size
 */
export function validateBatchSize(batchSize: number): number {
  if (typeof batchSize !== 'number' || batchSize <= 0) {
    throw new ValidationError('Batch size must be a positive number');
  }

  if (batchSize > 1000) {
    throw new ValidationError('Batch size cannot exceed 1000');
  }

  return Math.floor(batchSize);
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(params: any): {
  page: number;
  limit: number;
} {
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 10));

  return { page, limit };
}

/**
 * Validate sort parameters
 */
export function validateSortParams(sort: any): Record<string, 1 | -1> {
  if (!sort || typeof sort !== 'object') {
    return { createdAt: -1 };
  }

  const validatedSort: Record<string, 1 | -1> = {};
  
  for (const [field, direction] of Object.entries(sort)) {
    if (typeof field !== 'string') {
      continue;
    }

    if (direction === 1 || direction === -1 || direction === 'asc' || direction === 'desc') {
      validatedSort[field] = direction === 'asc' || direction === 1 ? 1 : -1;
    }
  }

  return Object.keys(validatedSort).length > 0 ? validatedSort : { createdAt: -1 };
}

/**
 * Validate filter parameters
 */
export function validateFilterParams(filters: any): any {
  if (!filters || typeof filters !== 'object') {
    return {};
  }

  const validatedFilters: any = {};
  
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) {
      continue;
    }

    // Validate ObjectId fields
    if (key.endsWith('Id') && typeof value === 'string') {
      try {
        validatedFilters[key] = new Types.ObjectId(value);
      } catch {
        // Skip invalid ObjectIds
        continue;
      }
    } else if (typeof value === 'object' && value !== null) {
      validatedFilters[key] = validateFilterParams(value);
    } else {
      validatedFilters[key] = value;
    }
  }

  return validatedFilters;
}

/**
 * Validate date range parameters
 */
export function validateDateRangeParams(params: any): {
  startDate?: Date;
  endDate?: Date;
} {
  const result: { startDate?: Date; endDate?: Date } = {};

  if (params.startDate) {
    const startDate = new Date(params.startDate);
    if (!isNaN(startDate.getTime())) {
      result.startDate = startDate;
    }
  }

  if (params.endDate) {
    const endDate = new Date(params.endDate);
    if (!isNaN(endDate.getTime())) {
      result.endDate = endDate;
    }
  }

  return result;
}
