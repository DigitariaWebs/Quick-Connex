/**
 * Validation Utilities
 * 
 * Utilities for ObjectId validation, query sanitization,
 * data validation, and schema validation helpers.
 */

import { Types } from 'mongoose';
import { 
  ValidationError,
  DatabaseError
} from '../../../types/database';
import { VALIDATION_PATTERNS } from '../core/constants';

/**
 * Validate ObjectId
 */
export function validateObjectId(id: string | Types.ObjectId): Types.ObjectId {
  if (!id) {
    throw new ValidationError('ObjectId is required');
  }
  
  if (typeof id === 'string') {
    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError(`Invalid ObjectId format: ${id}`);
    }
    return new Types.ObjectId(id);
  }
  
  if (id instanceof Types.ObjectId) {
    return id;
  }
  
  throw new ValidationError('Invalid ObjectId type');
}

/**
 * Check if value is valid ObjectId
 */
export function isValidObjectId(id: any): id is Types.ObjectId | string {
  if (!id) return false;
  
  if (typeof id === 'string') {
    return Types.ObjectId.isValid(id);
  }
  
  return id instanceof Types.ObjectId;
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, 1000); // Limit length
}

/**
 * Sanitize query input
 */
export function sanitizeQueryInput(query: any): any {
  if (query === null || query === undefined) {
    return query;
  }
  
  if (typeof query === 'string') {
    return sanitizeString(query);
  }
  
  if (Array.isArray(query)) {
    return query.map(item => sanitizeQueryInput(item));
  }
  
  if (typeof query === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(query)) {
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeQueryInput(value);
    }
    
    return sanitized;
  }
  
  return query;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (typeof email !== 'string') {
    return false;
  }
  
  return VALIDATION_PATTERNS.EMAIL.test(email);
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  if (typeof uuid !== 'string') {
    return false;
  }
  
  return VALIDATION_PATTERNS.UUID.test(uuid);
}

/**
 * Validate alphanumeric string
 */
export function validateAlphanumeric(input: string, allowSpaces: boolean = false): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  
  const pattern = allowSpaces ? VALIDATION_PATTERNS.ALPHANUMERIC_WITH_SPACES : VALIDATION_PATTERNS.ALPHANUMERIC;
  return pattern.test(input);
}

/**
 * Validate required fields
 */
export function validateRequiredFields(data: any, requiredFields: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`Field '${field}' is required`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate field types
 */
export function validateFieldTypes(data: any, schema: Record<string, string>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [field, expectedType] of Object.entries(schema)) {
    const value = data[field];
    
    if (value === undefined || value === null) {
      continue; // Skip validation for undefined/null values
    }
    
    const actualType = typeof value;
    
    if (expectedType === 'array' && !Array.isArray(value)) {
      errors.push(`Field '${field}' must be an array`);
    } else if (expectedType === 'object' && (actualType !== 'object' || Array.isArray(value))) {
      errors.push(`Field '${field}' must be an object`);
    } else if (expectedType !== 'array' && expectedType !== 'object' && actualType !== expectedType) {
      errors.push(`Field '${field}' must be of type ${expectedType}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(params: any): { valid: boolean; errors: string[]; sanitized: any } {
  const errors: string[] = [];
  const sanitized: any = {};
  
  // Validate page
  if (params.page !== undefined) {
    const page = parseInt(String(params.page));
    if (isNaN(page) || page < 1) {
      errors.push('Page must be a positive integer');
    } else {
      sanitized.page = page;
    }
  } else {
    sanitized.page = 1;
  }
  
  // Validate limit
  if (params.limit !== undefined) {
    const limit = parseInt(String(params.limit));
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push('Limit must be between 1 and 100');
    } else {
      sanitized.limit = limit;
    }
  } else {
    sanitized.limit = 20;
  }
  
  // Validate offset
  if (params.offset !== undefined) {
    const offset = parseInt(String(params.offset));
    if (isNaN(offset) || offset < 0) {
      errors.push('Offset must be a non-negative integer');
    } else {
      sanitized.offset = offset;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Validate sort parameters
 */
export function validateSortParams(sort: any): { valid: boolean; errors: string[]; sanitized: any } {
  const errors: string[] = [];
  
  if (!sort) {
    return { valid: true, errors: [], sanitized: { createdAt: -1 } };
  }
  
  if (typeof sort === 'string') {
    // Handle string sort like "createdAt:desc"
    const parts = sort.split(':');
    if (parts.length !== 2) {
      errors.push('Sort string must be in format "field:direction"');
      return { valid: false, errors, sanitized: {} };
    }
    
    const [field, direction] = parts;
    const validDirections = ['asc', 'desc', '1', '-1'];
    
    if (!validDirections.includes(direction.toLowerCase())) {
      errors.push('Sort direction must be asc, desc, 1, or -1');
      return { valid: false, errors, sanitized: {} };
    }
    
    const sortValue = direction.toLowerCase() === 'desc' || direction === '-1' ? -1 : 1;
    return { valid: true, errors: [], sanitized: { [field]: sortValue } };
  }
  
  if (typeof sort === 'object' && !Array.isArray(sort)) {
    const sanitized: any = {};
    
    for (const [field, direction] of Object.entries(sort)) {
      if (typeof direction === 'number') {
        if (direction !== 1 && direction !== -1) {
          errors.push(`Sort value for field '${field}' must be 1 or -1`);
        } else {
          sanitized[field] = direction;
        }
      } else if (typeof direction === 'string') {
        const lowerDirection = direction.toLowerCase();
        if (lowerDirection === 'asc' || lowerDirection === '1') {
          sanitized[field] = 1;
        } else if (lowerDirection === 'desc' || lowerDirection === '-1') {
          sanitized[field] = -1;
        } else {
          errors.push(`Sort direction for field '${field}' must be asc, desc, 1, or -1`);
        }
      } else {
        errors.push(`Sort value for field '${field}' must be a number or string`);
      }
    }
    
    return { valid: errors.length === 0, errors, sanitized };
  }
  
  errors.push('Sort must be a string or object');
  return { valid: false, errors, sanitized: {} };
}

/**
 * Type guard for plain objects
 */
export function isPlainObject(value: any): value is Record<string, any> {
  return value !== null && 
         typeof value === 'object' && 
         !Array.isArray(value) && 
         Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Type guard for arrays
 */
export function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

/**
 * Type guard for strings
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for numbers
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard for booleans
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard for dates
 */
export function isDate(value: any): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Validate data against schema
 */
export function validateData(data: any, schema: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // This is a basic validation - in a real implementation,
  // you might want to use a library like Joi or Yup
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${field}' is required`);
      continue;
    }
    
    if (value !== undefined && value !== null) {
      if (rules.type && typeof value !== rules.type) {
        errors.push(`Field '${field}' must be of type ${rules.type}`);
      }
      
      if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        errors.push(`Field '${field}' must be at least ${rules.minLength} characters long`);
      }
      
      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        errors.push(`Field '${field}' must be no more than ${rules.maxLength} characters long`);
      }
      
      if (rules.min && typeof value === 'number' && value < rules.min) {
        errors.push(`Field '${field}' must be at least ${rules.min}`);
      }
      
      if (rules.max && typeof value === 'number' && value > rules.max) {
        errors.push(`Field '${field}' must be no more than ${rules.max}`);
      }
      
      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        errors.push(`Field '${field}' does not match required pattern`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
