/**
 * Timeline Transformers
 * 
 * Functions for transforming audit logs to timeline items and mapping between types.
 */

import { TimelineItem, TimelineQueryOptions } from '@/types/transfers/timeline.types';
import { TimelineEventType } from '@/types/transfers/transfer.types';
import { AuditAction } from '@/models/AuditLog';

/**
 * Transform AuditLog to TimelineItem
 */
export function transformAuditLogToTimelineItem(auditLog: any): TimelineItem {
  return {
    // Identifiers
    timelineItemId: auditLog._id.toString(),
    transferId: auditLog.targetResource?.id || 'unknown',
    
    // Event Details
    kind: mapAuditActionToTimelineKind(auditLog.action),
    title: auditLog.description,
    description: auditLog.description,
    timestamp: auditLog.timestamp,
    order: new Date(auditLog.timestamp).getTime(),
    
    // Actor Information
    actor: {
      id: auditLog.actorId,
      type: auditLog.actorType,
      name: auditLog.actorName || 'Unknown',
      email: auditLog.actorEmail || 'unknown@example.com',
      role: auditLog.actorRole || 'user'
    },
    
    // Change Information
    ...(auditLog.changes && {
      diff: {
        before: auditLog.changes.before,
        after: auditLog.changes.after,
        fields: auditLog.changes.fields || [],
        summary: auditLog.changes.changeSummary || auditLog.description
      }
    }),
    
    // Status Information (extracted from changes)
    statusAfter: extractStatusFromChanges(auditLog.changes),
    assignedToAfter: extractAssignedToFromChanges(auditLog.changes),
    
    // UI Enhancements
    badges: generateBadges(auditLog),
    tags: generateTags(auditLog),
    isSensitive: auditLog.securityContext?.isSensitive || false,
    requiresReview: auditLog.securityContext?.requiresReview || false
  };
}

/**
 * Map timeline event types to audit actions
 */
export function mapTimelineTypesToAuditActions(timelineTypes: TimelineEventType[]): AuditAction[] {
  const mapping: Record<TimelineEventType, AuditAction> = {
    'created': AuditAction.TRANSFER_CREATED,
    'status_changed': AuditAction.TRANSFER_UPDATED,
    'assigned': AuditAction.TRANSFER_REASSIGNED,
    'unassigned': AuditAction.TRANSFER_REASSIGNED,
    'patient_updated': AuditAction.TRANSFER_UPDATED,
    'hospital_updated': AuditAction.TRANSFER_UPDATED,
    'scheduled': AuditAction.TRANSFER_UPDATED,
    'rescheduled': AuditAction.TRANSFER_UPDATED,
    'document_uploaded': AuditAction.FILE_UPLOADED,
    'document_removed': AuditAction.FILE_DELETED,
    'notes_updated': AuditAction.TRANSFER_UPDATED,
    'priority_changed': AuditAction.TRANSFER_UPDATED,
    'reason_updated': AuditAction.TRANSFER_UPDATED,
    'approved': AuditAction.TRANSFER_APPROVED,
    'rejected': AuditAction.TRANSFER_REJECTED,
    'accepted': AuditAction.TRANSFER_UPDATED,
    'started': AuditAction.TRANSFER_UPDATED,
    'completed': AuditAction.TRANSFER_COMPLETED,
    'cancelled': AuditAction.TRANSFER_CANCELLED,
    'communication': AuditAction.NOTIFICATION_SENT,
    'system': AuditAction.SYSTEM_ALERT,
    'admin_action': AuditAction.TRANSFER_UPDATED,
    'manager_action': AuditAction.TRANSFER_UPDATED,
    'employee_action': AuditAction.TRANSFER_UPDATED
  };
  
  return timelineTypes.map(type => mapping[type]).filter(Boolean);
}

/**
 * Map audit action to timeline kind
 */
export function mapAuditActionToTimelineKind(action: string): string {
  const mapping: Record<string, string> = {
    [AuditAction.TRANSFER_CREATED]: 'created',
    [AuditAction.TRANSFER_UPDATED]: 'status_changed',
    [AuditAction.TRANSFER_REASSIGNED]: 'assigned',
    [AuditAction.TRANSFER_APPROVED]: 'approved',
    [AuditAction.TRANSFER_REJECTED]: 'rejected',
    [AuditAction.TRANSFER_COMPLETED]: 'completed',
    [AuditAction.TRANSFER_CANCELLED]: 'cancelled',
    [AuditAction.FILE_UPLOADED]: 'document_uploaded',
    [AuditAction.FILE_DELETED]: 'document_removed',
    [AuditAction.SYSTEM_MAINTENANCE]: 'system'
  };
  
  return mapping[action] || 'unknown';
}

/**
 * Extract status from changes
 */
export function extractStatusFromChanges(changes: any): string | undefined {
  if (!changes || !changes.after) return undefined;
  return changes.after.status || changes.after.state;
}

/**
 * Extract assigned to from changes
 */
export function extractAssignedToFromChanges(changes: any): string | undefined {
  if (!changes || !changes.after) return undefined;
  return changes.after.assignedTo || changes.after.assignee;
}

/**
 * Generate badges for timeline item
 */
export function generateBadges(auditLog: any): string[] {
  const badges: string[] = [];
  
  if (auditLog.securityContext?.isSensitive) {
    badges.push('sensitive');
  }
  
  if (auditLog.securityContext?.requiresReview) {
    badges.push('review-required');
  }
  
  if (auditLog.outcome === 'failure') {
    badges.push('error');
  }
  
  return badges;
}

/**
 * Generate tags for timeline item
 */
export function generateTags(auditLog: any): string[] {
  const tags: string[] = [];
  
  if (auditLog.actorType === 'system') {
    tags.push('system');
  }
  
  if (auditLog.category) {
    tags.push(auditLog.category.toLowerCase());
  }
  
  return tags;
}
