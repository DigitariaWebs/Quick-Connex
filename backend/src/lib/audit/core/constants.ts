/**
 * Audit Constants
 * 
 * Constants and enums for audit logging including categories,
 * risk levels, and security settings.
 */

import { AuditAction, TargetResourceType } from '@/models/AuditLog';

/**
 * Audit categories
 */
export const AUDIT_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  USER_MANAGEMENT: 'user_management',
  DATA_ACCESS: 'data_access',
  FILE_MANAGEMENT: 'file_management',
  SYSTEM_OPERATIONS: 'system_operations',
  COMMUNICATION: 'communication',
  SECURITY: 'security',
  COMPLIANCE: 'compliance'
} as const;

/**
 * High-risk actions that require immediate attention
 */
export const HIGH_RISK_ACTIONS: AuditAction[] = [
  AuditAction.USER_DELETED,
  AuditAction.USER_SUSPENDED,
  AuditAction.USER_DATA_EXPORTED,
  AuditAction.TRANSFER_DELETED,
  AuditAction.PATIENT_DELETED,
  AuditAction.SYSTEM_MAINTENANCE,
  AuditAction.BULK_DATA_ACCESS,
  AuditAction.BULK_TRANSFER_OPERATION
];

/**
 * Actions that require immediate review
 */
export const IMMEDIATE_REVIEW_ACTIONS: AuditAction[] = [
  AuditAction.USER_DELETED,
  AuditAction.USER_SUSPENDED,
  AuditAction.TRANSFER_DELETED,
  AuditAction.PATIENT_DELETED,
  AuditAction.SYSTEM_MAINTENANCE,
  AuditAction.BULK_TRANSFER_OPERATION
];

/**
 * Actions that require admin approval
 */
export const ADMIN_APPROVAL_ACTIONS: AuditAction[] = [
  AuditAction.USER_DELETED,
  AuditAction.USER_SUSPENDED,
  AuditAction.TRANSFER_DELETED,
  AuditAction.PATIENT_DELETED,
  AuditAction.SYSTEM_MAINTENANCE,
  AuditAction.USER_DATA_EXPORTED,
  AuditAction.DATA_EXPORTED
];

/**
 * Sensitive fields by resource type
 */
export const SENSITIVE_FIELDS_BY_RESOURCE: Record<TargetResourceType, string[]> = {
  [TargetResourceType.USER]: ['password', 'email', 'phone', 'ssn', 'address'],
  [TargetResourceType.PATIENT]: ['ssn', 'medicalRecordNumber', 'insuranceNumber', 'address', 'phone'],
  [TargetResourceType.TRANSFER]: ['patientId', 'medicalRecordNumber', 'notes'],
  [TargetResourceType.FILE]: ['content', 'metadata', 'path'],
  [TargetResourceType.SYSTEM]: ['config', 'secrets', 'tokens'],
  [TargetResourceType.NOTIFICATION]: [],
  [TargetResourceType.SETTING]: [],
  [TargetResourceType.REPORT]: [],
  [TargetResourceType.API]: [],
  [TargetResourceType.SESSION]: []
};

/**
 * Audit log levels
 */
export const AUDIT_LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
} as const;
