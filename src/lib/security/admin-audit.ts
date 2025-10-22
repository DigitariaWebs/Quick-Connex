/**
 * Admin Audit Middleware
 * 
 * Tracks admin access to sensitive user data for security and compliance
 */

import { NextRequest } from 'next/server';
import UnifiedAuditLog, { AuditAction, AuditCategory, ActorType, RiskLevel, TargetResourceType } from '@/models/UnifiedAuditLog';
import { createAuditLogEntry } from './data-privacy';

export interface AuditContext {
  adminId: string;
  adminEmail: string;
  adminName?: string;
  adminRole?: string;
  action: AuditAction;
  targetUserId: string;
  targetUserEmail: string;
  targetUserName?: string;
  details?: Record<string, any>;
  riskLevel?: RiskLevel;
  isSensitive?: boolean;
  requiresReview?: boolean;
}

/**
 * Extract IP address and user agent from request
 */
export function extractRequestInfo(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 
    request.headers.get('x-real-ip') || 
    request.headers.get('x-forwarded') ||
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
    const requestId = request.headers.get('x-request-id') || undefined;
    
    // Determine category based on action
    const category = getCategoryForAction(context.action);
    
    // Create audit log entry
    const auditLog = new UnifiedAuditLog({
      // Actor information
      actorId: context.adminId,
      actorType: ActorType.ADMIN,
      actorEmail: context.adminEmail,
      actorName: context.adminName,
      actorRole: context.adminRole,
      
      // Action details
      action: context.action,
      category,
      description: getActionDescription(context.action, context.targetUserEmail),
      
      // Target resource
      targetResource: {
        type: TargetResourceType.USER,
        id: context.targetUserId,
        name: context.targetUserName || context.targetUserEmail,
        metadata: {
          userEmail: context.targetUserEmail,
          ...context.details
        }
      },
      
      // Request information
      requestInfo: {
        ipAddress,
        userAgent,
        method: request.method,
        endpoint: new URL(request.url).pathname,
        requestId,
        sessionId
      },
      
      // Security context
      securityContext: {
        riskLevel: context.riskLevel || RiskLevel.LOW,
        isSensitive: context.isSensitive || false,
        requiresReview: context.requiresReview || false,
        securityFlags: getSecurityFlags(context.action),
        riskScore: getRiskScore(context.action)
      },
      
      // Outcome
      outcome: success ? 'success' : 'failure',
      errorMessage,
      
      // Timing
      timestamp: new Date(),
      
      // Additional flags
      isAutomated: false,
      isBulkOperation: false
    });
    
    await auditLog.save();
  } catch (error) {
    // Don't throw error for audit logging failures
    console.error('Failed to log admin action:', error);
  }
}

/**
 * Determine risk level based on action type
 */
export function getRiskLevel(action: AuditAction): RiskLevel {
  const highRiskActions = [
    AuditAction.USER_DELETED,
    AuditAction.USER_DATA_EXPORTED,
    AuditAction.BULK_TRANSFER_OPERATION,
    AuditAction.DATA_EXPORTED,
    AuditAction.BULK_DATA_ACCESS
  ];
  
  const mediumRiskActions = [
    AuditAction.USER_SUSPENDED,
    AuditAction.USER_ACTIVATED,
    AuditAction.PASSWORD_RESET,
    AuditAction.ACCOUNT_UNLOCKED,
    AuditAction.USER_PROFILE_VIEWED
  ];
  
  if (highRiskActions.includes(action)) {
    return RiskLevel.HIGH;
  }
  
  if (mediumRiskActions.includes(action)) {
    return RiskLevel.MEDIUM;
  }
  
  return RiskLevel.LOW;
}

/**
 * Get category for action
 */
function getCategoryForAction(action: AuditAction): AuditCategory {
  if (action.includes('USER_')) {
    return AuditCategory.USER_MANAGEMENT;
  }
  if (action.includes('TRANSFER_')) {
    return AuditCategory.TRANSFER_MANAGEMENT;
  }
  if (action.includes('LOGIN_') || action.includes('PASSWORD_') || action.includes('SESSION_')) {
    return AuditCategory.AUTHENTICATION;
  }
  if (action.includes('DATA_') || action.includes('EXPORT_') || action.includes('REPORT_')) {
    return AuditCategory.DATA_ACCESS;
  }
  if (action.includes('NOTIFICATION_')) {
    return AuditCategory.NOTIFICATION;
  }
  if (action.includes('SETTINGS_') || action.includes('SYSTEM_') || action.includes('BACKUP_')) {
    return AuditCategory.SYSTEM_CONFIGURATION;
  }
  if (action.includes('FILE_')) {
    return AuditCategory.FILE_OPERATION;
  }
  if (action.includes('API_')) {
    return AuditCategory.API_ACCESS;
  }
  
  return AuditCategory.SYSTEM_CONFIGURATION;
}

