/**
 * Validator Utilities
 * 
 * Functions for validating audit data and security requirements.
 */

import { AuditAction, TargetResourceType } from '@/models/AuditLog';
import { SENSITIVE_FIELDS_BY_RESOURCE } from '../core/constants';

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
  return SENSITIVE_FIELDS_BY_RESOURCE[resourceType] || [];
}

