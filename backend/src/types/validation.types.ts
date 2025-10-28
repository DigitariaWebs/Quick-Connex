/**
 * Validation Types
 * 
 * Types for request validation and validation results.
 */

import { ValidationErrorDetail } from './api.types';

/**
 * Validation result structure
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrorDetail[];
}

/**
 * Validation schema for request validation
 */
export interface ValidationSchema {
  required?: string[];
  optional?: string[];
  rules?: Record<string, ValidationRule>;
}

/**
 * Individual validation rule
 */
export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'email' | 'objectId' | 'array' | 'custom';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  message?: string;
}

/**
 * Validation context for custom validation
 */
export interface ValidationContext {
  field: string;
  value: any;
  data: any;
  schema: ValidationSchema;
}