/**
 * Get action description
 */
function getActionDescription(action: AuditAction, targetUserEmail: string): string {
  const actionDescriptions: Record<AuditAction, string> = {
    [AuditAction.USER_CREATED]: `User account created for ${targetUserEmail}`,
    [AuditAction.USER_UPDATED]: `User account updated for ${targetUserEmail}`,
    [AuditAction.USER_DELETED]: `User account deleted for ${targetUserEmail}`,
    [AuditAction.USER_SUSPENDED]: `User account suspended for ${targetUserEmail}`,
    [AuditAction.USER_ACTIVATED]: `User account activated for ${targetUserEmail}`,
    [AuditAction.USER_APPROVED]: `User account approved for ${targetUserEmail}`,
    [AuditAction.USER_REJECTED]: `User account rejected for ${targetUserEmail}`,
    [AuditAction.USER_PROFILE_VIEWED]: `User profile viewed for ${targetUserEmail}`,
    [AuditAction.USER_DATA_EXPORTED]: `User data exported for ${targetUserEmail}`,
    [AuditAction.TRANSFER_CREATED]: 'Transfer request created',
    [AuditAction.TRANSFER_UPDATED]: 'Transfer request updated',
    [AuditAction.TRANSFER_DELETED]: 'Transfer request deleted',
    [AuditAction.TRANSFER_CANCELLED]: 'Transfer request cancelled',
    [AuditAction.TRANSFER_APPROVED]: 'Transfer request approved',
    [AuditAction.TRANSFER_REJECTED]: 'Transfer request rejected',
    [AuditAction.TRANSFER_COMPLETED]: 'Transfer request completed',
    [AuditAction.TRANSFER_REASSIGNED]: 'Transfer request reassigned',
    [AuditAction.BULK_TRANSFER_OPERATION]: 'Bulk transfer operation performed',
    [AuditAction.LOGIN_SUCCESS]: 'Successful login',
    [AuditAction.LOGIN_FAILED]: 'Failed login attempt',
    [AuditAction.LOGOUT]: 'User logout',
    [AuditAction.PASSWORD_CHANGED]: 'Password changed',
    [AuditAction.PASSWORD_RESET]: 'Password reset',
    [AuditAction.ACCOUNT_LOCKED]: 'Account locked',
    [AuditAction.ACCOUNT_UNLOCKED]: 'Account unlocked',
    [AuditAction.PERMISSION_CHANGED]: 'Permissions changed',
    [AuditAction.SESSION_CREATED]: 'Session created',
    [AuditAction.SESSION_REVOKED]: 'Session revoked',
    [AuditAction.SUSPICIOUS_ACTIVITY]: 'Suspicious activity detected',
    [AuditAction.DATA_VIEWED]: 'Data viewed',
    [AuditAction.DATA_EXPORTED]: 'Data exported',
    [AuditAction.DATA_IMPORTED]: 'Data imported',
    [AuditAction.REPORT_GENERATED]: 'Report generated',
    [AuditAction.BULK_DATA_ACCESS]: 'Bulk data access',
    [AuditAction.SETTINGS_UPDATED]: 'System settings updated',
    [AuditAction.SYSTEM_MAINTENANCE]: 'System maintenance performed',
    [AuditAction.BACKUP_CREATED]: 'Backup created',
    [AuditAction.BACKUP_RESTORED]: 'Backup restored',
    [AuditAction.SYSTEM_ALERT]: 'System alert triggered',
    [AuditAction.NOTIFICATION_SENT]: 'Notification sent',
    [AuditAction.NOTIFICATION_BROADCAST]: 'Notification broadcast',
    [AuditAction.FILE_UPLOADED]: 'File uploaded',
    [AuditAction.FILE_DOWNLOADED]: 'File downloaded',
    [AuditAction.FILE_DELETED]: 'File deleted',
    [AuditAction.API_ENDPOINT_ACCESSED]: 'API endpoint accessed',
    [AuditAction.API_RATE_LIMITED]: 'API rate limited',
    [AuditAction.API_ERROR]: 'API error occurred'
  };
  
  return actionDescriptions[action] || `Action performed: ${action}`;
}

