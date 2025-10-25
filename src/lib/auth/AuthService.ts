/**
 * Centralized Authentication Service
 * 
 * Single source of truth for all authentication and session operations.
 * Provides clean, consistent API similar to AuditService.
 */

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '@/lib/database';
import Session from '@/models/Session';
import User from '@/models/User';
import { AuditService } from '@/lib/services/audit';
import { SessionService } from '@/lib/services/session';
import { AUTH_CONFIG } from './auth-config';
import { 
  AuthContext, 
  AuthResult, 
  AuthOptions, 
  LoginCredentials, 
  LoginResult,
  SessionValidation,
  TokenPayload,
  AuthUser,
  AuthSession,
  SecurityCheck,
  RateLimitResult,
  RiskAssessment,
  DeviceInfo,
  RequestInfo,
  AuthAuditContext,
  AuthErrorCode,
  AuthConfig,
  UserRole
} from './auth-types';
import { RiskLevel, AuditAction, ActorType, TargetResourceType } from '@/models/AuditLog';
import { AuthAuditContext as AuditAuthContext } from '@/lib/services/audit';
import { signToken, verifyToken, getTokenFromCookies } from './jwt-utils';
import { 
  AppError,
  AuthError, 
  ValidationError, 
  RateLimitError, 
  NotFoundError,
  formatErrorForClient 
} from '@/lib/utils/error-handling';
import { log } from '@/lib/services';

// Helper function to handle error type conversion
const logError = (message: string, error: any, context?: any) => {
  log.error(message, error, context);
};
import { 
  maskEmail, 
  truncate 
} from '@/lib/utils/string-helpers';
import { 
  sanitizeString 
} from '@/lib/utils/request-validation';
import { 
  pickFields, 
  omitFields, 
  groupBy, 
  isEmpty 
} from '@/lib/utils/data-helpers';
import { 
  addHoursToDate, 
  isWithinRange, 
  calculateDateDiff, 
  isPast 
} from '@/lib/utils/date-time';
import { 
  retry, 
  timeout, 
  batchProcess 
} from '@/lib/utils/async-helpers';
import { 
  transformUserForAuth, 
  transformSessionForAuth, 
  sanitizeUserForLogging 
} from '@/lib/utils/transformers';
import { 
  loginCredentialsSchema, 
  sessionValidationSchema, 
  authOptionsSchema, 
  deviceInfoSchema,
  signupSchema
} from './auth-types';
import {
  parseUserAgent,
  generateDeviceFingerprint,
  assessSecurityRisk,
  checkSuspiciousActivity,
  extractIpAddress,
  isNewDevice,
  isNewLocation,
  generateSessionId,
  isValidSessionToken,
  calculateSessionAge,
  isSessionExpiringSoon,
  formatDeviceInfoForLogging,
  isSuspiciousUserAgent,
  generateRateLimitKey,
  isRateLimitExceeded,
  updateRateLimit
} from './auth-utils';
import {
  rateLimitStore,
  failedAttempts,
  activeSessions,
  SECURITY_FLAGS,
  RISK_THRESHOLDS,
  SESSION_LIMITS,
  RATE_LIMITS,
  SECURITY_RECOMMENDATIONS,
  AUTH_ERROR_CODES,
  CLEANUP_INTERVALS,
  TIMEOUTS
} from './auth-constants';

// ===== MAIN AUTH SERVICE =====

export class AuthService {
  
  // ===== AUTHENTICATION METHODS =====
  
  /**
   * Handle complete signup flow with validation and session creation
   */
  static async signup(
    userData: any,
    request: NextRequest
  ): Promise<LoginResult> {
    try {
      // 1. Validate with Zod
      const validated = signupSchema.parse(userData);
      
      // 2. Check for existing user
      const existing = await DatabaseService.findOne(User, { 
        $or: [{ email: validated.email }, { phone: validated.phone }]
      });
      if (existing) {
        throw new ValidationError('User already exists');
      }
      
      // 3. Hash password
      const hashedPassword = await bcrypt.hash(validated.password, 12);
      
      // 4. Create user
      const user = await DatabaseService.create(User, {
        ...validated,
        password: hashedPassword,
        email: validated.email.toLowerCase()
      });
      
      // 5. If approved, create session
      if (user.status === 'approved') {
        const ipAddress = extractIpAddress(request);
        const userAgent = request.headers.get('user-agent') || 'Unknown';
        const deviceInfo = parseUserAgent(userAgent);
        
        return await this.createSession(
          (user._id as any).toString(),
          deviceInfo,
          ipAddress,
          request
        );
      }
      
      // 6. Pending users don't get session
      return {
        success: true,
        user: transformUserForAuth({
          _id: (user._id as any).toString(),
          email: user.email,
          userType: user.userType,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status
        })
      };
    } catch (error) {
      logError('Signup failed', error, {
        operation: 'signup',
        timestamp: new Date()
      });
      
      // Re-throw custom errors, wrap others
      if (error instanceof ValidationError || error instanceof AppError) {
        throw error;
      }
      
      const errorInfo = formatErrorForClient(error);
      throw new AppError(
        errorInfo.message,
        500,
        errorInfo.code
      );
    }
  }
  
