import { Request } from 'express';
import { AuditAction, AuditCategory, ActorType, RiskLevel, TargetResourceType } from '@/models/AuditLog';

/**
 * Base audit context interface with common fields
 */
export interface BaseAuditContext {
  // Actor information
  actorId: string;
  actorType: ActorType;
  actorEmail?: string;
  actorName?: string;
  actorRole?: string;
  
  // Action details
  action: AuditAction;
  description: string;
  
  // Target resource
  targetResourceId?: string;
  targetResourceType?: TargetResourceType;
  targetResourceName?: string;
  
  // Additional context
  metadata?: Record<string, any>;
  reason?: string;
  details?: Record<string, any>;
  
  // Security context
  riskLevel?: RiskLevel;
  isSensitive?: boolean;
  requiresReview?: boolean;
  
  // Request information
  requestInfo?: {
    ipAddress?: string;
    userAgent?: string;
    method?: string;
    endpoint?: string;
    requestId?: string;
    sessionId?: string;
    deviceFingerprint?: string;
  };
  
  // Outcome
  success?: boolean;
  errorMessage?: string;
  errorCode?: string;
}

/**
 * User management audit context
 */
export interface UserAuditContext extends BaseAuditContext {
  action: 
    | AuditAction.USER_CREATED
    | AuditAction.USER_UPDATED
    | AuditAction.USER_DELETED
    | AuditAction.USER_SUSPENDED
    | AuditAction.USER_ACTIVATED
    | AuditAction.USER_APPROVED
    | AuditAction.USER_REJECTED
    | AuditAction.USER_PROFILE_VIEWED
    | AuditAction.USER_DATA_EXPORTED;
  
  targetResourceType: TargetResourceType.USER;
  targetResourceId: string; // User ID
  targetResourceName?: string; // User name/email
  
  // User-specific metadata
  metadata?: {
    userType?: string;
    status?: string;
    permissions?: string[];
    userEmail?: string;
    changes?: {
      before?: any;
      after?: any;
      fields?: string[];
    };
    [key: string]: any; // Allow additional fields for backward compatibility
  };
}

/**
 * Transfer management audit context
 */
export interface TransferAuditContext extends BaseAuditContext {
  action:
    | AuditAction.TRANSFER_CREATED
    | AuditAction.TRANSFER_UPDATED
    | AuditAction.TRANSFER_DELETED
    | AuditAction.TRANSFER_CANCELLED
    | AuditAction.TRANSFER_APPROVED
    | AuditAction.TRANSFER_REJECTED
    | AuditAction.TRANSFER_COMPLETED
    | AuditAction.TRANSFER_REASSIGNED
    | AuditAction.BULK_TRANSFER_OPERATION;
  
  targetResourceType: TargetResourceType.TRANSFER;
  targetResourceId: string; // Transfer ID
  targetResourceName?: string; // Transfer description
  
  // Transfer-specific metadata
  metadata?: {
    transferStatus?: string;
    priority?: string;
    assignedTo?: string;
    patientId?: string;
    fromHospital?: string;
    toHospital?: string;
    timelineEventId?: string;
    timelineEventType?: string;
    changes?: {
      before?: any;
      after?: any;
      fields?: string[];
    };
    [key: string]: any; // Allow additional fields for backward compatibility
  };
}

/**
 * Patient management audit context
 */
export interface PatientAuditContext extends BaseAuditContext {
  action:
    | AuditAction.PATIENT_CREATED
    | AuditAction.PATIENT_UPDATED
    | AuditAction.PATIENT_DELETED
    | AuditAction.PATIENT_VIEWED
    | AuditAction.PATIENT_MERGED;
  
  targetResourceType: TargetResourceType.PATIENT;
  targetResourceId: string; // Patient ID
  targetResourceName?: string; // Patient name
  
  // Patient-specific metadata
  metadata?: {
    dossierNumber?: string;
    age?: number;
    searchQuery?: string;
    resultCount?: number;
    page?: number;
    limit?: number;
    changes?: {
      before?: any;
      after?: any;
      fields?: string[];
    };
    [key: string]: any; // Allow additional fields for backward compatibility
  };
}

/**
 * Authentication audit context
 */
export interface AuditAuthContext extends BaseAuditContext {
  action:
    | AuditAction.LOGIN_SUCCESS
    | AuditAction.LOGIN_FAILED
    | AuditAction.LOGOUT
    | AuditAction.PASSWORD_CHANGED
    | AuditAction.PASSWORD_RESET
    | AuditAction.ACCOUNT_LOCKED
    | AuditAction.ACCOUNT_UNLOCKED
    | AuditAction.PERMISSION_CHANGED
    | AuditAction.SESSION_CREATED
    | AuditAction.SESSION_REVOKED
    | AuditAction.SUSPICIOUS_ACTIVITY;
  
  targetResourceType?: TargetResourceType.USER | TargetResourceType.SESSION;
  targetResourceId?: string; // User ID or Session ID
  
