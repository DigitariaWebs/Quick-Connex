/**
 * Auth Error Types
 * 
 * Authentication-specific error codes and error classes.
 */

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
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_PASSWORD_RESET_TOKEN = 'INVALID_PASSWORD_RESET_TOKEN',
  PASSWORD_RESET_TOKEN_EXPIRED = 'PASSWORD_RESET_TOKEN_EXPIRED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  ACCOUNT_REJECTED = 'ACCOUNT_REJECTED'
}

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class AuthValidationError extends AuthError {
  constructor(message: string, details?: any) {
    super(AuthErrorCode.VALIDATION_ERROR, message, 400, details);
    this.name = 'AuthValidationError';
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message: string = 'Unauthorized') {
    super(AuthErrorCode.AUTHENTICATION_REQUIRED, message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AuthError {
  constructor(message: string = 'Forbidden') {
    super(AuthErrorCode.INSUFFICIENT_PERMISSIONS, message, 403);
    this.name = 'ForbiddenError';
  }
}

export class AuthNotFoundError extends AuthError {
  constructor(message: string = 'User not found') {
    super(AuthErrorCode.USER_NOT_FOUND, message, 404);
    this.name = 'AuthNotFoundError';
  }
}

export class ConflictError extends AuthError {
  constructor(message: string, details?: any) {
    super(AuthErrorCode.EMAIL_ALREADY_EXISTS, message, 409, details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AuthError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(AuthErrorCode.RATE_LIMITED, message, 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class ServerError extends AuthError {
  constructor(message: string = 'Internal server error') {
    super(AuthErrorCode.INTERNAL_ERROR, message, 500);
    this.name = 'ServerError';
  }
}

export interface AuthErrorResponse {
  success: false;
  error: {
    code: AuthErrorCode;
    message: string;
    details?: any;
    retryable?: boolean;
    retryAfter?: number;
  };
  timestamp: string;
}

export interface AuthValidationErrorResponse extends AuthErrorResponse {
  error: {
    code: AuthErrorCode.VALIDATION_ERROR;
    message: string;
    details: Array<{
      field: string;
      message: string;
      code: string;
      value?: any;
    }>;
  };
}