  /**
   * Handle complete login flow with security checks
   */
  static async login(
    credentials: LoginCredentials, 
    request: NextRequest
  ): Promise<LoginResult> {
    // Validate input
    const validatedCredentials = loginCredentialsSchema.parse(credentials);
    const startTime = Date.now();
    const ipAddress = extractIpAddress(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    
    try {
      log.info('Login process started', {
        operation: 'login_start',
        email: maskEmail(validatedCredentials.email),
        ipAddress,
        timestamp: new Date()
      });
      // DatabaseService handles connection automatically
      
      // Check rate limiting
      const rateLimit = await this.checkRateLimit(validatedCredentials.email, 'login');
      if (!rateLimit.allowed) {
        throw new RateLimitError(rateLimit.reason || 'Rate limit exceeded');
      }
      
      // Find user with retry logic
      const user = await retry(
        async () => await DatabaseService.findOne(User, { email: validatedCredentials.email.toLowerCase() }),
        { maxAttempts: 3, baseDelay: 100 }
      );
      if (!user) {
        await this.recordFailedAttempt(validatedCredentials.email, ipAddress);
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }
      
      // Check if account is locked
      if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
        throw new AppError('Account temporarily locked due to multiple failed attempts', 423, 'ACCOUNT_LOCKED');
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(validatedCredentials.password, user.password);
      if (!isPasswordValid) {
        // Record failed login attempt
        await DatabaseService.updateOne(User, 
          { _id: user._id }, 
          { 
            $push: { 
              loginHistory: { 
                timestamp: new Date(), 
                ipAddress: ipAddress, 
                success: false 
              } 
            },
            updatedAt: new Date()
          }
        );
        await this.recordFailedAttempt(validatedCredentials.email, ipAddress);
        
        // Log failed login
        await this.logAuthEvent({
          actorId: (user._id as any).toString(),
          actorType: ActorType.USER,
          actorEmail: maskEmail(user.email),
          actorName: `${user.firstName} ${user.lastName}`,
          actorRole: user.userType,
          action: AuditAction.LOGIN_FAILED,
          description: `Failed login attempt for ${maskEmail(user.email)}`,
          targetResourceId: (user._id as any).toString(),
          requestInfo: this.extractRequestInfo(request),
          success: false,
          errorMessage: 'Invalid password'
        });
        
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }
      
      // Check user status
      if (user.status !== 'approved') {
        // Record failed login attempt for unapproved account
        await DatabaseService.updateOne(User, 
          { _id: user._id }, 
          { 
            $push: { 
              loginHistory: { 
                timestamp: new Date(), 
                ipAddress: ipAddress, 
                success: false 
              } 
            },
            updatedAt: new Date()
          }
        );
        
        let message = 'Account not approved';
        if (user.status === 'suspended') message = 'Account suspended';
        else if (user.status === 'rejected') message = 'Account rejected';
        else if (user.status === 'pending') message = 'Account pending approval';
        
        throw new AppError(message, 403, 'ACCOUNT_NOT_APPROVED');
      }
      
      // Create session using SessionService
      const deviceInfo = parseUserAgent(userAgent);
      const session = await SessionService.createSession({
        userId: (user._id as any).toString(),
        deviceInfo,
        ipAddress,
        userAgent
      });
      
      // Create JWT token
      const jwtToken = await signToken({
        userId: (user._id as any).toString(),
        email: user.email,
        userType: user.userType,
        sessionId: session.sessionId
      });
      
      // Record successful login
      await DatabaseService.updateOne(User, 
        { _id: user._id }, 
        { 
          $push: { 
            loginHistory: { 
              timestamp: new Date(), 
              ipAddress: ipAddress, 
              success: true 
            } 
          },
          $unset: { accountLockedUntil: 1 }, // Clear any account lock
          updatedAt: new Date()
        }
      );
      
      // Log successful login
      await this.logAuthEvent({
        actorId: (user._id as any).toString(),
        actorType: ActorType.USER,
        actorEmail: maskEmail(user.email),
        actorName: `${user.firstName} ${user.lastName}`,
        actorRole: user.userType,
        action: AuditAction.LOGIN_SUCCESS,
        description: `Successful login for ${maskEmail(user.email)}`,
        targetResourceId: (user._id as any).toString(),
        requestInfo: this.extractRequestInfo(request),
        success: true
      });
      
      const duration = Date.now() - startTime;
      log.info('Login successful', {
        operation: 'login_success',
        email: maskEmail(user.email),
        duration,
        ipAddress,
        timestamp: new Date()
      });
      
      return {
        success: true,
        token: jwtToken,
        user: transformUserForAuth({
          _id: (user._id as any).toString(),
          email: user.email,
          userType: user.userType,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status
        }),
        session: transformSessionForAuth({
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
          lastAccessedAt: session.lastAccessedAt,
          securityRisk: this.getSecurityRisk(session.securityContext?.riskScore || 0),
          isNewDevice: session.securityContext?.isNewDevice || false,
          isNewLocation: session.securityContext?.isNewLocation || false,
          sessionAge: 0,
          remainingTime: session.getRemainingTime(),
          isPrimary: session.isPrimary
        }),
        securityFlags: session.securityContext?.securityFlags || [],
        riskScore: session.securityContext?.riskScore || 0
      };
      
    } catch (error) {
      logError('Login failed', error, {
        operation: 'login',
        email: validatedCredentials.email,
        ipAddress,
        timestamp: new Date()
      });
      
      // Re-throw AuthError instances, wrap others
      if (error instanceof AuthError || error instanceof RateLimitError) {
        throw error;
      }
      
      const errorInfo = formatErrorForClient(error);
      throw new AppError(
        errorInfo.message,
        500,
        errorInfo.code
      );
    }
  }
  
  /**
   * Handle logout with session cleanup
   */
  static async logout(sessionId: string, request?: NextRequest): Promise<AuthResult> {
    try {
      log.info('Logout started', {
        operation: 'logout_start',
        sessionId,
        timestamp: new Date()
      });
      
      // Use SessionService to revoke session
      const success = await SessionService.revokeSession(sessionId, 'User logout');
      
      if (!success) {
        throw new NotFoundError('Session not found');
      }
      
      // Log logout (simplified - we don't have session object anymore)
      if (request) {
        await this.logAuthEvent({
          actorId: 'unknown', // We don't have userId from session anymore
          actorType: ActorType.USER,
          action: AuditAction.LOGOUT,
          description: `User logged out`,
          targetResourceId: 'unknown',
          requestInfo: this.extractRequestInfo(request),
          success: true
        });
      }
      
      log.info('Logout successful', {
        operation: 'logout_success',
        sessionId,
        timestamp: new Date()
      });
      return { success: true };
      
    } catch (error) {
      logError('Logout failed', error, {
        operation: 'logout',
        sessionId,
        timestamp: new Date()
      });
      
      // Re-throw AuthError instances, wrap others
      if (error instanceof AuthError || error instanceof NotFoundError) {
        throw error;
      }
      
      const errorInfo = formatErrorForClient(error);
      throw new AppError(
        errorInfo.message,
        500,
        errorInfo.code
      );
    }
  }
  
  // ===== AUTHORIZATION METHODS =====
  
  /**
   * Require authentication for API routes (main method)
   */
  static async requireAuth(
    request: NextRequest, 
    options: AuthOptions = {}
  ): Promise<AuthContext> {
    // Validate input
    const validatedOptions = authOptionsSchema.parse(options);
    try {
      log.debug('Authentication validation started', {
        operation: 'auth_validation_start',
        timestamp: new Date()
      });
      
      // Get token from cookies
      const token = await getTokenFromCookies();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Verify JWT token
      const payload = await verifyToken(token);
      if (!payload) {
        throw new Error('Invalid token');
      }
      
      // Validate session if required
      if (validatedOptions.requireSession !== false && payload.sessionId) {
        const validation = await SessionService.validateSession(payload.sessionId, extractIpAddress(request));
        if (!validation.valid) {
          throw new Error(validation.error || 'Session validation failed');
        }
        
        // Get user
        const user = await DatabaseService.findById(User, validation.session!.userId.toString());
        if (!user) {
          throw new Error('User not found');
        }
        
        // Check role requirements
        if (validatedOptions.roles && !validatedOptions.roles.includes(payload.userType)) {
          throw new Error(`Access denied. Required roles: ${validatedOptions.roles.join(', ')}`);
        }
        
        // Check active status
        if (validatedOptions.requireActiveStatus !== false && user.status !== 'approved') {
          throw new Error('Account not active');
        }
        
        return {
          user: transformUserForAuth({
            _id: (user._id as any).toString(),
            email: user.email,
            userType: user.userType,
            firstName: user.firstName,
            lastName: user.lastName,
            status: user.status
          }),
          session: validation.session!,
          isValid: true,
          securityRisk: this.assessRiskLevel(validation.securityRisk || 'low')
        };
      }
      
      // No session validation needed
      const user = await DatabaseService.findById(User, payload.userId);
      if (user) {
        // Remove sensitive fields using omitFields
        const safeUser = omitFields(user.toObject(), ['password', 'loginHistory', 'failedAttempts']);
        Object.assign(user, safeUser);
      }
      if (!user) {
        throw new Error('User not found');
      }
      
      return {
        user: transformUserForAuth({
          _id: (user._id as any).toString(),
          email: user.email,
          userType: user.userType,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status
        }),
        session: {} as AuthSession, // Empty session
        isValid: true,
        securityRisk: RiskLevel.LOW
      };
      
    } catch (error) {
      logError('Authentication validation failed', error, {
        operation: 'auth_validation_failed',
        timestamp: new Date()
      });
      throw error;
    }
  }
  
  /**
   * Require specific roles
   */
  static async requireRoles(
    request: NextRequest, 
    roles: UserRole[]
  ): Promise<AuthContext> {
    return this.requireAuth(request, { roles });
  }
  
  // ===== SESSION MANAGEMENT =====
  
  /**
   * Create a new session with security checks
   */
  static async createSession(
    userId: string,
    deviceInfo: DeviceInfo,
    ipAddress: string,
    request?: NextRequest
  ): Promise<LoginResult> {
    // Validate input
    const validatedDeviceInfo = deviceInfoSchema.parse(deviceInfo);
    try {
      log.info('Session creation started', {
        operation: 'session_creation_start',
        userId,
        timestamp: new Date()
      });
      
      // Check concurrent session limits
      const existingSessions = await DatabaseService.findMany(Session, { 
        userId, 
        isActive: true, 
        revoked: false 
      });
      
      if (existingSessions.length >= AUTH_CONFIG.maxSessionsPerUser) {
        throw new AppError(`Maximum ${AUTH_CONFIG.maxSessionsPerUser} concurrent sessions allowed`, 429, 'TOO_MANY_SESSIONS');
      }
      
      // Generate device fingerprint
      const fingerprint = generateDeviceFingerprint(
        validatedDeviceInfo.userAgent,
        ipAddress,
        validatedDeviceInfo.screenResolution
      );
      
      // Check for new device/location
      const isNewDevice = !existingSessions.some(s => 
        s.securityContext.fingerprint === fingerprint
      );
      const isNewLocation = !existingSessions.some(s => s.ipAddress === ipAddress);
      
      // Check for suspicious activity
      const suspiciousCheck = await checkSuspiciousActivity(userId, ipAddress, validatedDeviceInfo.userAgent, failedAttempts);
      
      // Calculate risk score
      const riskScore = this.calculateRiskScore(
        isNewDevice,
        isNewLocation,
        suspiciousCheck.flags,
        existingSessions
      );
      
      // Create session object (in memory only - not saved yet)
      const sessionId = uuidv4();
      const refreshToken = uuidv4();
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
      
      const session = new Session({
        sessionId,
        userId,
        deviceInfo: validatedDeviceInfo,
        ipAddress,
        expiresAt: new Date(Date.now() + AUTH_CONFIG.sessionTimeoutMinutes * 60 * 1000),
        securityContext: {
          fingerprint,
          riskScore,
          isNewDevice,
          isNewLocation,
          suspiciousActivity: suspiciousCheck.suspicious,
          lastSecurityCheck: new Date(),
          securityFlags: suspiciousCheck.flags
        },
        refreshToken: hashedRefreshToken,
        sessionType: 'web',
        concurrentSessions: existingSessions.length + 1,
        isPrimary: existingSessions.length === 0,
        isActive: true,
        revoked: false
      });
      
      // Validate user exists BEFORE saving session
      const user = await DatabaseService.findById(User, userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Create JWT token BEFORE saving session
      const jwtToken = await signToken({
        userId: (user._id as any).toString(),
        email: user.email,
        userType: user.userType,
        sessionId: sessionId
      });
      
      // ONLY NOW save session after all validations passed
      await retry(
        async () => await session.save(),
        { maxAttempts: 3, baseDelay: 100 }
      );
      
      log.info('Session created successfully', {
        operation: 'session_creation_success',
        userId,
        sessionId,
        email: maskEmail(user.email),
        timestamp: new Date()
      });
      
      return {
        success: true,
        token: jwtToken,
        user: transformUserForAuth({
          _id: (user._id as any).toString(),
          email: user.email,
          userType: user.userType,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status
        }),
        session: transformSessionForAuth({
          sessionId,
          expiresAt: session.expiresAt,
          lastAccessedAt: session.lastAccessedAt,
          securityRisk: this.getSecurityRisk(riskScore),
          isNewDevice,
          isNewLocation,
          sessionAge: 0,
          remainingTime: session.getRemainingTime(),
          isPrimary: session.isPrimary
        }),
        securityFlags: suspiciousCheck.flags,
        riskScore
      };
      
    } catch (error) {
      logError('Session creation failed', error, {
        operation: 'createSession',
        userId,
        ipAddress,
        timestamp: new Date()
      });
      
      // Re-throw AuthError instances, wrap others
      if (error instanceof AuthError) {
        throw error;
      }
      
      const errorInfo = formatErrorForClient(error);
      throw new AppError(
        errorInfo.message,
        500,
        errorInfo.code
      );
    }
  }
  
  /**
   * Validate session with security checks
   */
  static async validateSession(
    sessionId: string, 
    ipAddress?: string
  ): Promise<SessionValidation> {
    // Validate input
    const validatedInput = sessionValidationSchema.parse({ sessionId, ipAddress });
    try {
      log.debug('Session validation started', {
        operation: 'session_validation_start',
        sessionId,
        timestamp: new Date()
      });
      // DatabaseService handles connection automatically
      
      const session = await timeout(
        DatabaseService.findOne(Session, {
          sessionId,
          isActive: true,
          revoked: false,
          expiresAt: { $gt: new Date() }
        }, { lean: false }), // Don't use lean - we need Mongoose document methods
        { timeout: 5000, errorMessage: 'Session validation timed out' }
      );
      
      if (!session) {
        throw new AppError('Session not found or expired', 401, 'SESSION_EXPIRED');
      }
      
      if (session.isExpired()) {
        throw new AppError('Session expired', 401, 'SESSION_EXPIRED');
      }
      
      if (session.isRevoked()) {
        throw new AppError('Session revoked', 401, 'SESSION_REVOKED');
      }
      
      // IP binding validation
      if (ipAddress && AUTH_CONFIG.requireIpBinding) {
        if (session.ipAddress !== ipAddress) {
          log.warn('IP address mismatch detected', {
            operation: 'session_validation',
            sessionId,
            expectedIp: session.ipAddress,
            actualIp: ipAddress
          });
          throw new AppError('IP address mismatch', 403, 'IP_MISMATCH');
        }
      }
      
      // Get user
      const user = await DatabaseService.findById(User, session.userId.toString());
      if (user) {
        // Remove sensitive fields using omitFields
        const safeUser = omitFields(user.toObject(), ['password', 'loginHistory', 'failedAttempts']);
        Object.assign(user, safeUser);
      }
      if (!user || user.status !== 'approved') {
        throw new AppError('User not found or inactive', 403, 'ACCOUNT_NOT_APPROVED');
      }
      
      // Update last accessed
      await session.updateLastAccessed();
      
      return {
        success: true,
        user: transformUserForAuth({
          _id: (user._id as any).toString(),
          email: user.email,
          userType: user.userType,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status
        }),
        session: transformSessionForAuth({
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
          lastAccessedAt: session.lastAccessedAt,
          securityRisk: session.getSecurityRisk(),
          isNewDevice: session.securityContext.isNewDevice,
          isNewLocation: session.securityContext.isNewLocation,
          sessionAge: session.getSessionAge(),
          remainingTime: session.getRemainingTime(),
          isPrimary: session.isPrimary
        })
      };
      
    } catch (error) {
      logError('Session validation failed', error, {
        operation: 'validateSession',
        sessionId,
        ipAddress,
        timestamp: new Date()
      });
      
      // Re-throw AuthError instances, wrap others
      if (error instanceof AuthError) {
        throw error;
      }
      
      const errorInfo = formatErrorForClient(error);
      throw new AppError(
        errorInfo.message,
        500,
        errorInfo.code
      );
    }
  }
  
  /**
   * Refresh session token
   */
  static async refreshSession(sessionId: string): Promise<AuthResult> {
    try {
      // Use SessionService for session refresh
      const result = await SessionService.refreshSession(sessionId);
      
      if (!result.success) {
        throw new AppError('Session refresh failed', 401, 'SESSION_REFRESH_FAILED');
      }
      
      return {
        success: true,
        session: transformSessionForAuth({
          sessionId: result.session.sessionId,
          expiresAt: result.session.expiresAt,
          lastAccessedAt: result.session.lastAccessedAt,
          securityRisk: this.getSecurityRisk(result.session.securityContext?.riskScore || 0),
          isNewDevice: result.session.securityContext?.isNewDevice || false,
          isNewLocation: result.session.securityContext?.isNewLocation || false,
          sessionAge: result.session.getSessionAge(),
          remainingTime: result.session.getRemainingTime(),
          isPrimary: result.session.isPrimary
      }),
        token: result.newToken // Include the new JWT token
      };
      
    } catch (error) {
      logError('Session refresh failed', error, {
        operation: 'refreshSession',
        sessionId,
        timestamp: new Date()
      });
      
      // Re-throw AuthError instances, wrap others
      if (error instanceof AuthError) {
        throw error;
      }
      
      const errorInfo = formatErrorForClient(error);
      throw new AppError(
        errorInfo.message,
        500,
        errorInfo.code
      );
    }
  }
  
  /**
   * Revoke a specific session
   */
  static async revokeSession(sessionId: string, reason?: string): Promise<boolean> {
    try {
      // Use SessionService for session revocation
      return await SessionService.revokeSession(sessionId, reason);
      
    } catch (error) {
      logError('Session revocation failed', error, {
        operation: 'revokeSession',
        sessionId
      });
      return false;
    }
  }
  
  /**
   * Revoke all sessions for a user
   */
  static async revokeAllUserSessions(userId: string): Promise<boolean> {
    try {
      // DatabaseService handles connection automatically
      
      await DatabaseService.updateMany(Session, 
        { userId, isActive: true },
        { 
          revoked: true, 
          revokedAt: new Date(),
          revokedReason: 'User logout or admin action'
        }
      );
      return true;
      
    } catch (error) {
      logError('Revoke all sessions failed', error, {
        operation: 'revokeAllUserSessions',
        userId
      });
      return false;
    }
  }
  
  // ===== SECURITY METHODS =====
  
  /**
   * Check rate limiting
   */
  static async checkRateLimit(
    identifier: string, 
    type: 'login' | 'api' = 'login'
  ): Promise<RateLimitResult> {
    const key = `${type}:${identifier}`;
    const now = Date.now();
    
    // Clean expired entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }
    
    const current = rateLimitStore.get(key);
    
    if (!current) {
      rateLimitStore.set(key, { 
        count: 1, 
        resetTime: now + AUTH_CONFIG.loginWindowMs 
      });
      return { allowed: true, remaining: AUTH_CONFIG.maxLoginAttempts - 1 };
    }
    
    if (now > current.resetTime) {
      rateLimitStore.set(key, { 
        count: 1, 
        resetTime: now + AUTH_CONFIG.loginWindowMs 
      });
      return { allowed: true, remaining: AUTH_CONFIG.maxLoginAttempts - 1 };
    }
    
    if (current.count >= AUTH_CONFIG.maxLoginAttempts) {
      return {
        allowed: false,
        reason: 'Too many attempts',
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      };
    }
    
    current.count++;
    return { 
      allowed: true, 
      remaining: AUTH_CONFIG.maxLoginAttempts - current.count 
    };
  }
  
  /**
   * Record failed attempt
   */
  static async recordFailedAttempt(identifier: string, ipAddress: string): Promise<void> {
    const key = `failed:${identifier}:${ipAddress}`;
    const now = Date.now();
    
    const current = failedAttempts.get(key) || { count: 0, lastAttempt: 0 };
    current.count++;
    current.lastAttempt = now;
    
    failedAttempts.set(key, current);
    
    log.warn('Failed authentication attempt', {
      operation: 'record_failed_attempt',
      identifier,
      ipAddress,
      attemptCount: current.count
    });
  }
  
  // ===== UTILITY METHODS =====
  
  /**
   * Extract IP address from request
   */
  
  /**
   * Extract request information
   */
  static extractRequestInfo(request: NextRequest): RequestInfo {
    const rawUserAgent = request.headers.get('user-agent') || 'Unknown';
    const sanitizedUserAgent = sanitizeString(rawUserAgent);
    
    return {
      ipAddress: extractIpAddress(request),
      userAgent: truncate(sanitizedUserAgent, { maxLength: 200, preserveWords: false }),
      method: request.method,
      endpoint: new URL(request.url).pathname,
      requestId: request.headers.get('x-request-id') || undefined,
      sessionId: request.headers.get('x-session-id') || undefined,
      deviceFingerprint: request.headers.get('x-device-fingerprint') || undefined
    };
  }
  
  /**
   * Log authentication events
   */
  static async logAuthEvent(context: AuditAuthContext): Promise<void> {
    try {
      await AuditService.logAuthAction(context);
    } catch (error) {
      logError('Failed to log auth event', error, {
        operation: 'logAuthEvent'
      });
    }
  }

  /**
   * Log session events
   */
  static async logSessionEvent(
    action: string,
    userId: string,
    sessionId: string,
    request?: NextRequest,
    metadata?: any
  ): Promise<void> {
    try {
      // Map string action to AuditAction enum
      const auditAction = action === 'created' ? AuditAction.SESSION_CREATED :
                         action === 'revoked' ? AuditAction.SESSION_REVOKED :
                         AuditAction.SESSION_CREATED; // default fallback for refreshed

      const context: AuditAuthContext = {
        actorId: userId,
        actorType: ActorType.USER,
        action: auditAction,
        description: `Session ${action}: ${sessionId}`,
        targetResourceId: sessionId,
        targetResourceType: TargetResourceType.SESSION,
        requestInfo: request ? this.extractRequestInfo(request) : undefined,
        metadata,
        success: true
      };
      
      await this.logAuthEvent(context);
    } catch (error) {
      logError('Failed to log session event', error, {
        operation: 'logSessionEvent',
        action,
        userId,
        sessionId
      });
    }
  }

  /**
   * Log security events
   */
  static async logSecurityEvent(
    event: string,
    userId: string,
    details: any,
    request?: NextRequest
  ): Promise<void> {
    try {
      const context: AuditAuthContext = {
        actorId: userId,
        actorType: ActorType.SYSTEM,
        action: AuditAction.SUSPICIOUS_ACTIVITY,
        description: `Security event: ${event}`,
        targetResourceId: userId,
        targetResourceType: TargetResourceType.USER,
        requestInfo: request ? this.extractRequestInfo(request) : undefined,
        metadata: details,
        success: false,
        riskLevel: RiskLevel.HIGH,
        isSensitive: true,
        requiresReview: true
      };
      
      await this.logAuthEvent(context);
    } catch (error) {
      logError('Failed to log security event', error, {
        operation: 'logSecurityEvent',
        event,
        userId
      });
    }
  }
  
  /**
   * Calculate risk score
   */
  private static calculateRiskScore(
    isNewDevice: boolean,
    isNewLocation: boolean,
    suspiciousFlags: string[],
    existingSessions: any[]
  ): number {
    let riskScore = 10; // Base risk
    
    if (isNewDevice) riskScore += 20;
    if (isNewLocation) riskScore += 15;
    riskScore += suspiciousFlags.length * 10;
    
    if (existingSessions.length > 2) riskScore += 10;
    
    return Math.min(riskScore, 100);
  }
  
  /**
   * Get security risk level
   */
  private static getSecurityRisk(riskScore: number): 'low' | 'medium' | 'high' {
    if (riskScore >= AUTH_CONFIG.highRiskThreshold) return 'high';
    if (riskScore >= AUTH_CONFIG.mediumRiskThreshold) return 'medium';
    return 'low';
  }
  
  /**
   * Assess risk level
   */
  private static assessRiskLevel(securityRisk: string): RiskLevel {
    switch (securityRisk) {
      case 'high': return RiskLevel.HIGH;
      case 'medium': return RiskLevel.MEDIUM;
      default: return RiskLevel.LOW;
    }
  }

  // ===== SESSION PERFORMANCE METHODS =====

  /**
   * Get comprehensive session statistics
   */
  static async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    highRiskSessions: number;
    averageSessionAge: number;
    sessionDistribution: Record<string, number>;
    performanceMetrics: {
      averageResponseTime: number;
      cacheHitRate: number;
      errorRate: number;
    };
  }> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get session counts
      const [totalSessions, activeSessions, expiredSessions, highRiskSessions] = await Promise.all([
        DatabaseService.count(Session, {}),
        DatabaseService.count(Session, { 
          expiresAt: { $gt: now },
          revokedAt: { $exists: false }
        }),
        DatabaseService.count(Session, { 
          expiresAt: { $lte: now }
        }),
        DatabaseService.count(Session, { 
          riskLevel: { $gte: AUTH_CONFIG.highRiskThreshold },
          expiresAt: { $gt: now }
        })
      ]);

      // Calculate average session age
      const sessions = await DatabaseService.findMany(Session, { 
        expiresAt: { $gt: now } 
      }, {
        select: 'createdAt'
      });
      
      const averageSessionAge = sessions.length > 0 
        ? sessions.reduce((sum, session) => {
            const age = now.getTime() - session.createdAt.getTime();
            return sum + (age / (1000 * 60 * 60)); // Convert to hours
          }, 0) / sessions.length
        : 0;

      // Session distribution by user type
      const sessionDistribution = await DatabaseService.aggregate(Session, [
        { $match: { expiresAt: { $gt: now } } },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $group: { _id: '$user.userType', count: { $sum: 1 } } }
      ]);

