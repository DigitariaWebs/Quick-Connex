/**
 * Auth Types
 * 
 * Centralized authentication and authorization types.
 * Clean exports for all auth-related functionality.
 */

export * from './user.types';
export * from './session.types';
export * from './token.types';
// Note: request.types exports are handled separately to avoid conflicts with ../request.types
export * from './config.types';
export * from './credentials.types';
export * from './permissions.types';
export * from './security.types';
export * from './validation.schemas';
export * from './errors.types';
export * from './service.types';

// Re-export commonly used types for convenience
export type {
  UserRole,
  User,
  AuthUser
} from './user.types';

export type {
  Permission
} from './permissions.types';

export type {
  SessionInfo,
  AuthSession,
  SessionType
} from './session.types';

export type {
  TokenPayload,
  JWTPayload
} from './token.types';

export type {
  LoginCredentials,
  LoginFormData,
  SignupFormData,
  UserType
} from './credentials.types';

export type {
  DeviceInfo,
  LocationInfo,
  SecurityCheck,
  RiskAssessment,
  RateLimitResult
} from './security.types';

export type {
  RequestInfo
} from './request.types';
// Note: AuthenticatedRequest and AdminRequest are exported from ../request.types (which extends NextRequest)

export type {
  AuthErrorCode,
  AuthError
} from './errors.types';

export type {
  AuthConfig
} from './config.types';

export type {
  AuthStatus,
  AuthContext,
  AuthResult,
  AuthOptions,
  LoginResult,
  SessionValidation,
  AuthResponse,
  SessionCacheEntry,
  CacheStats,
  AuthMetrics,
  PerformanceMetrics,
  AuthMethod,
  AuthProvider,
  SessionCleanupResult,
  AuthContextType
} from './service.types';

