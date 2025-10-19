/**
 * Unified Session Validator
 * Handles all session validation scenarios with dependency injection
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import Session from '@/models/Session';
import User from '@/models/User';
import { verifyToken, getTokenFromCookies } from './jwt';
import type { 
  UnifiedSessionData, 
  UnifiedSessionUser, 
  UnifiedValidationResult,
  UnifiedSessionInfo,
  UnifiedDeviceInfo,
  UnifiedSecurityContext
} from '@/types/unified-session';

// Validation context types
export interface ValidationContext {
  type: 'middleware' | 'api' | 'frontend' | 'admin';
  requireSession?: boolean;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  allowExpired?: boolean;
}

// Use unified validation result
export type ValidationResult = UnifiedValidationResult;

// Session validation options
export interface SessionValidationOptions {
  context: ValidationContext;
  request?: NextRequest;
  token?: string;
  sessionId?: string;
  userId?: string;
}

/**
 * Unified Session Validator Class
 * Handles all session validation scenarios with dependency injection
 */
export class SessionValidator {
  private static instance: SessionValidator;
  
  private constructor() {}
  
  public static getInstance(): SessionValidator {
    if (!SessionValidator.instance) {
      SessionValidator.instance = new SessionValidator();
    }
    return SessionValidator.instance;
  }

  /**
   * Convert database session to unified format
   */
  private convertToUnifiedSession(dbSession: any, dbUser: any): UnifiedSessionData {
    const now = new Date();
    const sessionExpiresAt = new Date(dbSession.expiresAt);
    const sessionCreatedAt = new Date(dbSession.createdAt);
    
    const sessionInfo: UnifiedSessionInfo = {
      sessionId: dbSession.sessionId,
      userId: dbSession.userId.toString(),
      expiresAt: sessionExpiresAt.toISOString(),
      lastAccessedAt: dbSession.lastAccessedAt ? new Date(dbSession.lastAccessedAt).toISOString() : now.toISOString(),
      createdAt: sessionCreatedAt.toISOString(),
      sessionType: dbSession.sessionType || 'web',
      isActive: sessionExpiresAt > now,
      securityRisk: dbSession.getSecurityRisk ? dbSession.getSecurityRisk() : 'low',
      remainingTime: Math.max(0, Math.floor((sessionExpiresAt.getTime() - now.getTime()) / (1000 * 60))),
      sessionAge: Math.floor((now.getTime() - sessionCreatedAt.getTime()) / (1000 * 60))
    };

    const deviceInfo: UnifiedDeviceInfo = {
      userAgent: dbSession.deviceInfo?.userAgent || 'unknown',
      platform: dbSession.deviceInfo?.platform || 'unknown',
      browser: dbSession.deviceInfo?.browser || 'unknown',
      browserVersion: dbSession.deviceInfo?.browserVersion || 'unknown',
      os: dbSession.deviceInfo?.os || 'unknown',
      osVersion: dbSession.deviceInfo?.osVersion || 'unknown',
      deviceType: dbSession.deviceInfo?.deviceType || 'desktop',
      screenResolution: dbSession.deviceInfo?.screenResolution,
      timezone: dbSession.deviceInfo?.timezone || 'UTC',
      language: dbSession.deviceInfo?.language || 'en-US',
      ipAddress: dbSession.ipAddress || 'unknown',
      location: dbSession.location ? {
        country: dbSession.location.country,
        region: dbSession.location.region,
        city: dbSession.location.city,
        coordinates: dbSession.location.coordinates
      } : undefined
    };

    const securityContext: UnifiedSecurityContext = {
      fingerprint: dbSession.securityContext?.fingerprint || 'unknown',
      riskScore: dbSession.securityContext?.riskScore || 0,
      isNewDevice: dbSession.securityContext?.isNewDevice || false,
      isNewLocation: dbSession.securityContext?.isNewLocation || false,
      suspiciousActivity: dbSession.securityContext?.suspiciousActivity || false,
      lastSecurityCheck: dbSession.securityContext?.lastSecurityCheck ? 
        new Date(dbSession.securityContext.lastSecurityCheck).toISOString() : now.toISOString(),
      securityFlags: dbSession.securityContext?.securityFlags || [],
      concurrentSessions: dbSession.concurrentSessions || 1,
      isPrimary: dbSession.isPrimary || false
    };

    const sessionUser: UnifiedSessionUser = {
      _id: dbUser._id.toString(),
      email: dbUser.email,
      userType: dbUser.userType,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      status: dbUser.status,
      permissions: dbUser.permissions || [],
      isSuperAdmin: dbUser.userType === 'super_admin',
      lastLoginAt: dbUser.lastLoginAt ? new Date(dbUser.lastLoginAt).toISOString() : undefined,
      approvedAt: dbUser.approvedAt ? new Date(dbUser.approvedAt).toISOString() : undefined
    };

    return {
      session: sessionInfo,
      user: sessionUser,
      device: deviceInfo,
      security: securityContext,
      metadata: {
        version: '1.0.0',
        createdAt: now.toISOString(),
        lastUpdated: now.toISOString()
      }
    };
  }

