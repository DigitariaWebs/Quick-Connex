/**
 * Timeline Service
 * 
 * Handles comprehensive timeline tracking for transfer requests.
 * Automatically creates timeline events for all transfer-related actions.
 * Enhanced to also log events to AuditLog for compliance and security.
 */

import { Types } from 'mongoose';
import { TimelineEvent, TimelineEventType } from '@/types/transfer';
import { TimelineItem, TimelineQueryOptions } from '@/types/timeline';
import { DatabaseService, AuditLog } from '@/lib/database';
import { 
  AuditAction, 
  AuditCategory,
  ActorType, 
  TargetResourceType, 
  RiskLevel 
} from '@/models/AuditLog';
import { AuditService } from '@/lib/services/audit-service';
import { TransferAuditContext } from '@/types/audit';

export interface TimelineEventData {
  type: TimelineEventType;
  title: string;
  description: string;
  actor: {
    id: Types.ObjectId;
    name: string;
    email: string;
    userType: 'manager' | 'employee' | 'admin';
  };
  metadata?: {
    oldValue?: any;
    newValue?: any;
    reason?: string;
    details?: string;
    [key: string]: any;
  };
  isSystemEvent?: boolean;
  isVisible?: boolean;
}

export class TimelineService {
  /**
   * Generate a unique event ID
   */
  private static generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a timeline event
   */
  static createEvent(data: TimelineEventData): TimelineEvent {
    return {
      id: this.generateEventId(),
      type: data.type,
      title: data.title,
      description: data.description,
      timestamp: new Date(),
      actor: data.actor,
      metadata: data.metadata || {},
      isSystemEvent: data.isSystemEvent || false,
      isVisible: data.isVisible !== false, // Default to true
    };
  }

  /**
   * Create a timeline event and automatically log to audit system
   */
  static async createEventWithAudit(
    data: TimelineEventData, 
    transferId: string,
    requestInfo?: {
      ipAddress?: string;
      userAgent?: string;
      method?: string;
      endpoint?: string;
    }
  ): Promise<TimelineEvent> {
    // Create the timeline event
    const timelineEvent = this.createEvent(data);
    
    // Log to audit system
    await this.logToAuditSystem(timelineEvent, transferId, requestInfo);
    
    return timelineEvent;
  }

  /**
   * Log timeline event to AuditLog system
   */
  private static async logToAuditSystem(
    timelineEvent: TimelineEvent,
    transferId: string,
    requestInfo?: {
      ipAddress?: string;
      userAgent?: string;
      method?: string;
      endpoint?: string;
    }
  ): Promise<void> {
    try {
      // Map timeline event type to audit action
      const auditAction = this.mapTimelineTypeToAuditAction(timelineEvent.type);
      
      const transferContext: TransferAuditContext = {
        actorId: timelineEvent.actor.id.toString(),
        actorType: this.mapUserTypeToActorType(timelineEvent.actor.userType),
        actorEmail: timelineEvent.actor.email,
        actorName: timelineEvent.actor.name,
        actorRole: timelineEvent.actor.userType,
        action: auditAction as any, // Type assertion for backward compatibility
        description: timelineEvent.description,
        targetResourceType: TargetResourceType.TRANSFER,
        targetResourceId: transferId,
        targetResourceName: `Transfer ${transferId}`,
        metadata: {
          timelineEventId: timelineEvent.id,
          timelineEventType: timelineEvent.type,
          changes: {
            before: timelineEvent.metadata?.oldValue,
            after: timelineEvent.metadata?.newValue,
            fields: this.extractChangedFields(timelineEvent.metadata)
          }
        },
        reason: timelineEvent.metadata?.reason,
        details: {
          ...(timelineEvent.metadata?.details && typeof timelineEvent.metadata.details === 'object' ? timelineEvent.metadata.details : {}),
          timelineEventType: timelineEvent.type,
          isSystemEvent: timelineEvent.isSystemEvent
        },
        requestInfo: {
          ipAddress: requestInfo?.ipAddress || 'unknown',
          userAgent: requestInfo?.userAgent || 'unknown',
          method: requestInfo?.method || 'unknown',
          endpoint: requestInfo?.endpoint || 'unknown'
        },
        riskLevel: this.assessRiskLevel(timelineEvent.type, timelineEvent.metadata),
        isSensitive: this.isSensitiveAction(timelineEvent.type),
        requiresReview: this.requiresReview(timelineEvent.type),
        success: true
      };
      
      await AuditService.logTransferAction(transferContext);
      
    } catch (error) {
      // Don't throw error for audit logging failures - timeline should still work
      console.error('Failed to log timeline event to audit system:', error);
    }
  }

