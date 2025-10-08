import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import dbConnect from '@/lib/database/mongoose';
import User from '@/models/User';

export interface AuthenticatedUser {
  _id: string;
  userType: 'employee' | 'manager';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  post?: string;
  class?: string;
}

export interface AuthContext {
  user: AuthenticatedUser;
  tokenPayload: {
    userId: string;
    email: string;
    userType: 'employee' | 'manager';
  };
}

/**
 * Middleware to authenticate requests and get current user
 */
export async function authenticateRequest(request: NextRequest): Promise<{
  success: true;
  user: AuthenticatedUser;
  tokenPayload: any;
} | {
  success: false;
  response: NextResponse;
}> {
  try {
    // Get current user from JWT token
    const tokenPayload = await getCurrentUser();
    
    if (!tokenPayload) {
      return {
        success: false,
        response: NextResponse.json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        }, { status: 401 })
      };
    }

    // Connect to database and get fresh user data
    await dbConnect();
    const user = await User.findById(tokenPayload.userId).select('-password');
    
    if (!user) {
      return {
        success: false,
        response: NextResponse.json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        }, { status: 404 })
      };
    }

    return {
      success: true,
      user: {
        ...user.toObject(),
        _id: (user._id as any).toString()
      },
      tokenPayload
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
 * Middleware to require specific user roles
 */
export function requireRole(allowedRoles: ('employee' | 'manager')[]) {
  return async (request: NextRequest): Promise<{
    success: true;
    user: AuthenticatedUser;
    tokenPayload: any;
  } | {
    success: false;
    response: NextResponse;
  }> => {
    const authResult = await authenticateRequest(request);
    
    if (!authResult.success) {
      return authResult;
    }

    if (!allowedRoles.includes(authResult.user.userType)) {
      return {
        success: false,
        response: NextResponse.json({
          success: false,
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          details: `Required roles: ${allowedRoles.join(', ')}, User role: ${authResult.user.userType}`
        }, { status: 403 })
      };
    }

    return authResult;
  };
}

/**
 * Convenience functions for common role requirements
 */
export const requireManager = requireRole(['manager']);
export const requireEmployee = requireRole(['employee']);
export const requireEmployeeOrManager = requireRole(['employee', 'manager']);

/**
 * Standard error response helper
 */
export function createErrorResponse(
  message: string, 
  code: string, 
  status: number = 500,
  details?: any
): NextResponse {
  return NextResponse.json({
    success: false,
    error: message,
    code,
    details,
    timestamp: new Date().toISOString()
  }, { status });
}

/**
 * Standard success response helper
 */
export function createSuccessResponse(
  data: any, 
  message?: string, 
  status: number = 200
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }, { status });
}
