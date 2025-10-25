/**
 * Audit Utilities
 * 
 * Utility functions for audit logging including request extraction,
 * context enrichment, and data formatting.
 */

import { NextRequest } from 'next/server';
import { 
  AuditAction, 
  AuditCategory, 
  ActorType, 
  RiskLevel, 
  TargetResourceType 
} from '@/models/AuditLog';
import {
  BaseAuditContext,
  UserAuditContext,
  TransferAuditContext,
  PatientAuditContext,
  AuthAuditContext,
  CommunicationAuditContext,
  FileAuditContext,
  DataAccessAuditContext,
  SystemAuditContext,
  RequestInfo,
  AuditLogData
} from './audit-types';
import { 
  truncate, 
  maskEmail
} from '@/lib/utils/string-helpers';
import { 
  sanitizeString 
} from '@/lib/utils/request-validation';
import { 
  getCurrentTimestamp 
} from '@/lib/utils/date-time';

/**
 * Extract request information from NextRequest
 */
export function extractRequestInfo(request: NextRequest): RequestInfo {
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  const ipAddress = extractIpAddress(request);
  const requestId = request.headers.get('x-request-id') || undefined;
  const sessionId = request.headers.get('x-session-id') || undefined;
  
  return {
    ipAddress,
    userAgent: truncate(sanitizeString(userAgent), { maxLength: 500, preserveWords: false }),
    method: request.method,
    endpoint: new URL(request.url).pathname,
    requestId,
    sessionId
  };
}

/**
 * Extract IP address from request
 */
export function extractIpAddress(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  return 'unknown';
}

/**
 * Enrich audit context with additional metadata
 */
export function enrichAuditContext(
  baseContext: BaseAuditContext,
  requestInfo?: RequestInfo,
  additionalData?: Record<string, any>
): AuditLogData {
  const timestamp = new Date();
  
  return {
    actorId: baseContext.actorId,
    actorType: baseContext.actorType,
    actorEmail: baseContext.actorEmail,
    actorName: baseContext.actorName,
    actorRole: baseContext.actorRole,
    action: baseContext.action,
    category: getAuditCategoryFromAction(baseContext.action),
    description: baseContext.description,
    targetResource: baseContext.targetResourceId ? {
      type: baseContext.targetResourceType || TargetResourceType.USER,
      id: baseContext.targetResourceId,
      name: baseContext.targetResourceName,
      metadata: baseContext.metadata
    } : undefined,
    changes: baseContext.details,
    context: {
      ...baseContext.metadata,
      reason: baseContext.reason,
      riskLevel: baseContext.riskLevel,
      isSensitive: baseContext.isSensitive,
      requiresReview: baseContext.requiresReview
    },
    requestInfo: requestInfo || undefined,
    securityContext: {
      riskLevel: baseContext.riskLevel || RiskLevel.LOW,
      isSensitive: baseContext.isSensitive || false,
      requiresReview: baseContext.requiresReview || false
    },
    outcome: baseContext.success ? 'success' : 'failure',
    errorMessage: baseContext.errorMessage,
    errorCode: baseContext.errorCode,
    timestamp,
    timezone: 'UTC',
    isAutomated: false,
    isBulkOperation: false,
    ...additionalData
  };
}

/**
 * Format changes for audit logging
 */
export function formatChangesForAudit(
  oldData: Record<string, any>,
  newData: Record<string, any>,
  sensitiveFields: string[] = []
): Record<string, any> {
  const changes: Record<string, any> = {};
  
  // Compare fields and track changes
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  
  for (const key of allKeys) {
    const oldValue = oldData[key];
    const newValue = newData[key];
    
    if (oldValue !== newValue) {
      if (sensitiveFields.includes(key)) {
        changes[key] = {
          old: '[REDACTED]',
          new: '[REDACTED]'
        };
      } else {
        changes[key] = {
          old: oldValue,
          new: newValue
        };
      }
    }
  }
  
  return changes;
}

/**
 * Determine risk level based on action and context
 */
