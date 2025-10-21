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

  return { user: user as any, session: session as any };
}

/**
 * Require manager or super_admin access
 */
export async function requireManager(): Promise<AuthResult> {
  return requireAuth(['manager', 'super_admin']);
}

export async function requireAdmin(): Promise<AuthResult> {
  const authResult = await requireAuth(['admin', 'super_admin']);
  
  if (!authResult.user) {
    return authResult;
  }
  
  // Fetch full user data from database for admin operations
  try {
    const { default: dbConnect } = await import('@/lib/database/mongoose');
    const { default: User } = await import('@/models/User');
    
    await dbConnect();
    
    const fullUser = await User.findById(authResult.user.userId);
    if (!fullUser) {
      throw new Error('Admin user not found in database');
    }
    
    // Return the full user data instead of just JWT payload
    return {
      user: {
        _id: fullUser._id,
        userId: fullUser._id.toString(),
        email: fullUser.email,
        userType: fullUser.userType,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        status: fullUser.status,
        phone: fullUser.phone,
        createdAt: fullUser.createdAt,
        updatedAt: fullUser.updatedAt
      },
      session: authResult.session
    };
  } catch (error) {
    console.error('Error fetching admin user data:', error);
    throw new Error('Unable to retrieve admin user information');
  }
}

/**
 * Require employee, manager, admin, or super_admin access
 */
export async function requireEmployeeOrManager(): Promise<AuthResult> {
  return requireAuth(['employee', 'manager', 'admin', 'super_admin']);
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

