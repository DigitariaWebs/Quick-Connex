/**
 * Context Utilities
 * 
 * Functions for enriching and validating audit context.
 */

import { 
  AuditAction, 
  AuditCategory, 
  ActorType, 
  RiskLevel, 
  TargetResourceType 
} from '@/models/AuditLog';
import {
  BaseAuditContext,
  AuditRequestInfo,
  AuditLogData
} from '../core/types';
import { getAuditCategoryFromAction } from './risk';

/**
 * Enrich audit context with additional data
 */
export function enrichAuditContext(
  baseContext: BaseAuditContext,
  requestInfo?: AuditRequestInfo,
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
  
  if (!context.actorType) {
    errors.push('Actor type is required');
  }
  
  if (context.targetResourceId && !context.targetResourceType) {
    errors.push('Target resource type is required when target resource ID is provided');
  }
  
  if (context.isSensitive && !context.requiresReview) {
    errors.push('Sensitive operations must require review');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
