/**
 * Admin Audit Middleware
 * 
 * Tracks admin access to sensitive user data for security and compliance
 */

import { NextRequest } from 'next/server';
import AdminAuditLog from '@/models/AdminAuditLog';
import { createAuditLogEntry } from './data-privacy';

export interface AuditContext {
  adminId: string;
  adminEmail: string;
  action: string;
  targetUserId: string;
  targetUserEmail: string;
  details?: Record<string, any>;
  riskLevel?: 'low' | 'medium' | 'high';
}

/**
 * Extract IP address and user agent from request
 */
export function extractRequestInfo(request: NextRequest) {
  const ipAddress = request.ip || 
    request.headers.get('x-forwarded-for') || 
    request.headers.get('x-real-ip') || 
    '127.0.0.1';
  
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  
  return { ipAddress, userAgent };
}

/**
 * Log admin action to audit trail
 */
export async function logAdminAction(
  request: NextRequest,
  context: AuditContext,
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  try {
    const { ipAddress, userAgent } = extractRequestInfo(request);
    const sessionId = request.headers.get('x-session-id') || undefined;
    
    await AdminAuditLog.logAdminAction(
      context.adminId,
      context.adminEmail,
      context.action,
      context.targetUserId,
      context.targetUserEmail,
      context.details || {},
      ipAddress,
      userAgent,
      sessionId,
      context.riskLevel || 'low',
      success,
      errorMessage
    );
  } catch (error) {
    // Don't throw error for audit logging failures
    console.error('Failed to log admin action:', error);
  }
}

/**
 * Determine risk level based on action type
 */
export function getRiskLevel(action: string): 'low' | 'medium' | 'high' {
  const highRiskActions = [
    'delete_user',
    'export_user_data',
    'bulk_operations'
  ];
  
  const mediumRiskActions = [
    'suspend_user',
    'activate_user',
    'reset_password',
    'unlock_account'
  ];
  
  if (highRiskActions.includes(action)) {
    return 'high';
  }
  
  if (mediumRiskActions.includes(action)) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Create audit context for user management actions
 */
export function createUserAuditContext(
  adminId: string,
  adminEmail: string,
  action: string,
  targetUserId: string,
  targetUserEmail: string,
  details?: Record<string, any>
): AuditContext {
  return {
    adminId,
    adminEmail,
    action,
    targetUserId,
    targetUserEmail,
    details,
    riskLevel: getRiskLevel(action)
  };
}

/**
 * Middleware wrapper for admin API routes
 */
export function withAdminAudit(
  handler: (request: NextRequest, context: any) => Promise<Response>,
  action: string
) {
  return async (request: NextRequest, context: any): Promise<Response> => {
    let auditContext: AuditContext | null = null;
    
    try {
      // Extract admin info from request (you'll need to implement this based on your auth system)
      const adminId = request.headers.get('x-admin-id') || 'unknown';
      const adminEmail = request.headers.get('x-admin-email') || 'unknown@example.com';
      
      // Extract target user info from URL or body
      const url = new URL(request.url);
      const targetUserId = url.pathname.split('/').pop() || 'unknown';
      const targetUserEmail = 'user@example.com'; // You'll need to fetch this from the database
      
      auditContext = createUserAuditContext(
        adminId,
        adminEmail,
        action,
        targetUserId,
        targetUserEmail
      );
      
      // Execute the original handler
      const response = await handler(request, context);
      
      // Log successful action
      if (auditContext) {
        await logAdminAction(request, auditContext, true);
      }
      
      return response;
      
    } catch (error) {
      // Log failed action
      if (auditContext) {
        await logAdminAction(
          request, 
          auditContext, 
          false, 
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
      
      throw error;
    }
  };
}