  /**
   * Main validation method - handles all validation scenarios
   */
  public async validateSession(options: SessionValidationOptions): Promise<ValidationResult> {
    try {
      console.log(`🔍 SessionValidator: Starting validation for context: ${options.context.type}`);
      
      // Step 1: Get and validate JWT token
      const tokenResult = await this.validateJWT(options);
      if (!tokenResult.success) {
        return tokenResult;
      }
      
      // Step 2: Validate session in database (if required)
      if (options.context.requireSession) {
        const sessionResult = await this.validateDatabaseSession(options, tokenResult.tokenPayload);
        if (!sessionResult.success) {
          return sessionResult;
        }
      }
      
      // Step 3: Validate user permissions
      const permissionResult = await this.validatePermissions(options, tokenResult.user);
      if (!permissionResult.success) {
        return permissionResult;
      }
      
      console.log(`✅ SessionValidator: Validation successful for context: ${options.context.type}`);
      
      // Convert to unified session format if we have session data
      let unifiedSession: UnifiedSessionData | undefined;
      if (tokenResult.session && tokenResult.user) {
        unifiedSession = this.convertToUnifiedSession(tokenResult.session, tokenResult.user);
      }
      
      return {
        success: true,
        session: unifiedSession,
        user: unifiedSession?.user,
        tokenPayload: tokenResult.tokenPayload
      };
      
    } catch (error) {
      console.error('❌ SessionValidator: Validation failed:', error);
      return {
        success: false,
        error: 'Session validation failed',
        response: this.createErrorResponse(options.context, 500, 'Internal server error')
      };
    }
  }

  /**
   * Validate JWT token
   */
  private async validateJWT(options: SessionValidationOptions): Promise<ValidationResult> {
    try {
      // Get token from options or cookies
      let token = options.token;
      if (!token && options.request) {
        token = await getTokenFromCookies();
      }
      
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found',
          response: this.createErrorResponse(options.context, 401, 'Authentication required')
        };
      }
      
      // Verify token
      const payload = await verifyToken(token);
      if (!payload) {
        return {
          success: false,
          error: 'Invalid authentication token',
          response: this.createErrorResponse(options.context, 401, 'Invalid authentication token')
        };
      }
      
      // Check for session ID in token (required for new system)
      if (!payload.sessionId) {
        return {
          success: false,
          error: 'Legacy token without session ID',
          response: this.createErrorResponse(options.context, 401, 'Session required')
        };
      }
      
