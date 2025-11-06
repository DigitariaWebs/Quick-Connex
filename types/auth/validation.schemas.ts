/**
 * Validation Schemas
 * 
 * Zod validation schemas for authentication and user management.
 */

import { z } from 'zod';

export const emailSchema = z.string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(255, 'Email too long');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

export const phoneSchema = z.string()
  .min(7, 'Phone number too short')
  .max(15, 'Phone number too long')
  .regex(/^\+?[0-9\s\-\(\)]+$/, 'Invalid phone number format');

export const uuidSchema = z.string()
  .uuid('Invalid UUID format');

export const ipAddressSchema = z.string()
  .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^127\.0\.0\.1$/, 'Invalid IP address format');

export const userRoleSchema = z.enum(['employee', 'manager', 'admin', 'super_admin']);

export const loginCredentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const signupSchema = z.object({
  userType: z.enum(['employee', 'manager']),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  // Manager fields (conditional)
  post: z.string().optional(),
  ciusss: z.string().optional(),
  hospital: z.string().optional(),
  // Documents array for employees
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

export const sessionValidationSchema = z.object({
  sessionId: uuidSchema,
  ipAddress: ipAddressSchema.optional()
});

export const authOptionsSchema = z.object({
  requireSession: z.boolean().optional(),
  roles: z.array(userRoleSchema).optional(),
  requireActiveStatus: z.boolean().optional()
});

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

export const requestInfoSchema = z.object({
  ipAddress: ipAddressSchema,
  userAgent: z.string().min(1, 'User agent is required'),
  referer: z.string().optional(),
  origin: z.string().optional(),
  timestamp: z.date().optional()
});

export const sessionCreationSchema = z.object({
  userId: uuidSchema,
  deviceInfo: deviceInfoSchema,
  ipAddress: ipAddressSchema,
  screenResolution: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional()
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema
});

export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const userUpdateSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  post: z.string().optional(),
  ciusss: z.string().optional(),
  hospital: z.string().optional(),
  permissions: z.array(z.string()).optional()
});

export const userFiltersSchema = z.object({
  search: z.string().optional(),
  userType: z.array(userRoleSchema).optional(),
  status: z.array(z.enum(['pending', 'approved', 'rejected', 'suspended'])).optional(),
  organization: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.date().optional(),
    end: z.date().optional()
  }).optional(),
  verificationStatus: z.array(z.string()).optional(),
  activityStatus: z.array(z.string()).optional()
});

// Type inference from schemas
export type LoginCredentialsInput = z.infer<typeof loginCredentialsSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type SessionValidationInput = z.infer<typeof sessionValidationSchema>;
export type AuthOptionsInput = z.infer<typeof authOptionsSchema>;
export type DeviceInfoInput = z.infer<typeof deviceInfoSchema>;
export type RequestInfoInput = z.infer<typeof requestInfoSchema>;
export type SessionCreationInput = z.infer<typeof sessionCreationSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type UserFiltersInput = z.infer<typeof userFiltersSchema>;