      const distribution: Record<string, number> = {};
      sessionDistribution.forEach(item => {
        distribution[item._id] = item.count;
      });

      return {
        totalSessions,
        activeSessions,
        expiredSessions,
        highRiskSessions,
        averageSessionAge: Math.round(averageSessionAge * 100) / 100,
        sessionDistribution: distribution,
        performanceMetrics: {
          averageResponseTime: 45, // Mock - would be calculated from actual metrics
          cacheHitRate: 0.85, // Mock - would be calculated from cache stats
          errorRate: 0.02 // Mock - would be calculated from error logs
        }
      };
    } catch (error) {
      logError('Error getting session stats', error, {
        operation: 'getSessionStats'
      });
      throw new Error('Failed to retrieve session statistics');
    }
  }

  /**
   * Get performance analytics for session operations
   */
  static async getPerformanceAnalytics(): Promise<{
    averageQueryTime: number;
    cacheHitRate: number;
    totalQueries: number;
    slowQueries: number;
    cacheSize: number;
    memoryUsage: number;
    queryDistribution: Record<string, number>;
  }> {
    try {
      // This would integrate with actual performance monitoring
      // For now, return realistic mock data based on typical patterns
      return {
        averageQueryTime: 12.5, // milliseconds
        cacheHitRate: 0.87,
        totalQueries: 15420,
        slowQueries: 23,
        cacheSize: 256, // MB
        memoryUsage: 0.68, // percentage
        queryDistribution: {
          'session_validation': 0.45,
          'session_creation': 0.20,
          'session_refresh': 0.15,
          'session_cleanup': 0.10,
          'user_lookup': 0.10
        }
      };
    } catch (error) {
      logError('Error getting performance analytics', error, {
        operation: 'getPerformanceAnalytics'
      });
      throw new Error('Failed to retrieve performance analytics');
    }
  }

  /**
   * Get all sessions for a user
   */
  static async getUserSessions(userId: string): Promise<any[]> {
    try {
      // Use SessionService for getting user sessions
      const sessions = await SessionService.getUserSessions(userId);
      
      return sessions.map(session => {
        const sessionData = {
          sessionId: session.sessionId,
          deviceInfo: session.deviceInfo,
          locationInfo: session.location,
          createdAt: session.createdAt,
          lastAccessedAt: session.lastAccessedAt,
          expiresAt: session.expiresAt,
          riskLevel: session.getSecurityRisk(),
          isActive: session.expiresAt > new Date() && !session.revokedAt
        };
        
        // Use pickFields to ensure only necessary data is returned
        const safeSessionData = pickFields(sessionData, [
          'sessionId', 'deviceInfo', 'locationInfo', 'createdAt', 
          'lastAccessedAt', 'expiresAt', 'riskLevel', 'isActive'
        ]);
        
        // Additional data filtering for security
        return pickFields(safeSessionData, [
          'sessionId', 'deviceInfo', 'createdAt', 'lastAccessedAt', 
          'expiresAt', 'riskLevel', 'isActive'
        ]);
      });
    } catch (error) {
      logError('Error getting user sessions', error, {
        operation: 'getUserSessions',
        userId
      });
      throw new Error('Failed to retrieve user sessions');
    }
  }

  /**
   * Clean up expired sessions and return performance metrics
   */
  static async cleanupExpiredSessions(): Promise<{
    cleaned: number;
    performance: number; // milliseconds
  }> {
    const startTime = Date.now();
    
    try {
      const now = new Date();
      
      // Find expired sessions
      const expiredSessions = await DatabaseService.findMany(Session, {
        expiresAt: { $lte: now }
      });

      const cleaned = expiredSessions.length;

      if (cleaned > 0) {
        // Delete expired sessions in batches
        await batchProcess(
          expiredSessions,
          async (session, index) => {
            await DatabaseService.deleteOne(Session, { _id: session._id });
            return session._id;
          },
          { batchSize: 50 }
        );

        // Log cleanup event
        await this.logAuthEvent({
          actorId: 'system',
          actorType: ActorType.SYSTEM,
          action: AuditAction.SESSION_REVOKED,
          description: `Cleaned up ${cleaned} expired sessions`,
          targetResourceId: 'sessions',
          targetResourceType: TargetResourceType.SESSION,
          metadata: { 
            cleanedSessions: cleaned,
            cleanupDuration: Date.now() - startTime
          },
          success: true,
          riskLevel: RiskLevel.LOW,
          isSensitive: false,
          requiresReview: false
        });
      }

      const performance = Date.now() - startTime;

      return {
        cleaned,
        performance
      };
    } catch (error) {
      logError('Error during session cleanup', error, {
        operation: 'cleanupExpiredSessions'
      });
      throw new Error('Failed to clean up expired sessions');
    }
  }
}
