/**
 * Timeline Service
 * 
 * Handles comprehensive timeline tracking for transfer requests.
 * Automatically creates timeline events for all transfer-related actions.
 * Enhanced to also log events to AuditLog for compliance and security.
 */


import { TimelineEvent, TimelineEventType } from '@/types/transfer';
import { TimelineItem, TimelineQueryOptions, TimelineResponse, TimelineStats } from '@/types/timeline';
import { DatabaseService } from '@/lib/database';
import AuditLog from '@/models/AuditLog';
import { 
  AuditAction, 
  AuditCategory,
  ActorType, 
  TargetResourceType, 
  RiskLevel 
} from '@/models/AuditLog';
import { AuditService } from '@/lib/audit';
import { AuditLogData, AuditRequestInfo } from '@/lib/audit/core/types';
import { TimelineEventData } from './types';
import { log } from '@/lib/logging';
import { 
  transformAuditLogToTimelineItem,
  mapTimelineTypesToAuditActions,
  applyTimelineFilters
} from '../utils';

export class TimelineService {
  /**
   * Generate a unique event ID
   */
  private static generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a timeline event and automatically log to audit system
   */
  static async createEventWithAudit(
    data: TimelineEventData, 
    transferId: string,
    requestInfo?: AuditRequestInfo
  ): Promise<TimelineEvent> {
    // Create the timeline event directly
    const timelineEvent: TimelineEvent = {
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
    
    // Log to audit system using universal logAudit method
    if (requestInfo) {
      const auditAction = AuditService.mapTimelineTypeToAuditAction(timelineEvent.type);
      const auditCategory = AuditService.mapTimelineTypeToAuditCategory(timelineEvent.type);
      
      try {
        const auditData: AuditLogData = {
        actorId: timelineEvent.actor.id.toString(),
          actorType: AuditService.mapUserTypeToActorType(timelineEvent.actor.userType),
        actorEmail: timelineEvent.actor.email,
        actorName: timelineEvent.actor.name,
        actorRole: timelineEvent.actor.userType,
          action: auditAction,
          category: auditCategory,
        description: timelineEvent.description,
          targetResource: {
            type: TargetResourceType.TRANSFER,
            id: transferId,
            name: `Transfer ${transferId}`,
        metadata: {
          timelineEventId: timelineEvent.id,
          timelineEventType: timelineEvent.type,
              isSystemEvent: timelineEvent.isSystemEvent
            }
          },
          changes: {
            before: timelineEvent.metadata?.oldValue,
            after: timelineEvent.metadata?.newValue,
            fields: AuditService.extractChangedFieldsFromMetadata(timelineEvent.metadata)
        },
          context: {
        reason: timelineEvent.metadata?.reason,
          ...(timelineEvent.metadata?.details && typeof timelineEvent.metadata.details === 'object' ? timelineEvent.metadata.details : {}),
          timelineEventType: timelineEvent.type,
          isSystemEvent: timelineEvent.isSystemEvent
        },
        requestInfo: {
            ipAddress: requestInfo.ipAddress || 'unknown',
            userAgent: requestInfo.userAgent || 'unknown',
            method: requestInfo.method,
            endpoint: requestInfo.endpoint,
            requestId: requestInfo.requestId,
            sessionId: requestInfo.sessionId,
            deviceFingerprint: requestInfo.deviceFingerprint
          },
          securityContext: {
            riskLevel: AuditService.assessTimelineEventRiskLevel(timelineEvent.type, timelineEvent.metadata),
            isSensitive: AuditService.isTimelineEventSensitive(timelineEvent.type),
            requiresReview: AuditService.doesTimelineEventRequireReview(timelineEvent.type)
          },
          outcome: 'success',
          timestamp: timelineEvent.timestamp,
          isAutomated: timelineEvent.isSystemEvent || false
        };
        
        await AuditService.logAudit(auditData);
    } catch (error) {
      // Don't throw error for audit logging failures - timeline should still work
            log.error('Failed to log timeline event to audit system', error, {
              category: 'transfer',
              operation: 'timeline_audit_log',
              transferId,
              timelineEventType: timelineEvent.type
            });
          }
    }
    
    return timelineEvent;
  }

  // ============================================================================
  // TIMELINE RETRIEVAL METHODS (Enhanced for Direct Audit Log Integration)
  // ============================================================================

  /**
   * Get timeline from audit logs with flexible filtering
   * 
   * Supports filtering by:
   * - transferId: Get timeline for a specific transfer
   * - userId: Get timeline for a specific user (actor)
   * - category: Get timeline for a specific category (e.g., TRANSFER_MANAGEMENT)
   * - Plus all standard filters (date range, event kind, security flags, etc.)
   * 
   * @param options Query options including filters
   * @returns Timeline response with pagination info
   */
  static async getTimeline(
    options: TimelineQueryOptions = {}
  ): Promise<TimelineResponse> {
    try {
      const {
        page = 1,
        limit = 50,
        filters = {}
      } = options;
      
      const skip = (page - 1) * limit;
      
      // Build query for audit logs
      const query: any = {};

      // Filter by transfer (most common use case)
      if (filters.transferId) {
        query['targetResource.type'] = 'transfer';
        query['targetResource.id'] = filters.transferId;
      }

      // Filter by user (actor)
      if (filters.userId) {
        query.actorId = filters.userId;
      }

      // Filter by category
      if (filters.category) {
        query.category = filters.category;
      }

      // Apply date filters
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      // Apply event type filters
      if (filters.kind && filters.kind.length > 0) {
        query.action = { $in: mapTimelineTypesToAuditActions([filters.kind] as any) };
      }

      // Apply actor type filters (for actorType, not actorId)
      if (filters.actorId && filters.actorId.length > 0 && !filters.userId) {
        query.actorType = { $in: filters.actorId };
      }

      // Apply security filters
      if (filters.isSensitive !== undefined) {
        query['securityContext.isSensitive'] = filters.isSensitive;
      }
      
      if (filters.requiresReview !== undefined) {
        query['securityContext.requiresReview'] = filters.requiresReview;
      }

      // Execute query with pagination
      const [auditLogs, total] = await Promise.all([
        DatabaseService.findMany(AuditLog, query, {
          sort: { timestamp: -1, _id: -1 },
          skip,
          limit
        }),
        DatabaseService.count(AuditLog, query)
      ]);

      // Transform audit logs to timeline items
      const timelineItems = auditLogs.map(auditLog => 
        transformAuditLogToTimelineItem(auditLog)
      );

      // Apply additional filters
      const filteredItems = applyTimelineFilters(timelineItems, options);

      // Calculate pagination
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        items: filteredItems,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev
        }
      };

    } catch (error) {
      console.error('Error getting timeline:', error);
      return {
        items: [],
        pagination: {
          page: options.page || 1,
          limit: options.limit || 50,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    }
  }


  // transformAuditLogToTimelineItem moved to utils

  // applyTimelineFilters moved to utils

  /**
   * Map timeline event types to audit actions
   */
  // mapTimelineTypesToAuditActions moved to utils

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
   * Get recent activity across all transfers
   */
  static async getRecentActivity(
    options: TimelineQueryOptions = {}
  ): Promise<TimelineItem[]> {
    try {
      const {
        limit = 20,
        filters = {}
      } = options;

      // Build query for recent audit logs
      const query: any = {
        'targetResource.type': 'transfer'
      };

      // Apply date filters
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      // Apply event type filters
      if (filters.kind && filters.kind.length > 0) {
        query.action = { $in: mapTimelineTypesToAuditActions([filters.kind] as any) };
      }

      // Apply actor type filters
      if (filters.actorId && filters.actorId.length > 0) {
        query.actorType = { $in: filters.actorId };
      }

      // Get recent audit logs
      const auditLogs = await DatabaseService.findMany(AuditLog, query, {
        sort: { timestamp: -1 },
        limit
      });

      // Transform audit logs to timeline items
      const timelineItems = auditLogs.map(auditLog => 
        transformAuditLogToTimelineItem(auditLog)
      );

      return applyTimelineFilters(timelineItems, options);

    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Get timeline statistics for a transfer
   */
  static async getTimelineStats(transferId: string): Promise<TimelineStats> {
    try {
      const query = {
        'targetResource.type': 'transfer',
        'targetResource.id': transferId
      };

      // Get all audit logs for this transfer
      const auditLogs = await DatabaseService.findMany(AuditLog, query, {
        sort: { timestamp: -1 }
      });

      // Calculate statistics
      const totalEvents = auditLogs.length;
      const statusChanges = auditLogs.filter(log => 
        log.action === AuditAction.TRANSFER_UPDATED
      ).length;
      const documentUploads = auditLogs.filter(log => 
        log.action === AuditAction.FILE_UPLOADED
      ).length;

      // Get last activity
      const lastActivity = auditLogs.length > 0 ? auditLogs[0].timestamp : new Date();

      // Get unique actors with event counts
      const actorMap = new Map<string, { id: string; name: string; eventCount: number }>();
      
      auditLogs.forEach(log => {
        const actorId = log.actorId;
        const actorName = log.actorName || 'Unknown User';
        
        if (actorMap.has(actorId)) {
          actorMap.get(actorId)!.eventCount++;
        } else {
          actorMap.set(actorId, {
            id: actorId,
            name: actorName,
            eventCount: 1
          });
        }
      });
      
      const actors = Array.from(actorMap.values());

      return {
        totalEvents,
        statusChanges,
        documentUploads,
        lastActivity,
        actors
      };

    } catch (error) {
      console.error('Error getting timeline stats:', error);
      return {
        totalEvents: 0,
        statusChanges: 0,
        documentUploads: 0,
        lastActivity: new Date(),
        actors: []
      };
    }
  }
}

export default TimelineService;
