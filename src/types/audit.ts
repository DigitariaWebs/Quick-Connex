/**
 * Audit Types
 * 
 * Audit log system types and interfaces.
 */

import { NextRequest } from 'next/server';
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
 * Authentication audit context
 * 
 * Specialized context for authentication and security-related audit events.
 * Extends BaseAuditContext with auth-specific action types and metadata.
 */
export interface AuthAuditContext extends BaseAuditContext {
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
  targetResourceName?: string; // User email or session identifier
  
  // Auth-specific metadata
  metadata?: {
    loginAttempts?: number;
    lockoutReason?: string;
    sessionDuration?: number;
    suspiciousActivityType?: string;
    deviceInfo?: string;
    sessionId?: string;
    lastLogin?: any;
    ipAddress?: string;
    userAgent?: string;
    riskScore?: number;
    securityFlags?: string[];
    [key: string]: any; // Allow additional fields for backward compatibility
  };
}

/**
 * Authentication audit context (legacy alias for backward compatibility)
 * @deprecated Use AuthAuditContext instead
 */
export type AuditAuthContext = AuthAuditContext;

/**
 * Request information interface
 */
export interface AuditRequestInfo {
  ipAddress: string;
  userAgent: string;
  method?: string;
  endpoint?: string;
  requestId?: string;
  sessionId?: string;
  deviceFingerprint?: string;
}

/**
 * Audit log data interface for internal use
 */
export interface AuditLogData {
  // Actor information
  actorId: string;
  actorType: ActorType;
  actorEmail?: string;
  actorName?: string;
  actorRole?: string;
  
  // Action details
  action: AuditAction;
  category: AuditCategory;
  description: string;
  
  // Target resource
  targetResource?: {
    type: TargetResourceType;
    id: string;
    name?: string;
    metadata?: Record<string, any>;
  };
  
  // Change tracking
  changes?: {
    before?: any;
    after?: any;
    fields?: string[];
    changeSummary?: string;
  };
  
  // Context
  context?: Record<string, any>;
  
  // Request information
  requestInfo?: AuditRequestInfo;
  
  // Security context
  securityContext?: {
    riskLevel: RiskLevel;
    isSensitive: boolean;
    requiresReview: boolean;
    securityFlags?: string[];
    riskScore?: number;
    complianceFlags?: string[];
  };
  
  // Outcome
  outcome: 'success' | 'failure' | 'partial';
  errorMessage?: string;
  errorCode?: string;
  
  // Timing
  timestamp: Date;
  duration?: number;
  timezone?: string;
  
  // Additional flags
  isAutomated?: boolean;
  isBulkOperation?: boolean;
  parentAuditId?: string;
}

// Re-export from models for convenience
export type { ActorType, AuditCategory, AuditAction, TargetResourceType, RiskLevel } from '@/models/AuditLog';