/**
 * Get security flags for action
 */
function getSecurityFlags(action: AuditAction): string[] {
  const flags: string[] = [];
  
  if (action.includes('DELETE_') || action.includes('EXPORT_')) {
    flags.push('data_modification');
  }
  
  if (action.includes('BULK_')) {
    flags.push('bulk_operation');
  }
  
  if (action.includes('SUSPEND_') || action.includes('LOCK_')) {
    flags.push('account_modification');
  }
  
  if (action.includes('PASSWORD_') || action.includes('PERMISSION_')) {
    flags.push('security_change');
  }
  
  return flags;
}

/**
 * Get risk score for action
 */
function getRiskScore(action: AuditAction): number {
  const highRiskActions = [
    AuditAction.USER_DELETED,
    AuditAction.USER_DATA_EXPORTED,
    AuditAction.BULK_DATA_ACCESS,
    AuditAction.DATA_EXPORTED
  ];
  
  const mediumRiskActions = [
    AuditAction.USER_SUSPENDED,
    AuditAction.USER_ACTIVATED,
    AuditAction.PASSWORD_RESET,
    AuditAction.ACCOUNT_UNLOCKED
  ];
  
  if (highRiskActions.includes(action)) {
    return 80;
  }
  
  if (mediumRiskActions.includes(action)) {
    return 50;
  }
  
  return 20;
}

/**
 * Create audit context for user management actions
 */
export function createUserAuditContext(
  adminId: string,
  adminEmail: string,
  adminName: string,
  adminRole: string,
  action: AuditAction,
  targetUserId: string,
  targetUserEmail: string,
  targetUserName?: string,
  details?: Record<string, any>
): AuditContext {
  return {
    adminId,
    adminEmail,
    adminName,
    adminRole,
    action,
    targetUserId,
    targetUserEmail,
    targetUserName,
    details,
    riskLevel: getRiskLevel(action),
    isSensitive: isSensitiveAction(action),
    requiresReview: requiresReview(action)
  };
}

/**
 * Check if action is sensitive
 */
function isSensitiveAction(action: AuditAction): boolean {
  const sensitiveActions = [
    AuditAction.USER_DELETED,
    AuditAction.USER_DATA_EXPORTED,
    AuditAction.DATA_EXPORTED,
    AuditAction.BULK_DATA_ACCESS,
    AuditAction.USER_PROFILE_VIEWED
  ];
  
  return sensitiveActions.includes(action);
}

/**
 * Check if action requires review
 */
function requiresReview(action: AuditAction): boolean {
  const reviewActions = [
    AuditAction.USER_DELETED,
    AuditAction.USER_DATA_EXPORTED,
    AuditAction.DATA_EXPORTED,
    AuditAction.BULK_DATA_ACCESS,
    AuditAction.USER_SUSPENDED,
    AuditAction.ACCOUNT_LOCKED
  ];
  
  return reviewActions.includes(action);
}

/**
 * Middleware wrapper for admin API routes
 */
export function withAdminAudit(
  handler: (request: NextRequest, context: any) => Promise<Response>,
  action: AuditAction
) {
  return async (request: NextRequest, context: any): Promise<Response> => {
    let auditContext: AuditContext | null = null;
    
    try {
      // Extract admin info from request (you'll need to implement this based on your auth system)
      const adminId = request.headers.get('x-admin-id') || 'unknown';
      const adminEmail = request.headers.get('x-admin-email') || 'unknown@example.com';
      const adminName = request.headers.get('x-admin-name') || 'Unknown Admin';
      const adminRole = request.headers.get('x-admin-role') || 'admin';
      
      // Extract target user info from URL or body
      const url = new URL(request.url);
      const targetUserId = url.pathname.split('/').pop() || 'unknown';
      const targetUserEmail = 'user@example.com'; // You'll need to fetch this from the database
      const targetUserName = 'Unknown User';
      
      auditContext = createUserAuditContext(
        adminId,
        adminEmail,
        adminName,
        adminRole,
        action,
        targetUserId,
        targetUserEmail,
        targetUserName
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
