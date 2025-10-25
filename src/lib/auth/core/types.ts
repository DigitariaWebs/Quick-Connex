/**
 * Centralized Authentication Types
 * 
 * All authentication and session-related types in one place.
 * Provides type safety and consistency across the auth system.
 */

import { NextRequest } from 'next/server';
import { RiskLevel } from '@/models/AuditLog';

// ===== USER TYPES =====

export type UserRole = 'employee' | 'manager' | 'admin' | 'super_admin';

export interface AuthUser {
  _id: string;
  email: string;
  userType: UserRole;
  firstName: string;
  lastName: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
}

// ===== SESSION TYPES =====

export interface AuthSession {
  sessionId: string;
  expiresAt: Date;
  lastAccessedAt: Date;
  securityRisk: 'low' | 'medium' | 'high';
  isNewDevice: boolean;
  isNewLocation: boolean;
  sessionAge: number;
  remainingTime: number;
  isPrimary: boolean;
}

export interface SessionInfo {
  sessionId: string;
  expiresAt: Date;
  lastAccessedAt: Date;
  securityRisk: 'low' | 'medium' | 'high';
  isNewDevice: boolean;
  isNewLocation: boolean;
  sessionAge: number;
  remainingTime: number;
  isPrimary: boolean;
}

// ===== AUTHENTICATION TYPES =====

export interface AuthContext {
  user: AuthUser;
  session: AuthSession;
  isValid: boolean;
  securityRisk: RiskLevel;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
  errorCode?: string;
}

export interface AuthOptions {
  roles?: UserRole[];
  requireSession?: boolean;
  requireActiveStatus?: boolean;
  skipRateLimit?: boolean;
}

// ===== LOGIN TYPES =====

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult extends AuthResult {
  session?: SessionInfo;
  securityFlags?: string[];
  riskScore?: number;
}

// ===== SESSION VALIDATION TYPES =====

export interface SessionValidation {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
  errorCode?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  userType: UserRole;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

// ===== SECURITY TYPES =====

export interface SecurityCheck {
  suspicious: boolean;
  flags: string[];
  riskScore: number;
  recommendations: string[];
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
  remaining?: number;
}

export interface RiskAssessment {
  riskLevel: RiskLevel;
  riskScore: number;
  flags: string[];
  recommendations: string[];
}

// ===== DEVICE TYPES =====

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  screenResolution?: string;
  timezone: string;
  language: string;
}

export interface LocationInfo {
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

// ===== REQUEST TYPES =====

export interface RequestInfo {
  ipAddress: string;
  userAgent: string;
  method?: string;
  endpoint?: string;
  requestId?: string;
  sessionId?: string;
  deviceFingerprint?: string;
}

// ===== AUDIT TYPES =====

export interface AuthAuditContext {
  actorId: string;
  actorType: 'admin' | 'user' | 'system' | 'api' | 'batch';
  actorEmail?: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  description: string;
  targetResourceId?: string;
  targetResourceType?: string;
  metadata?: Record<string, any>;
  requestInfo?: RequestInfo;
  success?: boolean;
  errorMessage?: string;
  riskLevel?: RiskLevel;
  isSensitive?: boolean;
  requiresReview?: boolean;
}

// ===== CONFIGURATION TYPES =====

export interface AuthConfig {
  // Rate limiting
  maxLoginAttempts: number;
  loginWindowMs: number;
  maxSessionsPerUser: number;
  
  // Session security
  sessionTimeoutMinutes: number;
  requireIpBinding: boolean;
  suspiciousActivityThreshold: number;
  
  // Device security
  requireDeviceVerification: boolean;
  maxNewDevicesPerDay: number;
  
  // JWT settings
  tokenExpirationHours: number;
  refreshTokenExpirationDays: number;
  
  // Security thresholds
  highRiskThreshold: number;
  mediumRiskThreshold: number;
}

// ===== ERROR TYPES =====

export interface AuthError {
  code: string;
  message: string;
  status: number;
  details?: any;
}

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_NOT_APPROVED = 'ACCOUNT_NOT_APPROVED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_REVOKED = 'SESSION_REVOKED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  RATE_LIMITED = 'RATE_LIMITED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  IP_MISMATCH = 'IP_MISMATCH',
  DEVICE_NOT_TRUSTED = 'DEVICE_NOT_TRUSTED',
  TOO_MANY_SESSIONS = 'TOO_MANY_SESSIONS',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// ===== RESPONSE TYPES =====

export interface AuthResponse {
  success: boolean;
  data?: any;
  error?: string;
  errorCode?: string;
  message?: string;
}

// ===== CACHE TYPES =====

export interface SessionCacheEntry {
  session: AuthSession;
  user: AuthUser;
  lastAccessed: Date;
  expiresAt: Date;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  missRate: number;
  evictions: number;
}

// ===== METRICS TYPES =====

export interface AuthMetrics {
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  activeSessions: number;
  revokedSessions: number;
  averageSessionAge: number;
  securityIncidents: number;
  rateLimitHits: number;
}

export interface PerformanceMetrics {
  averageAuthTime: number;
  averageSessionValidationTime: number;
  cacheHitRate: number;
  databaseQueryTime: number;
  totalRequests: number;
}

// ===== UTILITY TYPES =====

export type AuthMethod = 'password' | 'oauth' | 'saml' | 'ldap';

export interface AuthProvider {
  name: string;
  type: AuthMethod;
  enabled: boolean;
  config: Record<string, any>;
}

export interface SessionCleanupResult {
  cleaned: number;
  performance: number;
  errors: number;
}

// ===== ZOD VALIDATION SCHEMAS =====

import { z } from 'zod';

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
 * Note: All fields are required because parseUserAgent always returns values
 * (even if they're 'Unknown'). This matches the actual data structure.
 */
export const deviceInfoSchema = z.object({
  userAgent: z.string().min(1, 'User agent is required'),
  platform: z.string(),           // Always present (may be 'Unknown')
  browser: z.string(),            // Always present (may be 'Unknown')
  browserVersion: z.string(),     // Always present (may be 'Unknown')
  os: z.string(),                 // Always present (may be 'Unknown')
  osVersion: z.string(),          // Always present (may be 'Unknown')
  deviceType: z.enum(['desktop', 'mobile', 'tablet']),  // Always present
  screenResolution: z.string().optional(),  // Optional (client-side data)
  timezone: z.string().optional(),          // Optional (client-side data)
  language: z.string().optional()           // Optional (client-side data)
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

// ===== EXPORT ALL TYPES =====

export type {
  NextRequest
};
