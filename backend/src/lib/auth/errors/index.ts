/**
 * Auth Errors Module
 * 
 * Authentication-specific error classes and utilities.
 */

// Re-export error classes from backend types
export {
  AuthError,
  AuthValidationError,
  UnauthorizedError,
  ForbiddenError,
  AuthNotFoundError,
  ConflictError,
  RateLimitError
} from '../../../types/auth/errors.types';

// Re-export error codes
export { AuthErrorCode } from '../../../types/auth/errors.types';

// Re-export token error codes
export { TokenErrorCode } from '../../../types/auth/token.types';
