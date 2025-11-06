/**
 * Timeline Types
 * 
 * Timeline-related types for transfers.
 */

import { AuditAction, AuditCategory, ActorType, RiskLevel } from '@/models/AuditLog';

// Timeline item interface for UI display
export interface TimelineItem {
  // Identifiers
  timelineItemId: string;        // AuditLog._id
  transferId: string;           // targetResource.id
  
  // Event Details
  kind: string;                 // derived from action
  title: string;                // human-readable title
  description: string;          // detailed description
  timestamp: Date;              // when it happened
  order: number;                // sequence for stable sorting
  
  // Actor Information
  actor: {
    id: string;                 // actorId
    type: ActorType;            // actorType
    name: string;               // actorName
    email: string;              // actorEmail
    role: string;               // actorRole
  };
  
  // Change Information
  diff?: {
    before: any;                // changes.before
    after: any;                // changes.after
    fields: string[];           // changes.fields
    summary: string;            // changes.changeSummary
  };
  
  // Status Information
  statusAfter?: string;         // new status after this event
  assignedToAfter?: string;     // new assignee after this event
  
  // Attachments/Documents
  attachments?: {
    type: string;               // document type
    name: string;               // file name
    size: number;               // file size
    url?: string;               // download URL
  }[];
  
  // UI Enhancements
  badges: string[];             // visual tags
  tags: string[];               // filterable tags
  isSensitive: boolean;        // requires special handling
  requiresReview: boolean;     // needs admin review
}

// Timeline query options
export interface TimelineQueryOptions {
  page?: number;
  limit?: number;
  filters?: {
    // Filter by transfer
    transferId?: string;
    // Filter by user (actor)
    userId?: string;
    // Filter by category
    category?: string;
    // Filter by actor type
    actorId?: string;
    // Filter by event kind
    kind?: string;
    // Date range filters
    startDate?: Date;
    endDate?: Date;
    // Security filters
    isSensitive?: boolean;
    requiresReview?: boolean;
  };
}

// Timeline pagination info
export interface TimelinePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Timeline response
export interface TimelineResponse {
  items: TimelineItem[];
  pagination: TimelinePagination;
}

// Timeline statistics
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

// Recent activity options
export interface RecentActivityOptions {
  limit?: number;
  filters?: {
    actorId?: string;
    category?: AuditCategory;
    isSensitive?: boolean;
  };
}

// Event kind mapping
export const EVENT_KIND_MAPPING: Record<AuditAction, string> = {
  // User Management
  [AuditAction.USER_CREATED]: 'user_created',
  [AuditAction.USER_UPDATED]: 'user_updated',
  [AuditAction.USER_DELETED]: 'user_deleted',
  [AuditAction.USER_SUSPENDED]: 'user_suspended',
  [AuditAction.USER_ACTIVATED]: 'user_activated',
  [AuditAction.USER_APPROVED]: 'user_approved',
  [AuditAction.USER_REJECTED]: 'user_rejected',
  [AuditAction.USER_PROFILE_VIEWED]: 'user_profile_viewed',
  [AuditAction.USER_DATA_EXPORTED]: 'user_data_exported',
  
  // Transfer Management
  [AuditAction.TRANSFER_CREATED]: 'transfer_created',
  [AuditAction.TRANSFER_UPDATED]: 'transfer_updated',
  [AuditAction.TRANSFER_DELETED]: 'transfer_deleted',
  [AuditAction.TRANSFER_CANCELLED]: 'transfer_cancelled',
  [AuditAction.TRANSFER_APPROVED]: 'transfer_approved',
  [AuditAction.TRANSFER_REJECTED]: 'transfer_rejected',
  [AuditAction.TRANSFER_COMPLETED]: 'transfer_completed',
  [AuditAction.TRANSFER_REASSIGNED]: 'transfer_reassigned',
  [AuditAction.BULK_TRANSFER_OPERATION]: 'bulk_transfer_operation',
  
  // Authentication & Security
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
  
  // Data Access
  [AuditAction.DATA_VIEWED]: 'data_viewed',
  [AuditAction.DATA_EXPORTED]: 'data_exported',
  [AuditAction.DATA_IMPORTED]: 'data_imported',
  [AuditAction.REPORT_GENERATED]: 'report_generated',
  [AuditAction.BULK_DATA_ACCESS]: 'bulk_data_access',
  
  // Patient Management
  [AuditAction.PATIENT_CREATED]: 'patient_created',
  [AuditAction.PATIENT_UPDATED]: 'patient_updated',
  [AuditAction.PATIENT_DELETED]: 'patient_deleted',
  [AuditAction.PATIENT_VIEWED]: 'patient_viewed',
  [AuditAction.PATIENT_MERGED]: 'patient_merged',
  
  // System Operations
  [AuditAction.SETTINGS_UPDATED]: 'settings_updated',
  [AuditAction.SYSTEM_MAINTENANCE]: 'system_maintenance',
  [AuditAction.BACKUP_CREATED]: 'backup_created',
  [AuditAction.BACKUP_RESTORED]: 'backup_restored',
  [AuditAction.SYSTEM_ALERT]: 'system_alert',
  
  // Notifications
  [AuditAction.NOTIFICATION_SENT]: 'notification_sent',
  [AuditAction.NOTIFICATION_BROADCAST]: 'notification_broadcast',
  [AuditAction.EMAIL_SENT]: 'email_sent',
  [AuditAction.EMAIL_FAILED]: 'email_failed',
  [AuditAction.SMS_SENT]: 'sms_sent',
  [AuditAction.SMS_FAILED]: 'sms_failed',
  
  // File Operations
  [AuditAction.FILE_UPLOADED]: 'document_added',
  [AuditAction.FILE_DOWNLOADED]: 'document_downloaded',
  [AuditAction.FILE_DELETED]: 'document_deleted',
  
  // API Access
  [AuditAction.API_ENDPOINT_ACCESSED]: 'api_accessed',
  [AuditAction.API_RATE_LIMITED]: 'api_rate_limited',
  [AuditAction.API_ERROR]: 'api_error'
};

// Badge mapping for different event types
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

// Tag mapping for filtering
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

