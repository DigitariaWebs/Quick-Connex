/**
 * Simple Authentication Middleware
 * 
 * Clean, simple middleware that uses SessionManager
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { SessionManager } from '@/lib/session/SessionManager';

export interface AuthResult {
  success: boolean;
  user?: any;
  session?: any;
  response?: NextResponse;
}

/**
 * Simple authentication middleware
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // Get current user from JWT token
    const tokenPayload = await getCurrentUser();
    
    if (!tokenPayload || !tokenPayload.sessionId) {
      return {
        success: false,
        response: NextResponse.json({
          success: false,
          error: 'Not authenticated',
          code: 'UNAUTHORIZED'
        }, { status: 401 })
      };
    }

    // Validate session using SessionManager
    const result = await SessionManager.validateSession(tokenPayload.sessionId);
    
    if (!result.success) {
      return {
        success: false,
        response: NextResponse.json({
          success: false,
          error: result.error || 'Session validation failed',
          code: 'SESSION_INVALID'
        }, { status: 401 })
      };
    }

    return {
      success: true,
      user: result.user,
      session: result.session
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      response: NextResponse.json({
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      }, { status: 500 })
    };
  }
}

/**
 * Require employee or manager role
 */
export async function requireEmployeeOrManager(request: NextRequest): Promise<AuthResult> {
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success) {
    return authResult;
  }

  const userType = authResult.user?.userType;
  
  if (!userType || !['employee', 'manager', 'admin', 'super_admin'].includes(userType)) {
    return {
      success: false,
      response: NextResponse.json({
        success: false,
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      }, { status: 403 })
    };
  }

  return authResult;
}

/**
 * Require admin or super admin role
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success) {
    return authResult;
  }

  const userType = authResult.user?.userType;
  
  if (!userType || !['admin', 'super_admin'].includes(userType)) {
    return {
      success: false,
      response: NextResponse.json({
        success: false,
        error: 'Admin access required',
        code: 'FORBIDDEN'
      }, { status: 403 })
    };
  }

  return authResult;
}
