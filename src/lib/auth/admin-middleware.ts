import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthenticatedUser } from './auth-middleware';
import { Permission } from '@/models/User';
import AuditLog, { AuditAction, AuditCategory, TargetResourceType } from '@/models/AuditLog';

/**
 * Admin Authentication Middleware
 * 
 * Provides authentication and authorization for admin routes
 */

export interface AdminAuthResult {
  success: true;
  user: AuthenticatedUser & {
    permissions?: Permission[];
    isSuperAdmin?: boolean;
  };
  tokenPayload: any;
}

export interface AdminAuthFailure {
  success: false;
  response: NextResponse;
}

/**
 * Require admin role (admin or super_admin)
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AdminAuthResult | AdminAuthFailure> {
  // First authenticate the user
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success) {
    return authResult;
  }
  
  // Check if user is an admin
  if (authResult.user.userType !== 'admin' && authResult.user.userType !== 'super_admin') {
    console.log(`⛔ Admin access denied for user ${authResult.user.email} (role: ${authResult.user.userType})`);
    
    return {
      success: false,
      response: NextResponse.json({
        success: false,
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED',
        message: 'You must be an administrator to access this resource'
      }, { status: 403 })
    };
  }
  
  // Fetch full user from database to get instance methods
  const { default: User } = await import('@/models/User');
  const fullUser = await User.findById(authResult.user._id);
  
  if (!fullUser) {
    return {
      success: false,
      response: NextResponse.json({
        success: false,
        error: 'User not found',
        message: 'Admin user not found in database'
      }, { status: 404 })
    };
  }
  
  console.log(`✅ Admin access granted for ${fullUser.email}`);
  
  return {
    success: true,
    user: fullUser as AdminAuthResult['user'],
    tokenPayload: authResult.tokenPayload
  };
}

/**
 * Require super admin role
 */
export async function requireSuperAdmin(
  request: NextRequest
): Promise<AdminAuthResult | AdminAuthFailure> {
  // First check if user is an admin
  const adminResult = await requireAdmin(request);
  
  if (!adminResult.success) {
    return adminResult;
  }
  
  // Check if user is a super admin
  if (adminResult.user.userType !== 'super_admin') {
    console.log(`⛔ Super admin access denied for user ${adminResult.user.email}`);
    
    return {
      success: false,
      response: NextResponse.json({
        success: false,
        error: 'Super admin access required',
        code: 'SUPER_ADMIN_REQUIRED',
        message: 'You must be a super administrator to access this resource'
      }, { status: 403 })
    };
  }
  
  console.log(`✅ Super admin access granted for ${adminResult.user.email}`);
  
  return adminResult;
}

/**
 * Require specific permission(s)
 */
export function requirePermission(
  ...requiredPermissions: Permission[]
) {
  return async (request: NextRequest): Promise<AdminAuthResult | AdminAuthFailure> => {
    // First check if user is an admin
    const adminResult = await requireAdmin(request);
    
    if (!adminResult.success) {
      return adminResult;
    }
    
    // Super admins have all permissions
    if (adminResult.user.isSuperAdmin) {
      return adminResult;
    }
    
    // Check if user has the required permissions
    const userPermissions = adminResult.user.permissions || [];
    const hasAllPermissions = requiredPermissions.every(
      permission => userPermissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      console.log(`⛔ Permission denied for user ${adminResult.user.email}. Required: ${requiredPermissions.join(', ')}`);
      
      return {
        success: false,
        response: NextResponse.json({
          success: false,
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          message: 'You do not have the required permissions to perform this action',
          required: requiredPermissions,
          userPermissions
        }, { status: 403 })
      };
    }
    
    console.log(`✅ Permission check passed for ${adminResult.user.email}`);
    
    return adminResult;
  };
}

/**
 * Require at least one of the specified permissions
 */
