import { NextRequest } from 'next/server';
import { DatabaseService } from '@/lib/database';
import AuditLog from '@/models/AuditLog';
import { log } from '@/lib/logging';
import { 
  AuditAction, 
  AuditCategory, 
  ActorType, 
  RiskLevel, 
  TargetResourceType 
} from '@/models/AuditLog';
import {
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
} from './types';
import {
  extractRequestInfo,
  extractAuditIpAddress,
  enrichAuditContext,
  formatChangesForAudit,
  assessAuditRiskLevel,
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
} from '../utils';
import {
  AUDIT_CATEGORIES,
  HIGH_RISK_ACTIONS,
  IMMEDIATE_REVIEW_ACTIONS,
  ADMIN_APPROVAL_ACTIONS,
  SENSITIVE_FIELDS_BY_RESOURCE,
  AUDIT_LOG_LEVELS
} from './constants';
import {
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

/**
 * Centralized Audit Service
 * 
 * Provides unified audit logging for all system activities with async processing,
 * error recovery, and comprehensive event coverage.
 */
export class AuditService {
  /**
   * Core audit logging method (universal - accepts any audit data)
   */
  static async logAudit(data: AuditLogData): Promise<void> {
    try {
      // Ensure requestInfo always has required fields
      const requestInfo = data.requestInfo || {
        ipAddress: 'unknown',
        userAgent: 'unknown'
      };
      
      // Ensure securityContext has required fields
      const securityContext = data.securityContext || {
        riskLevel: RiskLevel.LOW,
        isSensitive: false,
        requiresReview: false
      };
      
      const auditLog = new AuditLog({
        // Actor information
        actorId: data.actorId,
        actorType: data.actorType,
        actorEmail: data.actorEmail,
        actorName: data.actorName,
        actorRole: data.actorRole,
        
        // Action details
        action: data.action,
        category: data.category,
        description: data.description,
        
        // Target resource
        targetResource: data.targetResource,
        
        // Change tracking
        changes: data.changes,
        
        // Context
        context: data.context,
        
        // Request information - ensure required fields are present
        requestInfo: {
          ipAddress: requestInfo.ipAddress || 'unknown',
          userAgent: requestInfo.userAgent || 'unknown',
          method: requestInfo.method,
          endpoint: requestInfo.endpoint,
          requestId: requestInfo.requestId,
          sessionId: requestInfo.sessionId,
          deviceFingerprint: requestInfo.deviceFingerprint
        },
        
        // Security context - ensure required fields are present
        securityContext: {
          riskLevel: securityContext.riskLevel || RiskLevel.LOW,
          isSensitive: securityContext.isSensitive || false,
          requiresReview: securityContext.requiresReview || false,
          securityFlags: securityContext.securityFlags || [],
          riskScore: securityContext.riskScore,
          complianceFlags: securityContext.complianceFlags || []
        },
        
        // Outcome
        outcome: data.outcome,
        errorMessage: data.errorMessage,
        errorCode: data.errorCode,
        
        // Timing
        timestamp: data.timestamp,
        duration: data.duration,
        timezone: data.timezone || 'UTC',
        
        // Additional flags
        isAutomated: data.isAutomated || false,
        isBulkOperation: data.isBulkOperation || false,
        parentAuditId: data.parentAuditId
      });
      
      const auditDataObject = auditLog.toObject();
      await DatabaseService.create(AuditLog, auditDataObject);
    } catch (error) {
      log.error('Failed to save audit log', error, {
        operation: 'save_audit_log',
        actorId: data.actorId,
        action: data.action,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      // Could implement retry queue here
      throw error;
    }
  }

  /**
   * Log user management actions
   */
  static async logUserAction(context: UserAuditContext): Promise<void> {
    const auditData: AuditLogData = {
      actorId: context.actorId,
      actorType: context.actorType,
      actorEmail: context.actorEmail,
      actorName: context.actorName,
      actorRole: context.actorRole,
      action: context.action,
      category: AuditCategory.USER_MANAGEMENT,
      description: context.description,
      targetResource: {
        type: context.targetResourceType,
        id: context.targetResourceId,
        name: context.targetResourceName,
        metadata: context.metadata
      },
      changes: context.metadata?.changes,
      context: {
        reason: context.reason,
        details: context.details,
        ...context.metadata
      },
      requestInfo: context.requestInfo ? {
        ipAddress: context.requestInfo.ipAddress || 'unknown',
        userAgent: context.requestInfo.userAgent || 'unknown',
        method: context.requestInfo.method,
        endpoint: context.requestInfo.endpoint,
        requestId: context.requestInfo.requestId,
        sessionId: context.requestInfo.sessionId,
        deviceFingerprint: context.requestInfo.deviceFingerprint
      } : {
        ipAddress: 'unknown',
        userAgent: 'unknown'
      },
      securityContext: {
        riskLevel: context.riskLevel || this.assessAuditRiskLevel(context.action),
        isSensitive: context.isSensitive || false,
        requiresReview: context.requiresReview || false,
        securityFlags: this.getSecurityFlags(context.action),
        riskScore: this.getRiskScore(context.action)
      },
      outcome: context.success !== false ? 'success' : 'failure',
      errorMessage: context.errorMessage,
      errorCode: context.errorCode,
      timestamp: new Date(),
      isAutomated: false,
      isBulkOperation: context.action === AuditAction.USER_DATA_EXPORTED
    };

    // Fire and forget with error handling
    this.logAudit(auditData).catch(err => {
      log.error('Failed to log user action', err, {
        operation: 'log_user_action',
        actorId: context.actorId,
        action: context.action
      });
    });
  }

  /**
   * Log transfer management actions
   */
  static async logTransferAction(context: TransferAuditContext): Promise<void> {
    const auditData: AuditLogData = {
      actorId: context.actorId,
      actorType: context.actorType,
      actorEmail: context.actorEmail,
      actorName: context.actorName,
      actorRole: context.actorRole,
      action: context.action,
      category: AuditCategory.TRANSFER_MANAGEMENT,
      description: context.description,
      targetResource: {
        type: context.targetResourceType,
        id: context.targetResourceId,
        name: context.targetResourceName,
        metadata: context.metadata
      },
      changes: context.metadata?.changes,
      context: {
        reason: context.reason,
        details: context.details,
        ...context.metadata
      },
      requestInfo: context.requestInfo ? {
        ipAddress: context.requestInfo.ipAddress || 'unknown',
        userAgent: context.requestInfo.userAgent || 'unknown',
        method: context.requestInfo.method,
        endpoint: context.requestInfo.endpoint,
        requestId: context.requestInfo.requestId,
        sessionId: context.requestInfo.sessionId,
        deviceFingerprint: context.requestInfo.deviceFingerprint
      } : {
        ipAddress: 'unknown',
        userAgent: 'unknown'
      },
      securityContext: {
        riskLevel: context.riskLevel || this.assessAuditRiskLevel(context.action),
        isSensitive: context.isSensitive || false,
        requiresReview: context.requiresReview || false,
        securityFlags: this.getSecurityFlags(context.action),
        riskScore: this.getRiskScore(context.action)
      },
      outcome: context.success !== false ? 'success' : 'failure',
      errorMessage: context.errorMessage,
      errorCode: context.errorCode,
      timestamp: new Date(),
      isAutomated: false,
      isBulkOperation: context.action === AuditAction.BULK_TRANSFER_OPERATION
    };

    this.logAudit(auditData).catch(err => {
      log.error('Failed to log transfer action', err, {
        operation: 'log_transfer_action',
        actorId: context.actorId,
        action: context.action
      });
    });
  }

  /**
   * Log patient management actions
   */
  static async logPatientAction(context: PatientAuditContext): Promise<void> {
    const auditData: AuditLogData = {
      actorId: context.actorId,
      actorType: context.actorType,
      actorEmail: context.actorEmail,
      actorName: context.actorName,
      actorRole: context.actorRole,
      action: context.action,
      category: AuditCategory.PATIENT_MANAGEMENT,
      description: context.description,
      targetResource: {
        type: context.targetResourceType,
        id: context.targetResourceId,
        name: context.targetResourceName,
        metadata: context.metadata
      },
      changes: context.metadata?.changes,
      context: {
        reason: context.reason,
        details: context.details,
        ...context.metadata
      },
      requestInfo: context.requestInfo ? {
        ipAddress: context.requestInfo.ipAddress || 'unknown',
        userAgent: context.requestInfo.userAgent || 'unknown',
        method: context.requestInfo.method,
        endpoint: context.requestInfo.endpoint,
        requestId: context.requestInfo.requestId,
        sessionId: context.requestInfo.sessionId,
        deviceFingerprint: context.requestInfo.deviceFingerprint
      } : {
        ipAddress: 'unknown',
        userAgent: 'unknown'
      },
      securityContext: {
        riskLevel: context.riskLevel || this.assessAuditRiskLevel(context.action),
        isSensitive: context.isSensitive || true, // Patient data is always sensitive
        requiresReview: context.requiresReview || context.action === AuditAction.PATIENT_DELETED,
        securityFlags: this.getSecurityFlags(context.action),
        riskScore: this.getRiskScore(context.action)
      },
      outcome: context.success !== false ? 'success' : 'failure',
      errorMessage: context.errorMessage,
      errorCode: context.errorCode,
      timestamp: new Date(),
      isAutomated: false,
      isBulkOperation: false
    };

    this.logAudit(auditData).catch(err => {
      log.error('Failed to log patient action', err, {
        operation: 'log_patient_action',
        actorId: context.actorId,
        action: context.action
      });
    });
  }

  /**
   * Log authentication actions
   */
  static async logAuthAction(context: AuditAuthContext): Promise<void> {
    const auditData: AuditLogData = {
      actorId: context.actorId,
      actorType: context.actorType,
      actorEmail: context.actorEmail,
      actorName: context.actorName,
      actorRole: context.actorRole,
      action: context.action,
      category: AuditCategory.AUTHENTICATION,
      description: context.description,
      targetResource: context.targetResourceId ? {
        type: context.targetResourceType || TargetResourceType.USER,
        id: context.targetResourceId,
        metadata: context.metadata
      } : undefined,
      context: {
        reason: context.reason,
        details: context.details,
        ...context.metadata
      },
      requestInfo: context.requestInfo ? {
        ipAddress: context.requestInfo.ipAddress || 'unknown',
        userAgent: context.requestInfo.userAgent || 'unknown',
        method: context.requestInfo.method,
        endpoint: context.requestInfo.endpoint,
        requestId: context.requestInfo.requestId,
        sessionId: context.requestInfo.sessionId,
        deviceFingerprint: context.requestInfo.deviceFingerprint
      } : {
        ipAddress: 'unknown',
        userAgent: 'unknown'
      },
      securityContext: {
        riskLevel: context.riskLevel || this.assessAuditRiskLevel(context.action),
        isSensitive: context.isSensitive || context.action === AuditAction.SUSPICIOUS_ACTIVITY,
        requiresReview: context.requiresReview || context.action === AuditAction.SUSPICIOUS_ACTIVITY,
        securityFlags: this.getSecurityFlags(context.action),
        riskScore: this.getRiskScore(context.action)
      },
      outcome: context.success !== false ? 'success' : 'failure',
      errorMessage: context.errorMessage,
      errorCode: context.errorCode,
      timestamp: new Date(),
      isAutomated: false,
      isBulkOperation: false
    };

    this.logAudit(auditData).catch(err => {
      log.error('Failed to log auth action', err, {
        operation: 'log_auth_action',
        actorId: context.actorId,
        action: context.action
      });
    });
  }

  /**
   * Log communication actions
   */
  static async logCommunication(context: CommunicationAuditContext): Promise<void> {
    const auditData: AuditLogData = {
      actorId: context.actorId,
      actorType: context.actorType,
      actorEmail: context.actorEmail,
      actorName: context.actorName,
      actorRole: context.actorRole,
      action: context.action,
      category: AuditCategory.COMMUNICATION,
      description: context.description,
      targetResource: context.targetResourceId ? {
        type: context.targetResourceType || TargetResourceType.USER,
        id: context.targetResourceId,
        metadata: context.metadata
      } : undefined,
      context: {
        reason: context.reason,
        details: context.details,
        ...context.metadata
      },
      requestInfo: context.requestInfo ? {
        ipAddress: context.requestInfo.ipAddress || 'unknown',
        userAgent: context.requestInfo.userAgent || 'unknown',
        method: context.requestInfo.method,
        endpoint: context.requestInfo.endpoint,
        requestId: context.requestInfo.requestId,
        sessionId: context.requestInfo.sessionId,
        deviceFingerprint: context.requestInfo.deviceFingerprint
      } : {
        ipAddress: 'unknown',
        userAgent: 'unknown'
      },
      securityContext: {
        riskLevel: context.riskLevel || this.assessAuditRiskLevel(context.action),
        isSensitive: context.isSensitive || false,
        requiresReview: context.requiresReview || false,
        securityFlags: this.getSecurityFlags(context.action),
        riskScore: this.getRiskScore(context.action)
      },
      outcome: context.success !== false ? 'success' : 'failure',
      errorMessage: context.errorMessage,
      errorCode: context.errorCode,
      timestamp: new Date(),
      isAutomated: false,
      isBulkOperation: context.action === AuditAction.NOTIFICATION_BROADCAST
    };

    this.logAudit(auditData).catch(err => {
      log.error('Failed to log communication', err, {
        operation: 'log_communication',
        actorId: context.actorId,
        action: context.action
      });
    });
  }

  /**
   * Log file operations
   */
  static async logFileOperation(context: FileAuditContext): Promise<void> {
    const auditData: AuditLogData = {
      actorId: context.actorId,
      actorType: context.actorType,
      actorEmail: context.actorEmail,
      actorName: context.actorName,
      actorRole: context.actorRole,
      action: context.action,
      category: AuditCategory.FILE_OPERATION,
      description: context.description,
      targetResource: {
        type: context.targetResourceType,
        id: context.targetResourceId,
        name: context.targetResourceName,
        metadata: context.metadata
      },
      context: {
        reason: context.reason,
        details: context.details,
        ...context.metadata
      },
      requestInfo: context.requestInfo ? {
        ipAddress: context.requestInfo.ipAddress || 'unknown',
        userAgent: context.requestInfo.userAgent || 'unknown',
        method: context.requestInfo.method,
        endpoint: context.requestInfo.endpoint,
        requestId: context.requestInfo.requestId,
        sessionId: context.requestInfo.sessionId,
        deviceFingerprint: context.requestInfo.deviceFingerprint
      } : {
        ipAddress: 'unknown',
        userAgent: 'unknown'
      },
      securityContext: {
        riskLevel: context.riskLevel || this.assessAuditRiskLevel(context.action),
        isSensitive: context.isSensitive || false,
        requiresReview: context.requiresReview || false,
        securityFlags: this.getSecurityFlags(context.action),
        riskScore: this.getRiskScore(context.action)
      },
      outcome: context.success !== false ? 'success' : 'failure',
      errorMessage: context.errorMessage,
      errorCode: context.errorCode,
      timestamp: new Date(),
      isAutomated: false,
      isBulkOperation: false
    };

    this.logAudit(auditData).catch(err => {
      log.error('Failed to log file operation', err, {
        operation: 'log_file_operation',
        actorId: context.actorId,
        action: context.action
      });
    });
  }

  /**
   * Log data access actions
   */
  static async logDataAccess(context: DataAccessAuditContext): Promise<void> {
    const auditData: AuditLogData = {
      actorId: context.actorId,
      actorType: context.actorType,
      actorEmail: context.actorEmail,
      actorName: context.actorName,
      actorRole: context.actorRole,
      action: context.action,
      category: AuditCategory.DATA_ACCESS,
      description: context.description,
      targetResource: context.targetResourceId ? {
        type: context.targetResourceType || TargetResourceType.REPORT,
        id: context.targetResourceId,
        metadata: context.metadata
      } : undefined,
      context: {
        reason: context.reason,
        details: context.details,
        ...context.metadata
      },
      requestInfo: context.requestInfo ? {
        ipAddress: context.requestInfo.ipAddress || 'unknown',
        userAgent: context.requestInfo.userAgent || 'unknown',
        method: context.requestInfo.method,
        endpoint: context.requestInfo.endpoint,
        requestId: context.requestInfo.requestId,
        sessionId: context.requestInfo.sessionId,
        deviceFingerprint: context.requestInfo.deviceFingerprint
      } : {
        ipAddress: 'unknown',
        userAgent: 'unknown'
      },
      securityContext: {
        riskLevel: context.riskLevel || this.assessAuditRiskLevel(context.action),
        isSensitive: context.isSensitive || true, // Data access is sensitive
        requiresReview: context.requiresReview || context.action === AuditAction.DATA_EXPORTED,
        securityFlags: this.getSecurityFlags(context.action),
        riskScore: this.getRiskScore(context.action)
      },
      outcome: context.success !== false ? 'success' : 'failure',
      errorMessage: context.errorMessage,
      errorCode: context.errorCode,
      timestamp: new Date(),
      isAutomated: false,
      isBulkOperation: context.action === AuditAction.BULK_DATA_ACCESS
    };

    this.logAudit(auditData).catch(err => {
      log.error('Failed to log data access', err, {
        operation: 'log_data_access',
        actorId: context.actorId,
        action: context.action
      });
    });
  }

  /**
   * Log system events
   */
  static async logSystemEvent(context: SystemAuditContext): Promise<void> {
    const auditData: AuditLogData = {
      actorId: context.actorId,
      actorType: context.actorType,
      actorEmail: context.actorEmail,
      actorName: context.actorName,
      actorRole: context.actorRole,
      action: context.action,
      category: this.determineCategory(context.action),
      description: context.description,
      targetResource: context.targetResourceId ? {
        type: context.targetResourceType || TargetResourceType.SYSTEM,
        id: context.targetResourceId,
        metadata: context.metadata
      } : undefined,
      context: {
        reason: context.reason,
        details: context.details,
        ...context.metadata
      },
      requestInfo: context.requestInfo ? {
        ipAddress: context.requestInfo.ipAddress || 'unknown',
        userAgent: context.requestInfo.userAgent || 'unknown',
        method: context.requestInfo.method,
        endpoint: context.requestInfo.endpoint,
        requestId: context.requestInfo.requestId,
        sessionId: context.requestInfo.sessionId,
        deviceFingerprint: context.requestInfo.deviceFingerprint
      } : {
        ipAddress: 'unknown',
        userAgent: 'unknown'
      },
      securityContext: {
        riskLevel: context.riskLevel || this.assessAuditRiskLevel(context.action),
        isSensitive: context.isSensitive || false,
        requiresReview: context.requiresReview || false,
        securityFlags: this.getSecurityFlags(context.action),
        riskScore: this.getRiskScore(context.action)
      },
      outcome: context.success !== false ? 'success' : 'failure',
      errorMessage: context.errorMessage,
      errorCode: context.errorCode,
      timestamp: new Date(),
      isAutomated: context.action === AuditAction.SYSTEM_MAINTENANCE,
      isBulkOperation: false
    };

    this.logAudit(auditData).catch(err => {
      log.error('Failed to log system event', err, {
        operation: 'log_system_event',
        actorId: context.actorId,
        action: context.action
      });
    });
  }

  /**
   * Extract request information from NextRequest
   */
  static extractRequestInfo(request: NextRequest): AuditRequestInfo {
    const ipAddress = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const method = request.method;
    const endpoint = new URL(request.url).pathname;
    const requestId = request.headers.get('x-request-id') || undefined;
    const sessionId = request.headers.get('x-session-id') || undefined;
    const deviceFingerprint = request.headers.get('x-device-fingerprint') || undefined;

    return {
      ipAddress,
      userAgent,
      method,
      endpoint,
      requestId,
      sessionId,
      deviceFingerprint
    };
  }

  /**
   * Assess risk level based on action type
   */
  static assessAuditRiskLevel(action: AuditAction, metadata?: any): RiskLevel {
    const highRiskActions = [
      AuditAction.USER_DELETED,
      AuditAction.USER_SUSPENDED,
      AuditAction.PATIENT_DELETED,
      AuditAction.TRANSFER_DELETED,
      AuditAction.DATA_EXPORTED,
      AuditAction.USER_DATA_EXPORTED,
      AuditAction.SUSPICIOUS_ACTIVITY,
      AuditAction.ACCOUNT_LOCKED
    ];

    const mediumRiskActions = [
      AuditAction.USER_UPDATED,
      AuditAction.PATIENT_UPDATED,
      AuditAction.TRANSFER_UPDATED,
      AuditAction.TRANSFER_REASSIGNED,
      AuditAction.PERMISSION_CHANGED,
      AuditAction.PASSWORD_CHANGED,
      AuditAction.REPORT_GENERATED
    ];

    if (highRiskActions.includes(action)) {
      return RiskLevel.HIGH;
    } else if (mediumRiskActions.includes(action)) {
      return RiskLevel.MEDIUM;
    } else {
      return RiskLevel.LOW;
    }
  }

  /**
   * Determine audit category from action
   */
  static determineCategory(action: AuditAction): AuditCategory {
    if (action.startsWith('user_')) return AuditCategory.USER_MANAGEMENT;
    if (action.startsWith('transfer_')) return AuditCategory.TRANSFER_MANAGEMENT;
    if (action.startsWith('patient_')) return AuditCategory.PATIENT_MANAGEMENT;
    if (action.startsWith('login_') || action.startsWith('logout') || action.startsWith('password_') || 
        action.startsWith('account_') || action.startsWith('session_') || action.startsWith('suspicious_')) {
      return AuditCategory.AUTHENTICATION;
    }
    if (action.startsWith('data_') || action.startsWith('report_') || action.startsWith('bulk_')) {
      return AuditCategory.DATA_ACCESS;
    }
    if (action.startsWith('file_')) return AuditCategory.FILE_OPERATION;
    if (action.startsWith('email_') || action.startsWith('sms_') || action.startsWith('notification_')) {
      return AuditCategory.COMMUNICATION;
    }
    if (action.startsWith('api_') || action.startsWith('system_') || action.startsWith('backup_') || 
        action.startsWith('settings_')) {
      return AuditCategory.SYSTEM_CONFIGURATION;
    }
    return AuditCategory.SECURITY;
  }

  /**
   * Get security flags for an action
   */
  private static getSecurityFlags(action: AuditAction): string[] {
    const flags: string[] = [];
    
    if (action.includes('DELETE') || action.includes('DELETED')) {
      flags.push('destructive_action');
    }
    if (action.includes('EXPORT') || action.includes('EXPORTED')) {
      flags.push('data_export');
    }
    if (action.includes('SUSPICIOUS') || action.includes('FAILED')) {
      flags.push('security_concern');
    }
    if (action.includes('BULK') || action.includes('BULK')) {
      flags.push('bulk_operation');
    }
    
    return flags;
  }

  /**
   * Get risk score for an action (0-100)
   */
  private static getRiskScore(action: AuditAction): number {
    const riskLevel = this.assessAuditRiskLevel(action);
    switch (riskLevel) {
      case RiskLevel.CRITICAL: return 90;
      case RiskLevel.HIGH: return 75;
      case RiskLevel.MEDIUM: return 50;
      case RiskLevel.LOW: return 25;
      default: return 25;
    }
  }

  /**
   * Map timeline event type to audit action
   */
  static mapTimelineTypeToAuditAction(timelineType: string): AuditAction {
    const mapping: Record<string, AuditAction> = {
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
    
    return mapping[timelineType] || AuditAction.TRANSFER_UPDATED;
  }

  /**
   * Map timeline event type to audit category
   */
  static mapTimelineTypeToAuditCategory(timelineType: string): AuditCategory {
    if (timelineType.includes('document_')) {
      return AuditCategory.FILE_OPERATION;
    }
    if (timelineType.includes('communication')) {
      return AuditCategory.NOTIFICATION;
    }
    if (timelineType === 'system') {
      return AuditCategory.SYSTEM_CONFIGURATION;
    }
    return AuditCategory.TRANSFER_MANAGEMENT;
  }

  /**
   * Map user type to actor type
   */
  static mapUserTypeToActorType(userType: string): ActorType {
    switch (userType) {
      case 'admin':
      case 'super_admin':
        return ActorType.ADMIN;
      case 'manager':
      case 'employee':
        return ActorType.USER;
      default:
        return ActorType.USER;
    }
  }

  /**
   * Extract changed fields from metadata
   */
  static extractChangedFieldsFromMetadata(metadata?: any): string[] {
    if (!metadata) return [];
    
    const fields: string[] = [];
    
    if (metadata.oldValue && metadata.newValue) {
      // Compare objects to find changed fields
      const oldObj = typeof metadata.oldValue === 'object' ? metadata.oldValue : {};
      const newObj = typeof metadata.newValue === 'object' ? metadata.newValue : {};
      
      const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
      
      for (const key of allKeys) {
        if (oldObj[key] !== newObj[key]) {
          fields.push(key);
        }
      }
    }
    
    return fields;
  }

  /**
   * Assess risk level for timeline event type
   */
  static assessTimelineEventRiskLevel(timelineType: string, metadata?: any): RiskLevel {
    const highRiskTypes = ['cancelled', 'rejected', 'admin_action'];
    const mediumRiskTypes = ['completed', 'approved', 'assigned', 'unassigned'];
    
    if (highRiskTypes.includes(timelineType)) {
      return RiskLevel.HIGH;
    }
    
    if (mediumRiskTypes.includes(timelineType)) {
      return RiskLevel.MEDIUM;
    }
    
    return RiskLevel.LOW;
  }

  /**
   * Check if timeline event type is sensitive
   */
  static isTimelineEventSensitive(timelineType: string): boolean {
    const sensitiveTypes = ['cancelled', 'rejected', 'admin_action', 'patient_updated'];
    return sensitiveTypes.includes(timelineType);
  }

  /**
   * Check if timeline event type requires review
   */
  static doesTimelineEventRequireReview(timelineType: string): boolean {
    const reviewTypes = ['cancelled', 'rejected', 'admin_action'];
    return reviewTypes.includes(timelineType);
  }
}
