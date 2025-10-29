import { Request } from 'express';
import { DatabaseService } from '@/lib/database';
import AuditLog from '@/models/AuditLog';
import { log } from '@/lib/logging';
import { 
  AuditAction, 
  AuditCategory, 
  RiskLevel, 
  TargetResourceType 
} from '../../../models/AuditLog';
import {
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
// Utility functions are implemented inline for now
// Constants and config are implemented inline for now

/**
 * Centralized Audit Service
 * 
 * Provides unified audit logging for all system activities with async processing,
 * error recovery, and comprehensive event coverage.
 */
export class AuditService {
  /**
   * Helper to create targetResource object with proper optional handling
   */
  private static createTargetResource(
    type: TargetResourceType,
    id: string,
    name?: string,
    metadata?: Record<string, any>
  ): { type: TargetResourceType; id: string; name?: string | undefined; metadata?: Record<string, any> | undefined } {
    return {
      type,
      id,
      ...(name && { name }),
      ...(metadata && { metadata })
    };
  }

  /**
   * Helper to create requestInfo object with proper optional handling
   */
  private static createRequestInfo(requestInfo: any) {
    return {
      ipAddress: requestInfo.ipAddress || 'unknown',
      userAgent: requestInfo.userAgent || 'unknown',
      ...(requestInfo.method && { method: requestInfo.method }),
      ...(requestInfo.endpoint && { endpoint: requestInfo.endpoint }),
      ...(requestInfo.requestId && { requestId: requestInfo.requestId }),
      ...(requestInfo.sessionId && { sessionId: requestInfo.sessionId }),
      ...(requestInfo.deviceFingerprint && { deviceFingerprint: requestInfo.deviceFingerprint })
    };
  }

  /**
   * Helper to create AuditLogData with proper optional handling
   */
  private static createAuditLogData(data: Partial<AuditLogData>): AuditLogData {
    return {
      actorId: data.actorId!,
      actorType: data.actorType!,
      action: data.action!,
      category: data.category!,
      description: data.description!,
      timestamp: data.timestamp!,
      outcome: data.outcome!,
      ...(data.actorEmail && { actorEmail: data.actorEmail }),
      ...(data.actorName && { actorName: data.actorName }),
      ...(data.actorRole && { actorRole: data.actorRole }),
      ...(data.targetResource !== undefined && { targetResource: data.targetResource }),
      ...(data.changes && { changes: data.changes }),
      ...(data.context && { context: data.context }),
      ...(data.requestInfo && { requestInfo: data.requestInfo }),
      ...(data.securityContext && { securityContext: data.securityContext }),
      ...(data.errorMessage && { errorMessage: data.errorMessage }),
      ...(data.errorCode && { errorCode: data.errorCode }),
      ...(data.duration && { duration: data.duration }),
      ...(data.timezone && { timezone: data.timezone }),
      ...(data.isAutomated !== undefined && { isAutomated: data.isAutomated }),
      ...(data.isBulkOperation !== undefined && { isBulkOperation: data.isBulkOperation }),
      ...(data.parentAuditId && { parentAuditId: data.parentAuditId })
    };
  }

  /**
   * Core audit logging method
   */
  private static async logAudit(data: AuditLogData): Promise<void> {
    try {
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
        
        // Request information
        requestInfo: data.requestInfo,
        
        // Security context
        securityContext: data.securityContext,
        
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
      
      await DatabaseService.create(AuditLog, auditLog.toObject());
    } catch (error) {
      log.error('Failed to save audit log', error, {
        operation: 'save_audit_log',
        actorId: data.actorId,
        action: data.action
      });
      // Could implement retry queue here
      throw error;
    }
  }

  /**
   * Log user management actions
   */
  static async logUserAction(context: UserAuditContext): Promise<void> {
    const auditData = this.createAuditLogData({
      actorId: context.actorId,
      actorType: context.actorType,
      actorEmail: context.actorEmail,
      actorName: context.actorName,
      actorRole: context.actorRole,
      action: context.action,
      category: AuditCategory.USER_MANAGEMENT,
      description: context.description,
      targetResource: this.createTargetResource(
        context.targetResourceType,
        context.targetResourceId,
        context.targetResourceName,
        context.metadata
      ),
      changes: context.metadata?.changes,
      context: {
        reason: context.reason,
        details: context.details,
        ...context.metadata
      },
      requestInfo: context.requestInfo ? this.createRequestInfo(context.requestInfo) : undefined,
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
    });

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
    const auditData = this.createAuditLogData({
      actorId: context.actorId,
      actorType: context.actorType,
      actorEmail: context.actorEmail,
      actorName: context.actorName,
      actorRole: context.actorRole,
      action: context.action,
      category: AuditCategory.TRANSFER_MANAGEMENT,
      description: context.description,
      targetResource: this.createTargetResource(
        context.targetResourceType,
        context.targetResourceId,
        context.targetResourceName,
        context.metadata
      ),
      changes: context.metadata?.changes,
      context: {
        reason: context.reason,
        details: context.details,
        ...context.metadata
      },
      requestInfo: context.requestInfo ? this.createRequestInfo(context.requestInfo) : undefined,
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
    });

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
    const auditData = this.createAuditLogData({
      actorId: context.actorId,
      actorType: context.actorType,
      actorEmail: context.actorEmail,
      actorName: context.actorName,
      actorRole: context.actorRole,
      action: context.action,
      category: AuditCategory.PATIENT_MANAGEMENT,
      description: context.description,
      targetResource: this.createTargetResource(
        context.targetResourceType,
        context.targetResourceId,
        context.targetResourceName,
        context.metadata
      ),
      changes: context.metadata?.changes,
      context: {
        reason: context.reason,
        details: context.details,
        ...context.metadata
      },
      requestInfo: context.requestInfo ? this.createRequestInfo(context.requestInfo) : undefined,
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
    });

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
    const auditData = this.createAuditLogData({
      actorId: context.actorId,
      actorType: context.actorType,
      actorEmail: context.actorEmail,
      actorName: context.actorName,
      actorRole: context.actorRole,
      action: context.action,
      category: AuditCategory.AUTHENTICATION,
      description: context.description,
      targetResource: context.targetResourceId ? this.createTargetResource(
        context.targetResourceType || TargetResourceType.USER,
        context.targetResourceId,
        undefined,
        context.metadata
      ) : undefined,
      context: {
        reason: context.reason,
        details: context.details,
        ...context.metadata
      },
      requestInfo: context.requestInfo ? this.createRequestInfo(context.requestInfo) : undefined,
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
    });

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
    const auditData = this.createAuditLogData({
      actorId: context.actorId,
      actorType: context.actorType,
      actorEmail: context.actorEmail,
      actorName: context.actorName,
      actorRole: context.actorRole,
      action: context.action,
      category: AuditCategory.COMMUNICATION,
      description: context.description,
      targetResource: context.targetResourceId ? this.createTargetResource(
        context.targetResourceType || TargetResourceType.USER,
        context.targetResourceId,
        undefined,
        context.metadata
      ) : undefined,
      context: {
        reason: context.reason,
        details: context.details,
        ...context.metadata
      },
      requestInfo: context.requestInfo ? this.createRequestInfo(context.requestInfo) : undefined,
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
    });

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
    const auditData = this.createAuditLogData({
      actorId: context.actorId,
      actorType: context.actorType,
      actorEmail: context.actorEmail,
      actorName: context.actorName,
      actorRole: context.actorRole,
      action: context.action,
      category: AuditCategory.FILE_OPERATION,
      description: context.description,
      targetResource: this.createTargetResource(
        context.targetResourceType,
        context.targetResourceId,
        context.targetResourceName,
        context.metadata
      ),
      context: {
        reason: context.reason,
        details: context.details,
        ...context.metadata
      },
      requestInfo: context.requestInfo ? this.createRequestInfo(context.requestInfo) : undefined,
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
    });

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
    const auditData = this.createAuditLogData({
      actorId: context.actorId,
      actorType: context.actorType,
      actorEmail: context.actorEmail,
      actorName: context.actorName,
      actorRole: context.actorRole,
      action: context.action,
      category: AuditCategory.DATA_ACCESS,
      description: context.description,
      targetResource: context.targetResourceId ? this.createTargetResource(
        context.targetResourceType || TargetResourceType.REPORT,
        context.targetResourceId,
        undefined,
        context.metadata
      ) : undefined,
      context: {
        reason: context.reason,
        details: context.details,
        ...context.metadata
      },
      requestInfo: context.requestInfo ? this.createRequestInfo(context.requestInfo) : undefined,
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
    });

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
    const auditData = this.createAuditLogData({
      actorId: context.actorId,
      actorType: context.actorType,
      actorEmail: context.actorEmail,
      actorName: context.actorName,
      actorRole: context.actorRole,
      action: context.action,
      category: this.determineCategory(context.action),
      description: context.description,
      targetResource: context.targetResourceId ? this.createTargetResource(
        context.targetResourceType || TargetResourceType.SYSTEM,
        context.targetResourceId,
        undefined,
        context.metadata
      ) : undefined,
      context: {
        reason: context.reason,
        details: context.details,
        ...context.metadata
      },
      requestInfo: context.requestInfo ? this.createRequestInfo(context.requestInfo) : undefined,
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
    });

    this.logAudit(auditData).catch(err => {
      log.error('Failed to log system event', err, {
        operation: 'log_system_event',
        actorId: context.actorId,
        action: context.action
      });
    });
  }

  /**
   * Extract request information from Express Request
   */
  static extractRequestInfo(request: Request): AuditRequestInfo {
    const ipAddress = request.headers['x-forwarded-for'] as string ||
      request.headers['x-real-ip'] as string ||
      request.ip ||
      '127.0.0.1';
    
    const userAgent = request.headers['user-agent'] || 'Unknown';
    const method = request.method;
    const endpoint = request.path;
    const requestId = request.headers['x-request-id'] as string || undefined;
    const sessionId = request.headers['x-session-id'] as string || undefined;
    const deviceFingerprint = request.headers['x-device-fingerprint'] as string || undefined;

    return this.createRequestInfo({
      ipAddress,
      userAgent: userAgent as string,
      method,
      endpoint,
      requestId,
      sessionId,
      deviceFingerprint
    });
  }

  /**
   * Assess risk level based on action type
   */
  static assessAuditRiskLevel(action: AuditAction): RiskLevel {
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
}
