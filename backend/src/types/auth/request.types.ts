/**
 * Request Types
 * 
 * Request-related types for authentication and API handling.
 */

// ===== AUTHENTICATION REQUEST TYPES =====

/**
 * Login Request
 * Credentials for user login
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    browser: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
  };
}

/**
 * Signup Request
 * User registration data
 */
export interface SignupRequest {
  userType: 'employee' | 'manager';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  post?: string;
  ciusss?: string;
  hospital?: string;
  documents?: Array<{
    fileId: string;
    documentType: 'cv' | 'opiqPermit' | 'rcr';
    originalName: string;
    mimeType: string;
    size: number;
    checksum: string;
  }>;
  termsAccepted: boolean;
}

/**
 * Token Refresh Request
 * Request to refresh access token
 */
export interface TokenRefreshRequest {
  refreshToken?: string; // Optional, can be from cookie
  deviceFingerprint?: string;
}

/**
 * Password Reset Request
 * Request to reset password
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password Reset Confirm Request
 * Confirm password reset with token
 */
export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Change Password Request
 * Change password for authenticated user
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ===== AUTHENTICATION RESPONSE TYPES =====

/**
 * Login Response
 * Response from login endpoint
 */
export interface LoginResponse {
  success: boolean;
  user?: {
    _id: string;
    email: string;
    userType: 'employee' | 'manager' | 'admin' | 'super_admin';
    firstName: string;
    lastName: string;
    status: 'pending' | 'approved' | 'rejected' | 'suspended';
  };
  session?: {
    sessionId: string;
    expiresAt: Date;
    lastAccessedAt: Date;
    securityRisk: 'low' | 'medium' | 'high';
    isNewDevice: boolean;
    isNewLocation: boolean;
    sessionAge: number;
    remainingTime: number;
    isPrimary: boolean;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
  };
  securityFlags?: string[];
  riskScore?: number;
  error?: string;
  errorCode?: string;
}

/**
 * Signup Response
 * Response from signup endpoint
 */
export interface SignupResponse {
  success: boolean;
  user?: {
    _id: string;
    email: string;
    userType: 'employee' | 'manager';
    firstName: string;
    lastName: string;
    status: 'pending';
  };
  message?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Logout Response
 * Response from logout endpoint
 */
export interface LogoutResponse {
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Password Reset Response
 * Response from password reset request
 */
export interface PasswordResetResponse {
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
}

// ===== AUTHENTICATION CONTEXT TYPES =====

/**
 * Auth Context
 * Authentication context for protected routes
 */
export interface AuthContext {
  user: {
    _id: string;
    email: string;
    userType: 'employee' | 'manager' | 'admin' | 'super_admin';
    firstName: string;
    lastName: string;
    status: 'pending' | 'approved' | 'rejected' | 'suspended';
  };
  session: {
    sessionId: string;
    expiresAt: Date;
    lastAccessedAt: Date;
    securityRisk: 'low' | 'medium' | 'high';
    isNewDevice: boolean;
    isNewLocation: boolean;
    sessionAge: number;
    remainingTime: number;
    isPrimary: boolean;
  };
  isValid: boolean;
  securityRisk: 'low' | 'medium' | 'high';
}

/**
 * Auth Options
 * Options for authentication middleware
 */
export interface AuthOptions {
  roles?: ('employee' | 'manager' | 'admin' | 'super_admin')[];
  requireSession?: boolean;
  requireActiveStatus?: boolean;
  skipRateLimit?: boolean;
  allowExpiredSession?: boolean;
}

// ===== REQUEST VALIDATION TYPES =====

/**
 * Request Validation Result
 * Result of request validation
 */
export interface RequestValidationResult {
  isValid: boolean;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  sanitizedData?: any;
}

/**
 * Rate Limit Check Result
 * Result of rate limiting check
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
  remaining?: number;
  limit?: number;
  windowMs?: number;
}

// ===== REQUEST PROCESSING TYPES =====

/**
 * Request Processing Context
 * Context for processing authentication requests
 */
export interface RequestProcessingContext {
  requestId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  method: string;
  endpoint: string;
  userId?: string;
  sessionId?: string;
  deviceFingerprint?: string;
  metadata?: Record<string, any>;
}

/**
 * Request Audit Context
 * Context for auditing authentication requests
 */
export interface RequestAuditContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  action: string;
  description: string;
  success: boolean;
  errorMessage?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}

// ===== REQUEST MIDDLEWARE TYPES =====

/**
 * Auth Middleware Options
 * Options for authentication middleware
 */
export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: ('employee' | 'manager' | 'admin' | 'super_admin')[];
  allowExpired?: boolean;
  skipRateLimit?: boolean;
  customValidation?: (context: AuthContext) => boolean;
}

/**
 * Rate Limit Middleware Options
 * Options for rate limiting middleware
 */
export interface RateLimitMiddlewareOptions {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

// ===== REQUEST ERROR TYPES =====

/**
 * Request Error
 * Error thrown during request processing
 */
export interface RequestError {
  code: string;
  message: string;
  status: number;
  details?: {
    field?: string;
    value?: any;
    reason?: string;
    requestId?: string;
  };
}

// ===== REQUEST STATISTICS TYPES =====

/**
 * Request Statistics
 * Statistics for authentication requests
 */
export interface RequestStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  requestsByEndpoint: Record<string, number>;
  requestsByMethod: Record<string, number>;
  requestsByStatus: Record<number, number>;
  requestsByHour: Record<string, number>;
}

/**
 * Authentication Statistics
 * Statistics for authentication operations
 */
export interface AuthenticationStats {
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  totalSignups: number;
  successfulSignups: number;
  failedSignups: number;
  totalLogouts: number;
  totalTokenRefreshes: number;
  averageLoginTime: number;
  averageSignupTime: number;
  securityIncidents: number;
}
