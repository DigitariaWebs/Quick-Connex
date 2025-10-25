/**
 * Audit Service Module Exports
 * 
 * Clean, centralized exports for the audit logging system.
 * Single import point for all audit-related functionality.
 */

// ===== MAIN SERVICE =====
export { AuditService } from './AuditService';

// ===== TYPES =====
export type {
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

// ===== UTILITIES =====
export {
  extractRequestInfo,
  extractIpAddress,
  enrichAuditContext,
  formatChangesForAudit,
  assessRiskLevel,
  generateAuditDescription,
  sanitizeAuditData,
  formatErrorForAudit,
  calculateAuditDuration,
  validateAuditContext,
  generateAuditId,
  formatAuditTimestamp,
  getAuditCategoryFromAction,
  requiresHighSecurity,
  getSensitiveFieldsForResource
} from './audit-utils';

// ===== CONFIGURATION =====
export {
  AUDIT_RETENTION_POLICIES,
  RISK_LEVEL_MAPPINGS,
  AUDIT_CATEGORIES,
  HIGH_RISK_ACTIONS,
  IMMEDIATE_REVIEW_ACTIONS,
  ADMIN_APPROVAL_ACTIONS,
  SENSITIVE_FIELDS_BY_RESOURCE,
  AUDIT_LOG_LEVELS,
  MONITORING_THRESHOLDS,
  ALERT_CONFIGURATIONS,
  SANITIZATION_RULES,
  EXPORT_CONFIGURATIONS,
  BACKUP_CONFIGURATIONS,
  DEFAULT_AUDIT_SETTINGS,
  PERFORMANCE_SETTINGS,
  SECURITY_SETTINGS
} from './audit-config';
