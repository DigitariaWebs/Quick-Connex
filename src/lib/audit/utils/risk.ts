/**
 * Risk Assessment Utilities
 * 
 * Functions for assessing risk levels and categorizing audit actions.
 */

import { 
  AuditAction, 
  AuditCategory, 
  RiskLevel 
} from '@/models/AuditLog';

/**
 * Determine risk level based on action and context
 */
export function assessAuditRiskLevel(
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