export function assessRiskLevel(
  action: AuditAction,
  category: AuditCategory,
  context: Record<string, any>
): RiskLevel {
  // High-risk actions
  if ([
    'DELETE_USER',
    'DELETE_PATIENT',
    'DELETE_TRANSFER',
    'BULK_DELETE',
    'SYSTEM_SHUTDOWN',
    'DATABASE_MIGRATION'
  ].includes(action)) {
    return RiskLevel.HIGH;
  }
  
  // Medium-risk actions
  if ([
    'UPDATE_USER',
    'UPDATE_PATIENT',
    'UPDATE_TRANSFER',
    'BULK_UPDATE',
    'EXPORT_DATA',
    'IMPORT_DATA'
  ].includes(action)) {
    return RiskLevel.MEDIUM;
  }
  
  // Check for sensitive data access
  if (context.sensitiveDataAccess || context.patientDataAccess) {
    return RiskLevel.MEDIUM;
  }
  
  // Check for bulk operations
  if (context.bulkOperation || context.isBulkOperation) {
    return RiskLevel.MEDIUM;
  }
  
  // Check for admin actions
  if (context.actorRole === 'admin' || context.actorRole === 'super_admin') {
    return RiskLevel.MEDIUM;
  }
  
  return RiskLevel.LOW;
}

/**
 * Generate audit description from action and context
 */
export function generateAuditDescription(
  action: AuditAction,
  category: AuditCategory,
  context: Record<string, any>
): string {
  const actorName = context.actorName || 'Unknown user';
  const targetResource = context.targetResource || 'Unknown resource';
  
  switch (action) {
    case AuditAction.USER_CREATED:
      return `${actorName} created a new user account`;
    case AuditAction.USER_UPDATED:
      return `${actorName} updated user account: ${targetResource}`;
    case AuditAction.USER_DELETED:
      return `${actorName} deleted user account: ${targetResource}`;
    case AuditAction.LOGIN_SUCCESS:
      return `${actorName} logged into the system`;
    case AuditAction.LOGOUT:
      return `${actorName} logged out of the system`;
    case AuditAction.PATIENT_CREATED:
      return `${actorName} created a new patient record`;
    case AuditAction.PATIENT_UPDATED:
      return `${actorName} updated patient record: ${targetResource}`;
    case AuditAction.PATIENT_DELETED:
      return `${actorName} deleted patient record: ${targetResource}`;
    case AuditAction.TRANSFER_CREATED:
      return `${actorName} created a new transfer request`;
    case AuditAction.TRANSFER_UPDATED:
      return `${actorName} updated transfer request: ${targetResource}`;
    case AuditAction.TRANSFER_DELETED:
      return `${actorName} deleted transfer request: ${targetResource}`;
    case AuditAction.TRANSFER_APPROVED:
      return `${actorName} approved transfer request: ${targetResource}`;
    case AuditAction.TRANSFER_REJECTED:
      return `${actorName} rejected transfer request: ${targetResource}`;
    case AuditAction.NOTIFICATION_SENT:
      return `${actorName} sent a notification`;
    case AuditAction.FILE_UPLOADED:
      return `${actorName} uploaded a file: ${targetResource}`;
    case AuditAction.FILE_DOWNLOADED:
      return `${actorName} downloaded a file: ${targetResource}`;
    case AuditAction.FILE_DELETED:
      return `${actorName} deleted a file: ${targetResource}`;
    case AuditAction.DATA_EXPORTED:
      return `${actorName} exported data`;
    case AuditAction.DATA_IMPORTED:
      return `${actorName} imported data`;
    case AuditAction.BULK_TRANSFER_OPERATION:
      return `${actorName} performed bulk transfer operation`;
    case AuditAction.BACKUP_CREATED:
      return `${actorName} initiated system backup`;
    case AuditAction.BACKUP_RESTORED:
      return `${actorName} initiated system restore`;
    case AuditAction.SYSTEM_MAINTENANCE:
      return `${actorName} performed system maintenance`;
    default:
      return `${actorName} performed ${action.toLowerCase().replace(/_/g, ' ')}`;
  }
}

/**
 * Sanitize sensitive data for audit logging
 */