export function requireAnyPermission(
  ...requiredPermissions: Permission[]
) {
  return async (request: NextRequest): Promise<AdminAuthResult | AdminAuthFailure> => {
    // First check if user is an admin
    const adminResult = await requireAdmin(request);
    
    if (!adminResult.success) {
      return adminResult;
    }
    
    // Super admins have all permissions
    if (adminResult.user.isSuperAdmin) {
      return adminResult;
    }
    
    // Check if user has at least one of the required permissions
    const userPermissions = adminResult.user.permissions || [];
    const hasAnyPermission = requiredPermissions.some(
      permission => userPermissions.includes(permission)
    );
    
    if (!hasAnyPermission) {
      console.log(`⛔ Permission denied for user ${adminResult.user.email}. Required one of: ${requiredPermissions.join(', ')}`);
      
      return {
        success: false,
        response: NextResponse.json({
          success: false,
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          message: 'You do not have any of the required permissions to perform this action',
          requiredAnyOf: requiredPermissions,
          userPermissions
        }, { status: 403 })
      };
    }
    
    console.log(`✅ Permission check passed for ${adminResult.user.email}`);
    
    return adminResult;
  };
}

/**
 * Audit log helper - logs admin actions
 */
export async function logAdminAction(params: {
  adminId: string;
  adminName: string;
  adminEmail: string;
  adminRole: 'admin' | 'super_admin';
  action: AuditAction;
  category: AuditCategory;
  description: string;
  targetResource?: {
    type: TargetResourceType;
    id: string;
    name?: string;
  };
  changes?: {
    before?: any;
    after?: any;
    fields?: string[];
  };
  metadata?: any;
  requestInfo: {
    ipAddress: string;
    userAgent: string;
    method?: string;
    endpoint?: string;
    requestId?: string;
  };
  outcome: 'success' | 'failure' | 'partial';
  errorMessage?: string;
  duration?: number;
  isSensitive?: boolean;
  requiresReview?: boolean;
}): Promise<void> {
  try {
    await AuditLog.logAction({
      adminId: params.adminId as any,
      adminName: params.adminName,
      adminEmail: params.adminEmail,
      adminRole: params.adminRole,
      action: params.action,
      category: params.category,
      description: params.description,
      targetResource: params.targetResource,
      changes: params.changes,
      metadata: params.metadata,
      requestInfo: params.requestInfo,
      outcome: params.outcome,
      errorMessage: params.errorMessage,
      duration: params.duration,
      isSensitive: params.isSensitive,
      requiresReview: params.requiresReview,
      timestamp: new Date()
    });
    
    console.log(`📝 Audit log created: ${params.action} by ${params.adminEmail}`);
  } catch (error) {
    console.error('❌ Failed to create audit log:', error);
    // Don't throw error - audit logging failure shouldn't break the main operation
  }
}

/**
 * Extract request information for audit logging
 */
export function getRequestInfo(request: NextRequest): {
  ipAddress: string;
  userAgent: string;
  method: string;
  endpoint: string;
} {
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     request.headers.get('x-real-ip') ||
                     request.headers.get('cf-connecting-ip') ||
                     'unknown';
                     
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const method = request.method;
  const endpoint = request.nextUrl.pathname;
  
  return {
    ipAddress,
    userAgent,
    method,
    endpoint
  };
}

/**
 * Wrapper to automatically log admin actions
 */
export function withAdminAudit<T>(
  action: AuditAction,
  category: AuditCategory,
  description: string,
  isSensitive: boolean = false
) {
  return async (
    handler: (authResult: AdminAuthResult, request: NextRequest) => Promise<T>,
    request: NextRequest,
    authResult: AdminAuthResult
  ): Promise<T> => {
    const startTime = Date.now();
    const requestInfo = getRequestInfo(request);
    
    try {
      const result = await handler(authResult, request);
      const duration = Date.now() - startTime;
      
      // Log successful action
      await logAdminAction({
        adminId: authResult.user._id,
        adminName: `${authResult.user.firstName} ${authResult.user.lastName}`,
        adminEmail: authResult.user.email,
        adminRole: authResult.user.userType as 'admin' | 'super_admin',
        action,
        category,
        description,
        requestInfo,
        outcome: 'success',
        duration,
        isSensitive
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log failed action
      await logAdminAction({
        adminId: authResult.user._id,
        adminName: `${authResult.user.firstName} ${authResult.user.lastName}`,
        adminEmail: authResult.user.email,
        adminRole: authResult.user.userType as 'admin' | 'super_admin',
        action,
        category,
        description,
        requestInfo,
        outcome: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        duration,
        isSensitive
      });
      
      throw error;
    }
  };
}

