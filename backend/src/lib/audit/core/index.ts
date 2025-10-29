/**
 * Core Audit Components
 * 
 * Exports all core audit service components including
 * the main service, types, constants, and configuration.
 */

// Main Service
export { AuditService } from './AuditService';

// Types - re-export from centralized types
export type {
  BaseAuditContext,
  UserAuditContext,
  TransferAuditContext,
  PatientAuditContext,
  AuditAuthContext,
  CommunicationAuditContext,
  FileAuditContext,
  DataAccessAuditContext,
  SystemAuditContext,
  AuditRequestInfo,
  AuditLogData
} from '@/types/audit';

// Constants
export {
  AUDIT_CATEGORIES,
  HIGH_RISK_ACTIONS,
  IMMEDIATE_REVIEW_ACTIONS,
  ADMIN_APPROVAL_ACTIONS,
  SENSITIVE_FIELDS_BY_RESOURCE,
  AUDIT_LOG_LEVELS
} from './constants';

// Configuration
export {
  AUDIT_RETENTION_POLICIES,
  RISK_LEVEL_MAPPINGS,
  AUDIT_MONITORING_THRESHOLDS,
  ALERT_CONFIGURATIONS,
  SANITIZATION_RULES,
  EXPORT_CONFIGURATIONS,
  BACKUP_CONFIGURATIONS,
  DEFAULT_AUDIT_SETTINGS,
  AUDIT_PERFORMANCE_SETTINGS,
  AUDIT_SECURITY_SETTINGS
} from './config';
