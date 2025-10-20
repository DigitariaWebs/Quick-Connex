import { NextResponse } from 'next/server';
import { getCurrentUserWithSession } from './jwt';

export interface AuthUser {
  _id: string;
  email: string;
  userType: 'employee' | 'manager' | 'admin' | 'super_admin';
  firstName: string;
  lastName: string;
  status: string;
}

export interface AuthSession {
  sessionId: string;
  expiresAt: string;
  securityRisk: 'low' | 'medium' | 'high';
  isNewDevice: boolean;
  isNewLocation: boolean;
  sessionAge: number;
  remainingTime: number;
}

export interface AuthResult {
  user: AuthUser;
  session: AuthSession;
}

/**
 * Require authentication with optional role validation
 * @param requiredRoles - Array of allowed user types (e.g., ['manager', 'super_admin'])
 * @returns AuthResult with user and session data
 * @throws Error with appropriate message for authentication failures
 */
export async function requireAuth(requiredRoles?: string[]): Promise<AuthResult> {
  const { user, session, isValid } = await getCurrentUserWithSession();
  
  if (!isValid || !user) {
    throw new Error('Authentication required');
  }

  if (requiredRoles && !requiredRoles.includes(user.userType)) {
    throw new Error(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
  }

  return { user, session };
}

/**
 * Require manager or super_admin access
 */
export async function requireManager(): Promise<AuthResult> {
  return requireAuth(['manager', 'super_admin']);
}

/**
 * Require employee, manager, or super_admin access
 */
export async function requireEmployeeOrManager(): Promise<AuthResult> {
  return requireAuth(['employee', 'manager', 'super_admin']);
}

/**
 * Require employee or manager access (no super_admin)
 */
export async function requireEmployeeOrManagerOnly(): Promise<AuthResult> {
  return requireAuth(['employee', 'manager']);
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string, 
  code: string = 'ERROR', 
  status: number = 400, 
  details?: any
): NextResponse {
  return NextResponse.json({
    success: false,
    error: message,
    code,
    details
  }, { status });
}

/**
 * Create standardized success response
 */
export function createSuccessResponse(
  data: any, 
  message?: string, 
  status: number = 200
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message
  }, { status });
}

/**
 * Handle authentication errors in API routes
 * Usage: return handleAuthError(error);
 */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof Error) {
    if (error.message === 'Authentication required') {
      return createErrorResponse('Authentication required', 'AUTH_REQUIRED', 401);
    }
    if (error.message.includes('Access denied')) {
      return createErrorResponse(error.message, 'INSUFFICIENT_PERMISSIONS', 403);
    }
    return createErrorResponse(error.message, 'AUTH_ERROR', 401);
  }
  return createErrorResponse('Authentication failed', 'AUTH_ERROR', 401);
}

