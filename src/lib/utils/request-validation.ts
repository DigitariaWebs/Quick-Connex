import { z } from 'zod';
import { NextResponse } from 'next/server';

/**
 * Request Validation Utilities
 * 
 * Input validation and sanitization using Zod.
 * Provides type-safe validation with comprehensive schemas.
 */

// ===== ZOD SCHEMAS =====

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(254, 'Email too long')
  .transform(email => email.toLowerCase().trim());

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

/**
 * Phone number validation schema
 */
export const phoneSchema = z
  .string()
  .regex(
    /^[\+]?[1-9][\d]{0,15}$/,
    'Invalid phone number format'
  )
  .transform(phone => phone.replace(/\D/g, '')); // Remove non-digits

/**
 * MongoDB ObjectId validation schema
 */
export const mongoIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId format');

/**
 * UUID validation schema
 */
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

/**
 * URL validation schema
 */
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL too long');

/**
 * Date range validation schema
 */
export const dateRangeSchema = z.object({
  start: z.string().datetime('Invalid start date format'),
  end: z.string().datetime('Invalid end date format')
}).refine(
  data => new Date(data.start) <= new Date(data.end),
  {
    message: 'Start date must be before end date',
    path: ['end']
  }
);

/**
 * Pagination validation schema
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : 1)
    .refine(val => val > 0, 'Page must be greater than 0'),
  limit: z
    .string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : 20)
    .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100')
});

/**
 * Sort validation schema
 */
export const sortSchema = z.object({
  sort: z.string().optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc')
});

// ===== SANITIZATION FUNCTIONS =====

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Sanitize string input with XSS prevention
 */
export function sanitizeString(
  input: string,
  options: {
    maxLength?: number;
    allowHtml?: boolean;
    trim?: boolean;
  } = {}
): string {
  const { maxLength = 1000, allowHtml = false, trim = true } = options;
  
  let sanitized = input;
  
  if (trim) {
    sanitized = sanitized.trim();
  }
  
  if (!allowHtml) {
    // Basic XSS prevention
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, ''); // Remove non-digits
}

/**
 * Sanitize filename
 */
export function sanitizeFileName(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace invalid chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.toString();
  } catch {
    throw new Error('Invalid URL format');
  }
}

// ===== VALIDATION FUNCTIONS =====

/**
 * Validate data with Zod schema
 */
export async function validateWithSchema<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): Promise<{
  success: true;
  data: T;
} | {
  success: false;
  response: NextResponse;
}> {
  try {
    const validatedData = await schema.parseAsync(data);
    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return {
        success: false,
        response: NextResponse.json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: { validationErrors }
        }, { status: 400 })
      };
    }
    
    return {
      success: false,
      response: NextResponse.json({
        success: false,
        error: 'Validation error',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    };
  }
}

/**
 * Parse and validate data in one step
 */
export async function parseAndValidate<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): Promise<T> {
  return await schema.parseAsync(data);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}

/**
 * Validate phone number
 */
export function validatePhone(phone: string): boolean {
  return phoneSchema.safeParse(phone).success;
}

/**
 * Validate MongoDB ObjectId
 */
export function validateMongoId(id: string): boolean {
  return mongoIdSchema.safeParse(id).success;
}

/**
 * Validate UUID
 */
export function validateUUID(id: string): boolean {
  return uuidSchema.safeParse(id).success;
}

/**
 * Validate URL
 */
export function validateUrl(url: string): boolean {
  return urlSchema.safeParse(url).success;
}

// ===== SECURITY FUNCTIONS =====

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return text.replace(/[&<>"'/]/g, (s) => map[s]);
}

/**
 * Normalize Unicode text
 */
export function normalizeUnicode(text: string): string {
  return text.normalize('NFC');
}

/**
 * Validate file path to prevent directory traversal
 */
export function validateFilePath(filePath: string): boolean {
  // Prevent directory traversal attacks
  return !filePath.includes('..') && !filePath.includes('~');
}

/**
 * Sanitize SQL-like input (basic protection)
 */
export function sanitizeSqlInput(input: string): string {
  return input
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[;]/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comments
    .replace(/\*\//g, '');
}

// ===== COMMON SCHEMAS =====

/**
 * Common user creation schema
 */
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: phoneSchema.optional(),
  userType: z.enum(['employee', 'manager', 'admin', 'super_admin'])
});

/**
 * Common user update schema
 */
export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: phoneSchema.optional(),
  userType: z.enum(['employee', 'manager', 'admin', 'super_admin']).optional()
});

/**
 * Common login schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

/**
 * Common ID parameter schema
 */
export const idParamSchema = z.object({
  id: mongoIdSchema
});

/**
 * Common search schema
 */
export const searchSchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().min(1).max(50).default(20),
  page: z.number().min(1).default(1)
});

/**
 * Sanitize query input for database operations
 */
export function sanitizeQueryInput(input: any): any {
  if (typeof input === 'string') {
    return sanitizeString(input);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeString(key)] = sanitizeQueryInput(value);
    }
    return sanitized;
  }
  
  return input;
}
