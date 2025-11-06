/**
 * Auth Validation Schemas
 * 
 * Zod validation schemas for authentication.
 */

import { z } from 'zod';
import { UserRole } from './user.types';

/**
 * Email validation schema
 */
export const emailSchema = z.string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(255, 'Email too long');

/**
 * Password validation schema
 */
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

/**
 * UUID validation schema
 */
export const uuidSchema = z.string()
  .uuid('Invalid UUID format');

/**
 * IP address validation schema
 */
export const ipAddressSchema = z.string()
  .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^127\.0\.0\.1$/, 'Invalid IP address format');

/**
 * User role validation schema
 */
export const userRoleSchema = z.enum(['employee', 'manager', 'admin', 'super_admin']);

/**
 * Login credentials validation schema
 */
export const loginCredentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

/**
 * Session validation schema
 */
export const sessionValidationSchema = z.object({
  sessionId: uuidSchema,
  ipAddress: ipAddressSchema.optional()
});

/**
 * Auth options validation schema
 */
export const authOptionsSchema = z.object({
  requireSession: z.boolean().optional(),
  roles: z.array(userRoleSchema).optional(),
  requireActiveStatus: z.boolean().optional()
});

/**
 * Device info validation schema
 */
export const deviceInfoSchema = z.object({
  userAgent: z.string().min(1, 'User agent is required'),
  platform: z.string(),
  browser: z.string(),
  browserVersion: z.string(),
  os: z.string(),
  osVersion: z.string(),
  deviceType: z.enum(['desktop', 'mobile', 'tablet']),
  screenResolution: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional()
});

/**
 * Request info validation schema
 */
export const requestInfoSchema = z.object({
  ipAddress: ipAddressSchema,
  userAgent: z.string().min(1, 'User agent is required'),
  referer: z.string().optional(),
  origin: z.string().optional(),
  timestamp: z.date().optional()
});

/**
 * Phone validation schema
 */
export const phoneSchema = z.string()
  .min(7, 'Phone number too short')
  .max(15, 'Phone number too long')
  .regex(/^\+?[0-9\s\-\(\)]+$/, 'Invalid phone number format');

/**
 * Signup validation schema
 */
export const signupSchema = z.object({
  userType: z.enum(['employee', 'manager']),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  post: z.string().optional(),
  ciusss: z.string().optional(),
  hospital: z.string().optional(),
  documents: z.array(z.object({
    fileId: z.string(),
    documentType: z.enum(['cv', 'opiqPermit', 'rcr']),
    originalName: z.string(),
    mimeType: z.string(),
    size: z.number(),
    checksum: z.string(),
    uploadedAt: z.date().optional()
  })).optional()
});

/**
 * Session creation schema
 */
export const sessionCreationSchema = z.object({
  userId: uuidSchema,
  deviceInfo: deviceInfoSchema,
  ipAddress: ipAddressSchema,
  screenResolution: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional()
});