      // Get user data
      await dbConnect();
      const user = await User.findById(payload.userId).select('-password');
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          response: this.createErrorResponse(options.context, 404, 'User not found')
        };
      }
      
      return {
        success: true,
        user: user.toObject(),
        tokenPayload: payload
      };
      
    } catch (error) {
      console.error('❌ SessionValidator: JWT validation failed:', error);
      return {
        success: false,
        error: 'JWT validation failed',
        response: this.createErrorResponse(options.context, 401, 'Authentication failed')
      };
    }
  }

  /**
   * Validate session in database
   */
  private async validateDatabaseSession(options: SessionValidationOptions, tokenPayload: any): Promise<ValidationResult> {
    try {
      if (!tokenPayload.sessionId) {
        return {
          success: false,
          error: 'No session ID in token',
          response: this.createErrorResponse(options.context, 401, 'Session required')
        };
      }
      
      // Find session in database
      const session = await Session.findOne({
        sessionId: tokenPayload.sessionId,
        userId: tokenPayload.userId
      });
      
      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          response: this.createErrorResponse(options.context, 401, 'Session not found')
        };
      }
      
      // Check if session is expired
      if (!options.context.allowExpired && session.expiresAt < new Date()) {
        return {
          success: false,
          error: 'Session expired',
          response: this.createErrorResponse(options.context, 401, 'Session expired')
        };
      }
      
      // Update last accessed time
      session.lastAccessedAt = new Date();
      await session.save();
      
      return {
        success: true,
        session: session.toObject()
      };
      
    } catch (error) {
      console.error('❌ SessionValidator: Database session validation failed:', error);
      return {
        success: false,
        error: 'Database session validation failed',
        response: this.createErrorResponse(options.context, 500, 'Session validation failed')
      };
    }
  }

  /**
   * Validate user permissions
   */
  private async validatePermissions(options: SessionValidationOptions, user: any): Promise<ValidationResult> {
    try {
      // Check if user is active
      if (user.status !== 'approved') {
        return {
          success: false,
          error: 'User account not active',
          response: this.createErrorResponse(options.context, 403, 'Account not active')
        };
      }
      
      // Check admin permissions
      if (options.context.requireAdmin || options.context.requireSuperAdmin) {
        const isAdmin = user.userType === 'admin' || user.userType === 'super_admin';
        if (!isAdmin) {
          return {
            success: false,
            error: 'Admin access required',
            response: this.createErrorResponse(options.context, 403, 'Admin access required')
          };
        }
      }
      
      // Check super admin permissions
      if (options.context.requireSuperAdmin) {
        if (user.userType !== 'super_admin') {
          return {
            success: false,
            error: 'Super admin access required',
            response: this.createErrorResponse(options.context, 403, 'Super admin access required')
          };
        }
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ SessionValidator: Permission validation failed:', error);
      return {
        success: false,
        error: 'Permission validation failed',
        response: this.createErrorResponse(options.context, 500, 'Permission validation failed')
      };
    }
  }

  /**
   * Create appropriate error response based on context
   */
  private createErrorResponse(context: ValidationContext, status: number, message: string): NextResponse {
    if (context.type === 'middleware') {
      if (status === 401) {
        return NextResponse.redirect(new URL('/login', 'http://localhost:3002'));
      }
      if (status === 403) {
        return NextResponse.redirect(new URL('/dashboard', 'http://localhost:3002'));
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: message,
        code: status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : 'ERROR'
      },
      { status }
    );
  }

  /**
   * Convenience methods for different validation contexts
   */
  
  // Middleware validation (basic JWT only)
  public async validateForMiddleware(request: NextRequest): Promise<ValidationResult> {
    return this.validateSession({
      context: {
        type: 'middleware',
        requireSession: false,
        requireAdmin: false,
        requireSuperAdmin: false
      },
      request
    });
  }
  
  // API validation (full session validation)
  public async validateForAPI(request: NextRequest, requireAdmin = false, requireSuperAdmin = false): Promise<ValidationResult> {
    return this.validateSession({
      context: {
        type: 'api',
        requireSession: true,
        requireAdmin,
        requireSuperAdmin
      },
      request
    });
  }
  
  // Frontend validation (for client-side checks)
  public async validateForFrontend(token?: string): Promise<ValidationResult> {
    return this.validateSession({
      context: {
        type: 'frontend',
        requireSession: true,
        requireAdmin: false,
        requireSuperAdmin: false
      },
      token
    });
  }
  
  // Admin validation (requires admin permissions)
  public async validateForAdmin(request: NextRequest): Promise<ValidationResult> {
    return this.validateSession({
      context: {
        type: 'admin',
        requireSession: true,
        requireAdmin: true,
        requireSuperAdmin: false
      },
      request
    });
  }
}

// Export singleton instance
export const sessionValidator = SessionValidator.getInstance();