  // Auth-specific metadata
  metadata?: {
    loginAttempts?: number;
    lockoutReason?: string;
    sessionDuration?: number;
    suspiciousActivityType?: string;
    deviceInfo?: string;
    sessionId?: string;
    lastLogin?: any;
    [key: string]: any; // Allow additional fields for backward compatibility
  };
}

/**
 * Communication audit context
 */
export interface CommunicationAuditContext extends BaseAuditContext {
  action:
    | AuditAction.EMAIL_SENT
    | AuditAction.EMAIL_FAILED
    | AuditAction.SMS_SENT
    | AuditAction.SMS_FAILED
    | AuditAction.NOTIFICATION_SENT
    | AuditAction.NOTIFICATION_BROADCAST;
  
  targetResourceType?: TargetResourceType.USER | TargetResourceType.NOTIFICATION;
  targetResourceId?: string; // Recipient user ID or notification ID
  
  // Communication-specific metadata
  metadata?: {
    recipientEmail?: string;
    recipientPhone?: string;
    messageType?: string;
    deliveryStatus?: string;
    failureReason?: string;
    retryCount?: number;
    channel?: 'email' | 'sms' | 'push' | 'in_app';
  };
}

/**
 * File operation audit context
 */
export interface FileAuditContext extends BaseAuditContext {
  action:
    | AuditAction.FILE_UPLOADED
    | AuditAction.FILE_DOWNLOADED
    | AuditAction.FILE_DELETED;
  
  targetResourceType: TargetResourceType.FILE;
  targetResourceId: string; // File ID
  targetResourceName?: string; // File name
  
  // File-specific metadata
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    mimeType?: string;
    uploadPath?: string;
    downloadCount?: number;
  };
}

/**
 * Data access audit context
 */
export interface DataAccessAuditContext extends BaseAuditContext {
  action:
    | AuditAction.DATA_VIEWED
    | AuditAction.DATA_EXPORTED
    | AuditAction.DATA_IMPORTED
    | AuditAction.REPORT_GENERATED
    | AuditAction.BULK_DATA_ACCESS;
  
  targetResourceType?: TargetResourceType.REPORT | TargetResourceType.SYSTEM;
  targetResourceId?: string; // Report ID or system component
  
  // Data access-specific metadata
  metadata?: {
    dataType?: string;
    recordCount?: number;
    exportFormat?: string;
    accessLevel?: string;
    filters?: Record<string, any>;
    searchCriteria?: string;
  };
}

/**
 * System event audit context
 */
export interface SystemAuditContext extends BaseAuditContext {
  action:
    | AuditAction.SETTINGS_UPDATED
    | AuditAction.SYSTEM_MAINTENANCE
    | AuditAction.BACKUP_CREATED
    | AuditAction.BACKUP_RESTORED
    | AuditAction.SYSTEM_ALERT
    | AuditAction.API_ENDPOINT_ACCESSED
    | AuditAction.API_RATE_LIMITED
    | AuditAction.API_ERROR;
  
  targetResourceType?: TargetResourceType.SYSTEM | TargetResourceType.API;
  targetResourceId?: string; // System component or API endpoint
  
  // System-specific metadata
  metadata?: {
    systemComponent?: string;
    maintenanceType?: string;
    backupSize?: number;
    alertType?: string;
    apiEndpoint?: string;
    responseTime?: number;
    errorCode?: string;
  };
}

/**
 * Request information interface
 */
export interface AuditRequestInfo {
  ipAddress: string;
  userAgent: string;
  method?: string | undefined;
  endpoint?: string | undefined;
  requestId?: string | undefined;
  sessionId?: string | undefined;
  deviceFingerprint?: string | undefined;
}

/**
 * Audit log data interface for internal use
 */
export interface AuditLogData {
  // Actor information
  actorId: string;
  actorType: ActorType;
  actorEmail?: string | undefined;
  actorName?: string | undefined;
  actorRole?: string | undefined;
  
  // Action details
  action: AuditAction;
  category: AuditCategory;
  description: string;
  
  // Target resource
  targetResource?: {
    type: TargetResourceType;
    id: string;
    name?: string | undefined;
    metadata?: Record<string, any> | undefined;
  } | undefined;
  
  // Change tracking
  changes?: {
    before?: any;
    after?: any;
    fields?: string[];
    changeSummary?: string;
  } | undefined;
  
  // Context
  context?: Record<string, any> | undefined;
  
  // Request information
  requestInfo?: AuditRequestInfo | undefined;
  
  // Security context
  securityContext?: {
    riskLevel: RiskLevel;
    isSensitive: boolean;
    requiresReview: boolean;
    securityFlags?: string[];
    riskScore?: number;
    complianceFlags?: string[];
  } | undefined;
  
  // Outcome
  outcome: 'success' | 'failure' | 'partial';
  errorMessage?: string | undefined;
  errorCode?: string | undefined;
  
  // Timing
  timestamp: Date;
  duration?: number | undefined;
  timezone?: string | undefined;
  
  // Additional flags
  isAutomated?: boolean | undefined;
  isBulkOperation?: boolean | undefined;
  parentAuditId?: string | undefined;
}