export function sanitizeAuditData(
  data: Record<string, any>,
  sensitiveFields: string[] = []
): Record<string, any> {
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Format error information for audit logging
 */
export function formatErrorForAudit(error: any): {
  errorMessage: string;
  errorCode: string;
  errorStack?: string;
} {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
      errorCode: error.name,
      errorStack: error.stack
    };
  }
  
  if (typeof error === 'string') {
    return {
      errorMessage: error,
      errorCode: 'UNKNOWN_ERROR'
    };
  }
  
  return {
    errorMessage: 'Unknown error occurred',
    errorCode: 'UNKNOWN_ERROR'
  };
}

/**
 * Calculate audit duration
 */
export function calculateAuditDuration(startTime: number, endTime?: number): number {
  const end = endTime || Date.now();
  return end - startTime;
}

/**
 * Validate audit context
 */
export function validateAuditContext(context: BaseAuditContext): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!context.actorId) {
    errors.push('Actor ID is required');
  }
  
  if (!context.action) {
    errors.push('Action is required');
  }
  
  // Category is derived from action, not required in BaseAuditContext
  
  if (!context.description) {
    errors.push('Description is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate audit ID
 */
export function generateAuditId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `audit_${timestamp}_${random}`;
}

/**
 * Format timestamp for audit logging
 */
export function formatAuditTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Get audit category from action
 */
export function getAuditCategoryFromAction(action: AuditAction): AuditCategory {
  if (action.startsWith('LOGIN') || action.startsWith('LOGOUT')) {
    return AuditCategory.AUTHENTICATION;
  }
  
  if (action.includes('USER')) {
    return AuditCategory.USER_MANAGEMENT;
  }
  
  if (action.includes('PATIENT')) {
    return AuditCategory.PATIENT_MANAGEMENT;
  }
  
  if (action.includes('TRANSFER')) {
    return AuditCategory.TRANSFER_MANAGEMENT;
  }
  
  if (action.includes('NOTIFICATION') || action.includes('COMMUNICATION')) {
    return AuditCategory.COMMUNICATION;
  }
  
  if (action.includes('FILE') || action.includes('UPLOAD') || action.includes('DOWNLOAD')) {
    return AuditCategory.FILE_OPERATION;
  }
  
  if (action.includes('EXPORT') || action.includes('IMPORT') || action.includes('DATA')) {
    return AuditCategory.DATA_ACCESS;
  }
  
  if (action.includes('SYSTEM') || action.includes('DATABASE') || action.includes('BACKUP')) {
    return AuditCategory.SYSTEM_CONFIGURATION;
  }
  
  return AuditCategory.USER_MANAGEMENT; // Default fallback
}

/**
 * Check if action requires high security
 */
export function requiresHighSecurity(action: AuditAction): boolean {
  const highSecurityActions = [
    'DELETE_USER',
    'DELETE_PATIENT',
    'DELETE_TRANSFER',
    'BULK_DELETE',
    'SYSTEM_SHUTDOWN',
    'DATABASE_MIGRATION',
    'EXPORT_DATA',
    'IMPORT_DATA'
  ];
  
  return highSecurityActions.includes(action);
}

/**
 * Get sensitive fields for different resource types
 */
export function getSensitiveFieldsForResource(resourceType: TargetResourceType): string[] {
  const sensitiveFields: Record<TargetResourceType, string[]> = {
    [TargetResourceType.USER]: ['password', 'email', 'phone', 'ssn', 'address'],
    [TargetResourceType.PATIENT]: ['ssn', 'address', 'phone', 'medicalRecordNumber', 'insuranceNumber'],
    [TargetResourceType.TRANSFER]: ['patientId', 'medicalRecordNumber'],
    [TargetResourceType.FILE]: ['content', 'metadata'],
    [TargetResourceType.SYSTEM]: ['configuration', 'secrets'],
    [TargetResourceType.NOTIFICATION]: [],
    [TargetResourceType.SETTING]: [],
    [TargetResourceType.REPORT]: [],
    [TargetResourceType.API]: [],
    [TargetResourceType.SESSION]: []
  };
  
  return sensitiveFields[resourceType] || [];
}
