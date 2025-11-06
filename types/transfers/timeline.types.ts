/**
 * Timeline Types and Interfaces
 */

import { AuditAction, AuditCategory, ActorType } from '@/models/AuditLog';

export interface TimelineItem {
  timelineItemId: string;
  transferId: string;
  kind: string;
  title: string;
  description: string;
  timestamp: Date;
  order: number;
  actor: {
    id: string;
    type: ActorType;
    name: string;
    email: string;
    role: string;
  };
  diff?: {
    before: any;
    after: any;
    fields: string[];
    summary: string;
  };
  statusAfter?: string;
  assignedToAfter?: string;
  attachments?: {
    type: string;
    name: string;
    size: number;
    url?: string;
  }[];
  badges: string[];
  tags: string[];
  isSensitive: boolean;
  requiresReview: boolean;
}

export interface TimelineQueryOptions {
  page?: number;
  limit?: number;
  filters?: {
    actorId?: string;
    kind?: string;
    startDate?: Date;
    endDate?: Date;
    isSensitive?: boolean;
    requiresReview?: boolean;
  };
}

export interface TimelinePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TimelineResponse {
  items: TimelineItem[];
  pagination: TimelinePagination;
}

export interface TimelineStats {
  totalEvents: number;
  statusChanges: number;
  documentUploads: number;
  lastActivity: Date;
  actors: {
    id: string;
    name: string;
    eventCount: number;
  }[];
}

export interface RecentActivityOptions {
  limit?: number;
  filters?: {
    actorId?: string;
    category?: AuditCategory;
    isSensitive?: boolean;
  };
}

export const EVENT_KIND_MAPPING: Record<AuditAction, string> = {
  [AuditAction.USER_CREATED]: 'user_created',
  [AuditAction.USER_UPDATED]: 'user_updated',
  [AuditAction.USER_DELETED]: 'user_deleted',
  [AuditAction.USER_SUSPENDED]: 'user_suspended',
  [AuditAction.USER_ACTIVATED]: 'user_activated',
  [AuditAction.USER_APPROVED]: 'user_approved',
  [AuditAction.USER_REJECTED]: 'user_rejected',
  [AuditAction.USER_PROFILE_VIEWED]: 'user_profile_viewed',
  [AuditAction.USER_DATA_EXPORTED]: 'user_data_exported',
  [AuditAction.TRANSFER_CREATED]: 'transfer_created',
  [AuditAction.TRANSFER_UPDATED]: 'transfer_updated',
  [AuditAction.TRANSFER_DELETED]: 'transfer_deleted',
  [AuditAction.TRANSFER_CANCELLED]: 'transfer_cancelled',
  [AuditAction.TRANSFER_APPROVED]: 'transfer_approved',
  [AuditAction.TRANSFER_REJECTED]: 'transfer_rejected',
  [AuditAction.TRANSFER_COMPLETED]: 'transfer_completed',
  [AuditAction.TRANSFER_REASSIGNED]: 'transfer_reassigned',
  [AuditAction.BULK_TRANSFER_OPERATION]: 'bulk_transfer_operation',
  [AuditAction.LOGIN_SUCCESS]: 'user_login',
  [AuditAction.LOGIN_FAILED]: 'login_failed',
  [AuditAction.LOGOUT]: 'user_logout',
  [AuditAction.PASSWORD_CHANGED]: 'password_changed',
  [AuditAction.PASSWORD_RESET]: 'password_reset',
  [AuditAction.ACCOUNT_LOCKED]: 'account_locked',
  [AuditAction.ACCOUNT_UNLOCKED]: 'account_unlocked',
  [AuditAction.PERMISSION_CHANGED]: 'permission_changed',
  [AuditAction.SESSION_CREATED]: 'session_created',
  [AuditAction.SESSION_REVOKED]: 'session_revoked',
  [AuditAction.SUSPICIOUS_ACTIVITY]: 'suspicious_activity',
  [AuditAction.DATA_VIEWED]: 'data_viewed',
  [AuditAction.DATA_EXPORTED]: 'data_exported',
  [AuditAction.DATA_IMPORTED]: 'data_imported',
  [AuditAction.REPORT_GENERATED]: 'report_generated',
  [AuditAction.BULK_DATA_ACCESS]: 'bulk_data_access',
  [AuditAction.PATIENT_CREATED]: 'patient_created',
  [AuditAction.PATIENT_UPDATED]: 'patient_updated',
  [AuditAction.PATIENT_DELETED]: 'patient_deleted',
  [AuditAction.PATIENT_VIEWED]: 'patient_viewed',
  [AuditAction.PATIENT_MERGED]: 'patient_merged',
  [AuditAction.SETTINGS_UPDATED]: 'settings_updated',
  [AuditAction.SYSTEM_MAINTENANCE]: 'system_maintenance',
  [AuditAction.BACKUP_CREATED]: 'backup_created',
  [AuditAction.BACKUP_RESTORED]: 'backup_restored',
  [AuditAction.SYSTEM_ALERT]: 'system_alert',
  [AuditAction.NOTIFICATION_SENT]: 'notification_sent',
  [AuditAction.NOTIFICATION_BROADCAST]: 'notification_broadcast',
  [AuditAction.EMAIL_SENT]: 'email_sent',
  [AuditAction.EMAIL_FAILED]: 'email_failed',
  [AuditAction.SMS_SENT]: 'sms_sent',
  [AuditAction.SMS_FAILED]: 'sms_failed',
  [AuditAction.FILE_UPLOADED]: 'document_added',
  [AuditAction.FILE_DOWNLOADED]: 'document_downloaded',
  [AuditAction.FILE_DELETED]: 'document_deleted',
  [AuditAction.API_ENDPOINT_ACCESSED]: 'api_accessed',
  [AuditAction.API_RATE_LIMITED]: 'api_rate_limited',
  [AuditAction.API_ERROR]: 'api_error'
};