  /**
   * Map timeline event type to audit action
   */
  private static mapTimelineTypeToAuditAction(timelineType: TimelineEventType): AuditAction {
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
    
    return mapping[timelineType] || AuditAction.TRANSFER_UPDATED;
  }

  /**
   * Map timeline event type to audit category
   */
  private static mapTimelineTypeToAuditCategory(timelineType: TimelineEventType): AuditCategory {
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
  private static mapUserTypeToActorType(userType: string): ActorType {
    switch (userType) {
      case 'admin':
        return ActorType.ADMIN;
      case 'manager':
      case 'employee':
        return ActorType.USER;
      default:
        return ActorType.USER;
    }
  }

  /**
   * Assess risk level based on timeline event type and metadata
   */
  private static assessRiskLevel(timelineType: TimelineEventType, metadata?: any): RiskLevel {
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
   * Check if action is sensitive
   */
  private static isSensitiveAction(timelineType: TimelineEventType): boolean {
    const sensitiveTypes = ['cancelled', 'rejected', 'admin_action', 'patient_updated'];
    return sensitiveTypes.includes(timelineType);
  }

  /**
   * Check if action requires review
   */
  private static requiresReview(timelineType: TimelineEventType): boolean {
    const reviewTypes = ['cancelled', 'rejected', 'admin_action'];
    return reviewTypes.includes(timelineType);
  }

  /**
   * Get security flags for timeline event
   */
  private static getSecurityFlags(timelineType: TimelineEventType): string[] {
    const flags: string[] = [];
    
    if (timelineType.includes('document_')) {
      flags.push('file_operation');
    }
    
    if (timelineType.includes('admin_') || timelineType.includes('manager_')) {
      flags.push('privileged_action');
    }
    
    if (timelineType === 'cancelled' || timelineType === 'rejected') {
      flags.push('status_change');
    }
    
    return flags;
  }

  /**
   * Calculate risk score for timeline event
   */
  private static calculateRiskScore(timelineType: TimelineEventType, metadata?: any): number {
    let score = 20; // Base score
    
    // Increase score based on event type
    if (timelineType === 'cancelled' || timelineType === 'rejected') {
      score += 40;
    }
    
    if (timelineType.includes('admin_')) {
      score += 30;
    }
    
    if (timelineType === 'patient_updated') {
      score += 25;
    }
    
    // Increase score if sensitive data is involved
    if (metadata?.oldValue || metadata?.newValue) {
      score += 15;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Extract changed fields from metadata
   */
  private static extractChangedFields(metadata?: any): string[] {
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
   * Create a transfer creation event with audit logging
   */
  static async createTransferCreatedEventWithAudit(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
    transferData: any,
    transferId: string,
    requestInfo?: {
      ipAddress?: string;
      userAgent?: string;
      method?: string;
      endpoint?: string;
    }
  ): Promise<TimelineEvent> {
    const eventData: TimelineEventData = {
      type: 'created',
      title: 'Transfer Request Created',
      description: `Transfer request created for ${transferData.patientInfo?.firstName || 'patient'} ${transferData.patientInfo?.lastName || ''}`,
      actor,
      metadata: {
        transferCategory: transferData.transferCategory,
        fromHospital: transferData.fromHospitalName,
        toHospital: transferData.toHospitalName,
        priority: transferData.priority,
        reason: transferData.reason
      }
    };

    return await this.createEventWithAudit(eventData, transferId, requestInfo);
  }

  /**
   * Create a transfer creation event (legacy method for backward compatibility)
   */
  static createTransferCreatedEvent(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
    transferData: any
  ): TimelineEvent {
    return this.createEvent({
      type: 'created',
      title: 'Transfer Request Created',
      description: `Transfer request created for patient ${transferData.patientInfo.firstName} ${transferData.patientInfo.lastName}`,
      actor,
      metadata: {
        patientName: `${transferData.patientInfo.firstName} ${transferData.patientInfo.lastName}`,
        fromHospital: transferData.fromHospitalName,
        toHospital: transferData.toHospitalName,
        priority: transferData.priority,
        reason: transferData.reason,
        details: `Transfer ID: ${transferData.transferId}`
      }
    });
  }

  /**
   * Create a status change event with audit logging
   */
  static async createStatusChangeEventWithAudit(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
    oldStatus: string,
    newStatus: string,
    transferId: string,
    reason?: string,
    requestInfo?: {
      ipAddress?: string;
      userAgent?: string;
      method?: string;
      endpoint?: string;
    }
  ): Promise<TimelineEvent> {
    const eventData: TimelineEventData = {
      type: 'status_changed',
      title: `Status Changed: ${oldStatus} → ${newStatus}`,
      description: `Transfer status changed from ${oldStatus} to ${newStatus}${reason ? ` - ${reason}` : ''}`,
      actor,
      metadata: {
        oldValue: oldStatus,
        newValue: newStatus,
        reason,
        details: `Status transition from ${oldStatus} to ${newStatus}`
      }
    };

    return await this.createEventWithAudit(eventData, transferId, requestInfo);
  }

  /**
   * Create a status change event (legacy method for backward compatibility)
   */
  static createStatusChangeEvent(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
    oldStatus: string,
    newStatus: string,
    reason?: string
  ): TimelineEvent {
    const statusLabels: { [key: string]: string } = {
      'pending': 'Pending Approval',
      'accepted': 'Approved',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };

    return this.createEvent({
      type: 'status_changed',
      title: 'Status Updated',
      description: `Transfer status changed from ${statusLabels[oldStatus] || oldStatus} to ${statusLabels[newStatus] || newStatus}`,
      actor,
      metadata: {
        oldValue: oldStatus,
        newValue: newStatus,
        reason: reason || 'Status updated',
        details: `Previous status: ${statusLabels[oldStatus] || oldStatus}`
      }
    });
  }

  /**
   * Create an approval event
   */
  static createApprovalEvent(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
    reason?: string
  ): TimelineEvent {
    return this.createEvent({
      type: 'approved',
      title: 'Transfer Approved',
      description: 'Transfer request has been approved and is now available for assignment',
      actor,
      metadata: {
        reason: reason || 'Approved by administrator',
        details: 'Transfer is now visible to employees and ready for assignment'
      }
    });
  }

  /**
   * Create a rejection event
   */
  static createRejectionEvent(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
    reason?: string
  ): TimelineEvent {
    return this.createEvent({
      type: 'rejected',
      title: 'Transfer Rejected',
      description: 'Transfer request has been rejected',
      actor,
      metadata: {
        reason: reason || 'Rejected by administrator',
        details: 'Transfer request was not approved'
      }
    });
  }

  /**
   * Create an assignment event
   */
  static createAssignmentEvent(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
    assignedTo: { id: Types.ObjectId; name: string; email: string },
    reason?: string
  ): TimelineEvent {
    return this.createEvent({
      type: 'assigned',
      title: 'Transfer Assigned',
      description: `Transfer has been assigned to ${assignedTo.name}`,
      actor,
      metadata: {
        assignedTo: assignedTo,
        reason: reason || 'Transfer assigned to employee',
        details: `Assigned to: ${assignedTo.name} (${assignedTo.email})`
      }
    });
  }

  /**
   * Create an unassignment event (when employee cancels and returns to pool)
   */
  static createUnassignmentEvent(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
    previousAssignee: { id: Types.ObjectId; name: string; email: string },
    reason?: string
  ): TimelineEvent {
    return this.createEvent({
      type: 'unassigned',
      title: 'Transfer Returned to Available Pool',
      description: `Transfer unassigned from ${previousAssignee.name} and returned to available pool`,
      actor,
      metadata: {
        previousAssignee: previousAssignee,
        reason: reason || 'Transfer returned to available pool',
        details: `Previously assigned to: ${previousAssignee.name} (${previousAssignee.email})`,
        availableForReassignment: true
      }
    });
  }

  /**
   * Create an acceptance event
   */
  static createAcceptanceEvent(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' }
  ): TimelineEvent {
    return this.createEvent({
      type: 'accepted',
      title: 'Transfer Accepted',
      description: `${actor.name} has accepted the transfer assignment`,
      actor,
      metadata: {
        details: 'Employee has accepted responsibility for this transfer'
      }
    });
  }

  /**
   * Create a completion event
   */
  static createCompletionEvent(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
    duration?: number
  ): TimelineEvent {
    return this.createEvent({
      type: 'completed',
      title: 'Transfer Completed',
      description: 'Transfer has been successfully completed',
      actor,
      metadata: {
        duration: duration,
        details: duration ? `Transfer completed in ${duration} minutes` : 'Transfer completed successfully'
      }
    });
  }

  /**
   * Create a cancellation event
   */
  static createCancellationEvent(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
    reason?: string
  ): TimelineEvent {
    return this.createEvent({
      type: 'cancelled',
      title: 'Transfer Cancelled',
      description: 'Transfer has been cancelled',
      actor,
      metadata: {
        reason: reason || 'Transfer cancelled',
        details: reason || 'Transfer was cancelled by user'
      }
    });
  }

  /**
   * Create a patient info update event
   */
  static createPatientUpdateEvent(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
    field: string,
    oldValue: any,
    newValue: any
  ): TimelineEvent {
    return this.createEvent({
      type: 'patient_updated',
      title: 'Patient Information Updated',
      description: `Patient ${field} has been updated`,
      actor,
      metadata: {
        field,
        oldValue,
        newValue,
        details: `${field} changed from "${oldValue}" to "${newValue}"`
      }
    });
  }

  /**
   * Create a hospital update event
   */
  static createHospitalUpdateEvent(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
    hospitalType: 'from' | 'to',
    oldHospital: string,
    newHospital: string
  ): TimelineEvent {
    return this.createEvent({
      type: 'hospital_updated',
      title: 'Hospital Information Updated',
      description: `${hospitalType === 'from' ? 'Source' : 'Destination'} hospital has been updated`,
      actor,
      metadata: {
        hospitalType,
        oldValue: oldHospital,
        newValue: newHospital,
        details: `${hospitalType === 'from' ? 'Source' : 'Destination'} hospital changed from "${oldHospital}" to "${newHospital}"`
      }
    });
  }

  /**
   * Create a priority change event
   */
  static createPriorityChangeEvent(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
    oldPriority: string,
    newPriority: string
  ): TimelineEvent {
    return this.createEvent({
      type: 'priority_changed',
      title: 'Priority Updated',
      description: `Transfer priority changed from ${oldPriority} to ${newPriority}`,
      actor,
      metadata: {
        oldValue: oldPriority,
        newValue: newPriority,
        details: `Priority level changed from ${oldPriority} to ${newPriority}`
      }
    });
  }

  /**
   * Create a document upload event
   */
  static createDocumentUploadEvent(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
    fileName: string
  ): TimelineEvent {
    return this.createEvent({
      type: 'document_uploaded',
      title: 'Document Uploaded',
      description: `Medical document "${fileName}" has been uploaded`,
      actor,
      metadata: {
        fileName,
        details: `Document "${fileName}" added to transfer`
      }
    });
  }

  /**
   * Create a notes update event
   */
  static createNotesUpdateEvent(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
    oldNotes: string,
    newNotes: string
  ): TimelineEvent {
    return this.createEvent({
      type: 'notes_updated',
      title: 'Notes Updated',
      description: 'Transfer notes have been updated',
      actor,
      metadata: {
        oldValue: oldNotes,
        newValue: newNotes,
        details: 'Additional notes or comments have been added'
      }
    });
  }

  /**
   * Create a communication event
   */
  static createCommunicationEvent(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
    communicationType: 'email' | 'sms' | 'notification',
    recipient: string,
    subject?: string
  ): TimelineEvent {
    return this.createEvent({
      type: 'communication',
      title: 'Communication Sent',
      description: `${communicationType.toUpperCase()} sent to ${recipient}`,
      actor,
      metadata: {
        communicationType,
        recipient,
        subject,
        details: subject || `${communicationType.toUpperCase()} notification sent`
      },
      isSystemEvent: true
    });
  }

  /**
   * Create a system event
   */
  static createSystemEvent(
    title: string,
    description: string,
    metadata?: any
  ): TimelineEvent {
    return this.createEvent({
      type: 'system',
      title,
      description,
      actor: {
        id: new Types.ObjectId(),
        name: 'System',
        email: 'system@patients-management.com',
        userType: 'admin'
      },
      metadata: metadata || {},
      isSystemEvent: true
    });
  }

  /**
   * Create a scheduling event
   */
  static createSchedulingEvent(
    actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
    scheduledDate: Date,
    transferTime: string,
    isReschedule: boolean = false
  ): TimelineEvent {
    return this.createEvent({
      type: isReschedule ? 'rescheduled' : 'scheduled',
      title: isReschedule ? 'Transfer Rescheduled' : 'Transfer Scheduled',
      description: `Transfer ${isReschedule ? 'rescheduled' : 'scheduled'} for ${scheduledDate.toLocaleDateString()} at ${transferTime}`,
      actor,
      metadata: {
        scheduledDate,
        transferTime,
        details: `Transfer ${isReschedule ? 'rescheduled' : 'scheduled'} for ${scheduledDate.toLocaleDateString()} at ${transferTime}`
      }
    });
  }

  // ============================================================================
  // TIMELINE RETRIEVAL METHODS (Enhanced for Direct Audit Log Integration)
  // ============================================================================

  /**
   * Get timeline for a specific transfer from audit logs
   */
  static async getTimelineForTransfer(
    transferId: string, 
    options: TimelineQueryOptions = {}
  ): Promise<TimelineItem[]> {
    try {
      // Build query for audit logs
      const query: any = {
        'targetResource.type': 'transfer',
        'targetResource.id': transferId
      };

      // Apply date filters
      if (options.filters?.startDate || options.filters?.endDate) {
        query.timestamp = {};
        if (options.filters?.startDate) query.timestamp.$gte = options.filters?.startDate;
        if (options.filters?.endDate) query.timestamp.$lte = options.filters?.endDate;
      }

      // Apply event type filters
      if (options.filters?.kind && options.filters?.kind.length > 0) {
        query.action = { $in: this.mapTimelineTypesToAuditActions([options.filters.kind] as any) };
      }

      // Apply actor type filters
      if (options.filters?.actorId && options.filters?.actorId.length > 0) {
        query.actorType = { $in: options.filters?.actorId };
      }

      // Get audit logs
      const auditLogs = await DatabaseService.findMany(AuditLog, query, {
        sort: { timestamp: -1 },
        limit: options.limit || 100
      });

      console.log(`🔍 Timeline Debug - Transfer ID: ${transferId}`);
      console.log(`🔍 Query:`, JSON.stringify(query, null, 2));
      console.log(`🔍 Found ${auditLogs.length} audit logs`);

      // Transform audit logs to timeline items
      const timelineItems = auditLogs.map(auditLog => 
        this.transformAuditLogToTimelineItem(auditLog)
      );

      console.log(`🔍 Transformed to ${timelineItems.length} timeline items`);

      // Apply additional filters
      return this.applyTimelineFilters(timelineItems, options);

    } catch (error) {
      console.error('Error getting timeline for transfer:', error);
      return [];
    }
  }

  /**
   * Get timeline for a specific user from audit logs
   */
  static async getTimelineForUser(
    userId: string, 
    options: TimelineQueryOptions = {}
  ): Promise<TimelineItem[]> {
    try {
      // Build query for audit logs
      const query: any = {
        actorId: userId
      };

      // Apply date filters
      if (options.filters?.startDate || options.filters?.endDate) {
        query.timestamp = {};
        if (options.filters?.startDate) query.timestamp.$gte = options.filters?.startDate;
        if (options.filters?.endDate) query.timestamp.$lte = options.filters?.endDate;
      }

      // Apply event type filters
      if (options.filters?.kind && options.filters?.kind.length > 0) {
        query.action = { $in: this.mapTimelineTypesToAuditActions([options.filters.kind] as any) };
      }

      // Get audit logs
      const auditLogs = await DatabaseService.findMany(AuditLog, query, {
        sort: { timestamp: -1 },
        limit: options.limit || 100
      });

      // Transform audit logs to timeline items
      const timelineItems = auditLogs.map(auditLog => 
        this.transformAuditLogToTimelineItem(auditLog)
      );

      // Apply additional filters
      return this.applyTimelineFilters(timelineItems, options);

    } catch (error) {
      console.error('Error getting timeline for user:', error);
      return [];
    }
  }

  /**
   * Get timeline for admin overview from audit logs
   */
  static async getTimelineForAdmin(
    options: TimelineQueryOptions = {}
  ): Promise<TimelineItem[]> {
    try {
      // Build query for audit logs
      const query: any = {
        category: AuditCategory.TRANSFER_MANAGEMENT
      };

      // Apply date filters
      if (options.filters?.startDate || options.filters?.endDate) {
        query.timestamp = {};
        if (options.filters?.startDate) query.timestamp.$gte = options.filters?.startDate;
        if (options.filters?.endDate) query.timestamp.$lte = options.filters?.endDate;
      }

      // Apply event type filters
      if (options.filters?.kind && options.filters?.kind.length > 0) {
        query.action = { $in: this.mapTimelineTypesToAuditActions([options.filters.kind] as any) };
      }

      // Apply actor type filters
      if (options.filters?.actorId && options.filters?.actorId.length > 0) {
        query.actorType = { $in: options.filters?.actorId };
      }

      // Get audit logs
      const auditLogs = await DatabaseService.findMany(AuditLog, query, {
        sort: { timestamp: -1 },
        limit: options.limit || 200
      });

      // Transform audit logs to timeline items
      const timelineItems = auditLogs.map(auditLog => 
        this.transformAuditLogToTimelineItem(auditLog)
      );

      // Apply additional filters
      return this.applyTimelineFilters(timelineItems, options);

    } catch (error) {
      console.error('Error getting timeline for admin:', error);
      return [];
    }
  }

  /**
   * Transform AuditLog to TimelineItem
   */
  private static transformAuditLogToTimelineItem(auditLog: any): TimelineItem {
    return {
      // Identifiers
      timelineItemId: auditLog._id.toString(),
      transferId: auditLog.targetResource?.id || 'unknown',
      
      // Event Details
      kind: this.mapAuditActionToTimelineKind(auditLog.action),
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
      diff: auditLog.changes ? {
        before: auditLog.changes.before,
        after: auditLog.changes.after,
        fields: auditLog.changes.fields || [],
        summary: auditLog.changes.changeSummary || auditLog.description
      } : undefined,
      
      // Status Information (extracted from changes)
      statusAfter: this.extractStatusFromChanges(auditLog.changes),
      assignedToAfter: this.extractAssignedToFromChanges(auditLog.changes),
      
      // UI Enhancements
      badges: this.generateBadges(auditLog),
      tags: this.generateTags(auditLog),
      isSensitive: auditLog.securityContext?.isSensitive || false,
      requiresReview: auditLog.securityContext?.requiresReview || false
    };
  }

  /**
   * Apply filters and sorting to timeline items
   */
  private static applyTimelineFilters(
    items: TimelineItem[], 
    options: TimelineQueryOptions
  ): TimelineItem[] {
    let filteredItems = [...items];

    // Apply system event filter
    if (false) { // System events filter removed
      filteredItems = filteredItems.filter(item => 
        !item.tags.includes('system')
      );
    }

    // Apply sorting
    if (false) { // Sort options removed
      filteredItems.sort((a, b) => {
        let comparison = 0;
        
        // Default to timestamp sorting
        comparison = a.timestamp.getTime() - b.timestamp.getTime();
        
        return -comparison; // Default to desc order
      });
    }

    // Apply pagination
    if (options.page && options.limit) {
      const startIndex = (options.page - 1) * options.limit;
      const endIndex = startIndex + options.limit;
      filteredItems = filteredItems.slice(startIndex, endIndex);
    }

    return filteredItems;
  }

  /**
   * Map timeline event types to audit actions
   */
  private static mapTimelineTypesToAuditActions(timelineTypes: TimelineEventType[]): AuditAction[] {
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
  private static mapAuditActionToTimelineKind(action: AuditAction): string {
    const mapping: Partial<Record<AuditAction, string>> = {
      [AuditAction.TRANSFER_CREATED]: 'created',
      [AuditAction.TRANSFER_UPDATED]: 'updated',
      [AuditAction.TRANSFER_DELETED]: 'deleted',
      [AuditAction.TRANSFER_CANCELLED]: 'cancelled',
      [AuditAction.TRANSFER_APPROVED]: 'approved',
      [AuditAction.TRANSFER_REJECTED]: 'rejected',
      [AuditAction.TRANSFER_COMPLETED]: 'completed',
      [AuditAction.TRANSFER_REASSIGNED]: 'reassigned',
      [AuditAction.FILE_UPLOADED]: 'document_uploaded',
      [AuditAction.FILE_DELETED]: 'document_removed',
      [AuditAction.NOTIFICATION_SENT]: 'communication',
      [AuditAction.SYSTEM_ALERT]: 'system'
    };

    return mapping[action] || 'updated';
  }

  /**
   * Extract status from changes
   */
  private static extractStatusFromChanges(changes: any): string | undefined {
    if (!changes?.after) return undefined;
    
    if (typeof changes.after === 'object' && changes.after.status) {
      return changes.after.status;
    }
    
    if (typeof changes.after === 'string' && ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'].includes(changes.after)) {
      return changes.after;
    }
    
    return undefined;
  }

  /**
   * Extract assignedTo from changes
   */
  private static extractAssignedToFromChanges(changes: any): string | undefined {
    if (!changes?.after) return undefined;
    
    if (typeof changes.after === 'object' && changes.after.assignedTo) {
      return changes.after.assignedTo;
    }
    
    return undefined;
  }

  /**
   * Generate badges for timeline item
   */
  private static generateBadges(auditLog: any): string[] {
    const badges: string[] = [];
    
    // Risk level badges
    if (auditLog.securityContext?.riskLevel === RiskLevel.HIGH) {
      badges.push('high-risk');
    } else if (auditLog.securityContext?.riskLevel === RiskLevel.MEDIUM) {
      badges.push('medium-risk');
    }
    
    // Sensitive action badges
    if (auditLog.securityContext?.isSensitive) {
      badges.push('sensitive');
    }
    
    // Review required badges
    if (auditLog.securityContext?.requiresReview) {
      badges.push('needs-review');
    }
    
    // Outcome badges
    if (auditLog.outcome === 'failure') {
      badges.push('failed');
    }
    
    return badges;
  }

  /**
   * Generate tags for timeline item
   */
  private static generateTags(auditLog: any): string[] {
    const tags: string[] = [];
    
    // Action type tags
    tags.push(auditLog.action);
    tags.push(auditLog.category);
    
    // Actor type tags
    tags.push(auditLog.actorType);
    
    // Security tags
    if (auditLog.securityContext?.securityFlags) {
      tags.push(...auditLog.securityContext.securityFlags);
    }
    
    // System event tags
    if (auditLog.isAutomated) {
      tags.push('system');
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }
}

export default TimelineService;
