/**
 * Authentication Service
 * 
 * Main authentication service with dual-token system integration.
 * Handles login, signup, logout, and session management.
 */

import { Request } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { 
  AuthContext, 
  AuthOptions, 
  LoginCredentials, 
  LoginResponse,
  SignupRequest,
  SignupResponse,
  LogoutResponse,
  TokenPair,
  TokenContext,
  DeviceInfo,
  RiskAssessment
} from '../../../types/auth';
import { TokenService } from './TokenService';
import { AUTH_CONFIG } from './config';
import { 
  parseUserAgent, 
  generateDeviceFingerprint,
  assessSecurityRisk,
  checkSuspiciousActivity,
  extractIpAddress,
  isNewDevice,
  isNewLocation
} from '../utils';
import { 
  checkLoginRateLimit,
  checkSignupRateLimit,
  failedAttemptsTracker
} from '../utils/rate-limit';
import { log } from '../../logging';
import Session from '../../../models/Session';

// Import User model (assuming it exists)
import User from '../../../models/User';

/**
 * Authentication Service Class
 */
export class AuthService {
  
  // ===== AUTHENTICATION METHODS =====
  
  /**
   * Handle complete login flow with dual-token system
   */
  static async login(
    credentials: LoginCredentials,
    request: Request
  ): Promise<LoginResponse> {
    const startTime = Date.now();
    const ipAddress = extractIpAddress(request);
    const userAgent = request.get('User-Agent') || 'Unknown';
    
    try {
      log.info('Login process started', {
        operation: 'login_start',
        email: credentials.email,
        ipAddress,
        timestamp: new Date()
      });
      
      // Check rate limiting
      const rateLimit = checkLoginRateLimit(credentials.email, ipAddress);
      if (!rateLimit.allowed) {
        log.warn('Login rate limit exceeded', {
          email: credentials.email,
          ipAddress,
          reason: rateLimit.reason
        });
        
        throw new Error(`Rate limit exceeded: ${rateLimit.reason}`);
      }
      
      // Check if account is locked
      if (failedAttemptsTracker.isLocked(credentials.email)) {
        const timeUntilUnlock = failedAttemptsTracker.getTimeUntilUnlock(credentials.email);
        log.warn('Login attempt on locked account', {
          email: credentials.email,
          ipAddress,
          timeUntilUnlock
        });
        
        throw new Error(`Account temporarily locked. Try again in ${Math.ceil(timeUntilUnlock / 60000)} minutes.`);
      }
      
      // Find user in database
      const user = await User.findOne({ 
        email: credentials.email.toLowerCase() 
      });
      
      if (!user) {
        await this.recordFailedAttempt(credentials.email, ipAddress);
        throw new Error('Invalid credentials');
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
      if (!isPasswordValid) {
        await this.recordFailedAttempt(credentials.email, ipAddress);
        
        // Log failed login
        await this.logAuthEvent({
          userId: user._id,
          action: 'LOGIN_FAILED',
          description: `Failed login attempt for ${user.email}`,
          ipAddress,
          userAgent,
          success: false,
          errorMessage: 'Invalid password'
        });
        
        throw new Error('Invalid credentials');
      }
      
      // Check user status
      if (user.status !== 'approved') {
        let message = 'Account not approved';
        if (user.status === 'suspended') message = 'Account suspended';
        else if (user.status === 'rejected') message = 'Account rejected';
        else if (user.status === 'pending') message = 'Account pending approval';
        
        throw new Error(message);
      }
      
      // Parse device info
      const deviceInfo = parseUserAgent(userAgent);
      const deviceFingerprint = generateDeviceFingerprint(userAgent, ipAddress);
      
      // Check for suspicious activity
      const suspiciousCheck = await checkSuspiciousActivity(
        user._id,
        ipAddress,
        userAgent
      );
      
      // Check if device/location is new
      const isNewDeviceFlag = await isNewDevice(user._id, deviceFingerprint);
      const isNewLocationFlag = await isNewLocation(user._id, ipAddress);
      
      // Assess security risk
      const riskAssessment = assessSecurityRisk(
        isNewDeviceFlag,
        isNewLocationFlag,
        suspiciousCheck.flags,
        user.userType
      );
      
      // Create session
      const session = await this.createSession(
        user._id,
        deviceInfo,
        ipAddress,
        deviceFingerprint,
        riskAssessment
      );
      
      // Generate token pair
      const tokenContext: TokenContext = {
        userId: user._id,
        sessionId: session.sessionId,
        ipAddress,
        userAgent,
        deviceFingerprint,
        operation: 'generate',
        timestamp: new Date(),
        metadata: {
          endpoint: '/api/auth/login',
          method: request.method
        }
      };
      
      const tokenPair = await TokenService.generateTokenPair(
        user._id,
        user.email,
        user.userType,
        session.sessionId,
        tokenContext
      );
      
      // Update session with token IDs
      await session.updateTokenIds(
        tokenPair.accessToken.split('.')[1], // Token ID (simplified)
        tokenPair.refreshToken.split('.')[1]  // Token ID (simplified)
      );
      
      // Record successful login
      failedAttemptsTracker.reset(credentials.email);
      
      // Log successful login
      await this.logAuthEvent({
        userId: user._id,
        action: 'LOGIN_SUCCESS',
        description: `Successful login for ${user.email}`,
        ipAddress,
        userAgent,
        success: true,
        riskLevel: riskAssessment.riskLevel
      });
      
      const duration = Date.now() - startTime;
      log.info('Login successful', {
        operation: 'login_success',
        email: user.email,
        duration,
        ipAddress,
        riskScore: riskAssessment.riskScore
      });
      
      return {
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          userType: user.userType,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status
        },
        session: {
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
          lastAccessedAt: session.lastAccessedAt,
          securityRisk: riskAssessment.riskLevel,
          isNewDevice: isNewDeviceFlag,
          isNewLocation: isNewLocationFlag,
          sessionAge: 0,
          remainingTime: session.getRemainingTime(),
          isPrimary: session.isPrimary
        },
        tokens: tokenPair,
        securityFlags: suspiciousCheck.flags,
        riskScore: riskAssessment.riskScore
      };
      
    } catch (error) {
      log.error('Login failed', {
        operation: 'login_error',
        email: credentials.email,
        ipAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      
      throw error;
    }
  }
  
  /**
   * Handle complete signup flow
   */
  static async signup(
    userData: SignupRequest,
    request: Request
  ): Promise<SignupResponse> {
    const ipAddress = extractIpAddress(request);
    const userAgent = request.get('User-Agent') || 'Unknown';
    
    try {
      log.info('Signup process started', {
        operation: 'signup_start',
        email: userData.email,
        ipAddress,
        timestamp: new Date()
      });
      
      // Check rate limiting
      const rateLimit = checkSignupRateLimit(userData.email, ipAddress);
      if (!rateLimit.allowed) {
        throw new Error(`Rate limit exceeded: ${rateLimit.reason}`);
      }
      
      // Check for existing user
      const existing = await User.findOne({ 
        $or: [{ email: userData.email }, { phone: userData.phone }]
      });
      
      if (existing) {
        throw new Error('User already exists');
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Create user
      const user = await User.create({
        ...userData,
        password: hashedPassword,
        email: userData.email.toLowerCase(),
        status: 'pending'
      });
      
      // Log signup event
      await this.logAuthEvent({
        userId: user._id,
        action: 'SIGNUP',
        description: `User signup for ${user.email}`,
        ipAddress,
        userAgent,
        success: true
      });
      
      log.info('Signup successful', {
        operation: 'signup_success',
        email: user.email,
        ipAddress
      });
      
      return {
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          userType: user.userType,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status
        },
        message: 'Account created successfully. Please wait for approval.'
      };
      
    } catch (error) {
      log.error('Signup failed', {
        operation: 'signup_error',
        email: userData.email,
        ipAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      
      throw error;
    }
  }
  
  /**
   * Handle logout with token revocation
   */
  static async logout(sessionId: string, request: Request): Promise<LogoutResponse> {
    try {
      log.info('Logout started', {
        operation: 'logout_start',
        sessionId,
        timestamp: new Date()
      });
      
      // Find session
      const session = await Session.findOne({ sessionId, isActive: true, revoked: false });
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Revoke session
      await (session as any).revokeSession();
      
      // Revoke all user refresh tokens
      const revokedCount = await TokenService.revokeAllUserRefreshTokens(session.userId.toString());
      
      // Log logout event
      const ipAddress = extractIpAddress(request);
      const userAgent = request.get('User-Agent') || 'Unknown';
      
      await this.logAuthEvent({
        userId: session.userId.toString(),
        action: 'LOGOUT',
        description: 'User logged out',
        ipAddress,
        userAgent,
        success: true
      });
      
      log.info('Logout successful', {
        operation: 'logout_success',
        sessionId,
        userId: session.userId,
        revokedTokens: revokedCount
      });
      
      return {
        success: true,
        message: 'Logged out successfully'
      };
      
    } catch (error) {
      log.error('Logout failed', {
        operation: 'logout_error',
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      
      throw error;
    }
  }
  
  // ===== AUTHORIZATION METHODS =====
  
  /**
   * Require authentication for protected routes
   */
  static async requireAuth(
    request: Request,
    options: AuthOptions = {}
  ): Promise<AuthContext> {
    try {
      // Extract access token
      const authHeader = request.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Access token required');
      }
      
      const accessToken = authHeader.substring(7);
      
      // Verify access token
      const validationResult = await TokenService.verifyAccessToken(accessToken);
      if (!validationResult.isValid || !validationResult.payload) {
        throw new Error('Invalid access token');
      }
      
      const payload = validationResult.payload;
      
      // Find session
      const session = await Session.findOne({ sessionId: payload.sessionId, isActive: true, revoked: false });
      if (!session || !(session as any).isValid()) {
        throw new Error('Session invalid or expired');
      }
      
      // Check user status if required
      if (options.requireActiveStatus) {
        // TODO: Check user status from database
        // const user = await DatabaseService.findOne(User, { _id: payload.userId });
        // if (!user || user.status !== 'approved') {
        //   throw new Error('Account not active');
        // }
      }
      
      // Check roles if specified
      if (options.roles && !options.roles.includes(payload.userType)) {
        throw new Error('Insufficient permissions');
      }
      
      // Update session last accessed
      await (session as any).updateLastAccessed();
      
      // Get security risk level
      const securityRisk = (session as any).getSecurityRisk();
      
      return {
        user: {
          _id: payload.userId,
          email: payload.email,
          userType: payload.userType,
          firstName: '', // TODO: Get from user record
          lastName: '',   // TODO: Get from user record
          status: 'approved' // TODO: Get from user record
        },
        session: {
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
          lastAccessedAt: session.lastAccessedAt,
          securityRisk,
          isNewDevice: session.securityContext.isNewDevice,
          isNewLocation: session.securityContext.isNewLocation,
        sessionAge: (session as any).getSessionAge(),
        remainingTime: (session as any).getRemainingTime(),
          isPrimary: session.isPrimary
        },
        isValid: true,
        securityRisk
      };
      
    } catch (error) {
      log.warn('Authentication failed', {
        operation: 'require_auth',
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: extractIpAddress(request),
        userAgent: request.get('User-Agent') || 'unknown'
      });
      
      throw error;
    }
  }
  
  // ===== SESSION MANAGEMENT =====
  
  /**
   * Create new session
   */
  private static async createSession(
    userId: string,
    deviceInfo: DeviceInfo,
    ipAddress: string,
    deviceFingerprint: string,
    riskAssessment: RiskAssessment
  ): Promise<any> {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + (AUTH_CONFIG.sessionTimeoutMinutes * 60 * 1000));
    
    const sessionData = {
      sessionId,
      userId,
      deviceInfo,
      ipAddress,
      expiresAt,
      isActive: true,
      revoked: false,
      securityContext: {
        fingerprint: deviceFingerprint,
        riskScore: riskAssessment.riskScore,
        isNewDevice: riskAssessment.flags.includes('new_device'),
        isNewLocation: riskAssessment.flags.includes('new_location'),
        suspiciousActivity: riskAssessment.riskLevel === 'high',
        lastSecurityCheck: new Date(),
        securityFlags: riskAssessment.flags
      },
      sessionType: 'web' as const,
      concurrentSessions: 1,
      isPrimary: true
    };
    
    // Create session in database
    const session = await Session.create(sessionData);
    
    log.info('Session created', {
      sessionId,
      userId,
      ipAddress,
      riskScore: riskAssessment.riskScore
    });
    
    return session;
  }
  
  // ===== HELPER METHODS =====
  
  /**
   * Record failed login attempt
   */
  private static async recordFailedAttempt(email: string, ipAddress: string): Promise<void> {
    failedAttemptsTracker.record(email);
    
    log.warn('Failed login attempt recorded', {
      email,
      ipAddress,
      attempts: failedAttemptsTracker.getCount(email)
    });
  }
  
  /**
   * Log authentication event
   */
  private static async logAuthEvent(event: {
    userId: string;
    action: string;
    description: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    errorMessage?: string;
    riskLevel?: 'low' | 'medium' | 'high';
  }): Promise<void> {
    try {
      // TODO: Integrate with audit logging system
      log.info('Auth event logged', {
        operation: 'auth_event',
        userId: event.userId,
        action: event.action,
        description: event.description,
        ipAddress: event.ipAddress,
        success: event.success,
        riskLevel: event.riskLevel,
        timestamp: new Date()
      });
    } catch (error) {
      log.error('Failed to log auth event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        event
      });
    }
  }
  
  /**
   * Refresh access token
   */
  static async refreshAccessToken(
    refreshToken: string,
    request: Request
  ): Promise<TokenPair> {
    const ipAddress = extractIpAddress(request);
    const userAgent = request.get('User-Agent') || 'Unknown';
    
    const context: TokenContext = {
      userId: '', // Will be populated by TokenService
      sessionId: '', // Will be populated by TokenService
      ipAddress,
      userAgent,
      deviceFingerprint: request.get('X-Device-Fingerprint') || 'unknown',
      operation: 'refresh',
      timestamp: new Date(),
      metadata: {
        endpoint: '/api/auth/refresh',
        method: request.method
      }
    };
    
    const tokenPair = await TokenService.verifyAndRotateRefreshToken(refreshToken, context);
    
    if (!tokenPair) {
      throw new Error('Invalid or expired refresh token');
    }
    
    log.info('Access token refreshed', {
      operation: 'token_refresh',
      ipAddress,
      userAgent
    });
    
    return tokenPair;
  }
  
  /**
   * Get authentication statistics
   */
  static async getAuthStats(): Promise<{
    activeSessions: number;
    totalLogins: number;
    failedLogins: number;
    rateLimitStats: any;
  }> {
    try {
      // Get basic session counts
      const totalSessions = await Session.countDocuments();
      const activeSessions = await Session.countDocuments({ isActive: true, revoked: false });
      
      const rateLimitStats = {
        rateLimit: { total: 0, active: 0 },
        failedAttempts: { total: 0 }
      };
      
      return {
        activeSessions,
        totalLogins: totalSessions,
        failedLogins: 0, // TODO: Implement failed login tracking
        rateLimitStats
      };
    } catch (error) {
      log.error('Failed to get auth stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        activeSessions: 0,
        totalLogins: 0,
        failedLogins: 0,
        rateLimitStats: { rateLimit: { total: 0, active: 0 }, failedAttempts: { total: 0 } }
      };
    }
  }
}