export const BADGE_MAPPING: Record<string, string[]> = {
  'transfer_created': ['new', 'transfer'],
  'transfer_approved': ['approved', 'status_change'],
  'transfer_rejected': ['rejected', 'status_change'],
  'transfer_completed': ['completed', 'status_change'],
  'transfer_cancelled': ['cancelled', 'status_change'],
  'document_added': ['document', 'upload'],
  'document_downloaded': ['document', 'download'],
  'document_deleted': ['document', 'delete'],
  'user_login': ['authentication', 'login'],
  'user_logout': ['authentication', 'logout'],
  'password_changed': ['security', 'password'],
  'account_locked': ['security', 'locked'],
  'suspicious_activity': ['security', 'alert'],
  'notification_sent': ['notification', 'sent'],
  'system_maintenance': ['system', 'maintenance'],
  'api_error': ['error', 'api']
};

export const TAG_MAPPING: Record<string, string[]> = {
  'transfer_created': ['transfer', 'creation'],
  'transfer_approved': ['transfer', 'approval', 'status'],
  'transfer_rejected': ['transfer', 'rejection', 'status'],
  'transfer_completed': ['transfer', 'completion', 'status'],
  'transfer_cancelled': ['transfer', 'cancellation', 'status'],
  'document_added': ['document', 'file', 'upload'],
  'document_downloaded': ['document', 'file', 'download'],
  'document_deleted': ['document', 'file', 'delete'],
  'user_login': ['authentication', 'security'],
  'user_logout': ['authentication', 'security'],
  'password_changed': ['security', 'authentication'],
  'account_locked': ['security', 'authentication'],
  'suspicious_activity': ['security', 'alert', 'monitoring'],
  'notification_sent': ['communication', 'notification'],
  'system_maintenance': ['system', 'infrastructure'],
  'api_error': ['error', 'technical', 'api']
};


