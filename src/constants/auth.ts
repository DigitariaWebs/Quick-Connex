/**
 * Authentication System Constants
 * 
 * This file contains all constants and configuration values for the authentication system.
 */

/**
 * User Roles
 */
export const USER_ROLES = {
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  ADMIN: 'admin'
} as const;

/**
 * User Types
 */
export const USER_TYPES = {
  MANAGER: 'manager',
  EMPLOYEE: 'employee'
} as const;

/**
 * Authentication Configuration
 */
export const AUTH_CONFIG = {
  JWT_EXPIRES_IN: '7d',
  PASSWORD_MIN_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_TIME: 15 * 60 * 1000, // 15 minutes
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * Document Types
 */
export const DOCUMENT_TYPES = {
  CV: 'cv',
  OPIQ_PERMIT: 'opiqPermit',
  RCR: 'rcr'
} as const;

/**
 * Auth Error Messages
 */
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_NOT_FOUND: 'User not found',
  USER_NOT_APPROVED: 'Your account is pending approval',
  ACCOUNT_LOCKED: 'Account temporarily locked due to too many failed attempts',
  TOKEN_EXPIRED: 'Session expired, please login again',
  TOKEN_INVALID: 'Invalid authentication token',
  EMAIL_ALREADY_EXISTS: 'Email already registered',
  WEAK_PASSWORD: 'Password must be at least 8 characters long',
  TERMS_NOT_ACCEPTED: 'You must accept the terms and conditions',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  MISSING_REQUIRED_FIELDS: 'Please fill in all required fields'
} as const;

/**
 * Auth Success Messages
 */
export const AUTH_SUCCESS = {
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  SIGNUP_SUCCESS: 'Account created successfully',
  PASSWORD_RESET_SENT: 'Password reset email sent',
  PASSWORD_RESET_SUCCESS: 'Password reset successfully',
  ACCOUNT_APPROVED: 'Account approved successfully',
  ACCOUNT_REJECTED: 'Account rejected'
} as const;
