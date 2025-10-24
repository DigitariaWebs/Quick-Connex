/**
 * Timeline Service
 * 
 * Provides timeline functionality by reading and formatting AuditLog entries
 * into timeline-friendly DTOs for UI display.
 */

import AuditLog, { AuditAction, AuditCategory, ActorType, RiskLevel } from '@/models/AuditLog';
import { 
  TimelineItem, 
  TimelineQueryOptions, 
  TimelineResponse, 
  TimelineStats,
  RecentActivityOptions,
  EVENT_KIND_MAPPING,
  BADGE_MAPPING,
  TAG_MAPPING
} from '@/types/timeline';

export class TimelineService {
  
  /**
   * Get timeline for a specific transfer
   */
  static async getTransferTimeline(
    transferId: string,
    options: TimelineQueryOptions = {}
  ): Promise<TimelineResponse> {
    const {
      page = 1,
      limit = 50,
      filters = {}
    } = options;
    
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = {
      'targetResource.type': 'transfer',
      'targetResource.id': transferId
    };
    
    // Apply filters
    if (filters.actorId) {
      query.actorId = filters.actorId;
    }
    
    if (filters.kind) {
      // Find actions that map to this kind
      const actions = Object.entries(EVENT_KIND_MAPPING)
        .filter(([_, kind]) => kind === filters.kind)
        .map(([action, _]) => action);
      query.action = { $in: actions };
    }
    
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = filters.startDate;
      if (filters.endDate) query.timestamp.$lte = filters.endDate;
    }
    
    if (filters.isSensitive !== undefined) {
      query['securityContext.isSensitive'] = filters.isSensitive;
    }
    
    if (filters.requiresReview !== undefined) {
      query['securityContext.requiresReview'] = filters.requiresReview;
    }
    
    // Execute query
    const [auditLogs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1, _id: -1 }) // Sort by timestamp desc, then by _id for stable ordering
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query)
    ]);
    
    // Transform to timeline items
    const items = auditLogs.map((log, index) => this.formatTimelineItem(log, skip + index));
    
    // Calculate pagination
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    };
  }
  
  /**
   * Get recent activity across all transfers
   */
  static async getRecentActivity(
    options: RecentActivityOptions = {}
  ): Promise<TimelineItem[]> {
    const {
      limit = 50,
      filters = {}
    } = options;
    
    // Build query
    const query: any = {
      'targetResource.type': 'transfer'
    };
    
    if (filters.actorId) {
      query.actorId = filters.actorId;
    }
    
    if (filters.category) {
      query.category = filters.category;
    }
    
    if (filters.isSensitive !== undefined) {
      query['securityContext.isSensitive'] = filters.isSensitive;
    }
    
    // Execute query
    const auditLogs = await AuditLog.find(query)
      .sort({ timestamp: -1, _id: -1 })
      .limit(limit)
      .lean();
    
    // Transform to timeline items
    return auditLogs.map((log, index) => this.formatTimelineItem(log, index));
  }
  
  /**
   * Get timeline statistics for a transfer
   */
  static async getTimelineStats(transferId: string): Promise<TimelineStats> {
    const query = {
      'targetResource.type': 'transfer',
      'targetResource.id': transferId
    };
    
    // Get basic stats
    const [totalEvents, statusChanges, documentUploads, lastActivity, actors] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.countDocuments({
        ...query,
        action: { $in: [
          AuditAction.TRANSFER_APPROVED,
          AuditAction.TRANSFER_REJECTED,
          AuditAction.TRANSFER_COMPLETED,
          AuditAction.TRANSFER_CANCELLED
        ]}
      }),
      AuditLog.countDocuments({
        ...query,
        action: AuditAction.FILE_UPLOADED
      }),
      AuditLog.findOne(query)
        .sort({ timestamp: -1 })
        .select('timestamp')
        .lean(),
      AuditLog.aggregate([
        { $match: query },
        { $group: {
          _id: '$actorId',
          name: { $first: '$actorName' },
          eventCount: { $sum: 1 }
        }},
        { $sort: { eventCount: -1 }},
        { $limit: 10 }
      ])
    ]);
    
    return {
      totalEvents,
      statusChanges,
      documentUploads,
      lastActivity: lastActivity?.timestamp || new Date(),
      actors: actors.map(actor => ({
        id: actor._id,
        name: actor.name || 'Unknown',
        eventCount: actor.eventCount
      }))
    };
  }
  
  /**
   * Format a AuditLog entry into a TimelineItem
   */
  private static formatTimelineItem(auditLog: any, order: number): TimelineItem {
    const kind = EVENT_KIND_MAPPING[auditLog.action as AuditAction] || 'unknown';
    const badges = BADGE_MAPPING[kind] || [];
    const tags = TAG_MAPPING[kind] || [];
    
    // Generate title and description
    const { title, description } = this.generateTimelineContent(auditLog);
    
    // Extract status and assignee changes
    const statusAfter = this.extractStatusAfter(auditLog);
    const assignedToAfter = this.extractAssignedToAfter(auditLog);
    
    // Extract attachments
    const attachments = this.extractAttachments(auditLog);
    
    return {
      timelineItemId: auditLog._id.toString(),
      transferId: auditLog.targetResource?.id || '',
      kind,
      title,
      description,
      timestamp: auditLog.timestamp,
      order,
      actor: {
        id: auditLog.actorId,
        type: auditLog.actorType,
        name: auditLog.actorName || 'Unknown',
        email: auditLog.actorEmail || '',
        role: auditLog.actorRole || ''
      },
      diff: auditLog.changes ? {
        before: auditLog.changes.before,
        after: auditLog.changes.after,
        fields: auditLog.changes.fields || [],
        summary: auditLog.changes.changeSummary || ''
      } : undefined,
      statusAfter,
      assignedToAfter,
      attachments,
      badges,
      tags,
      isSensitive: auditLog.securityContext?.isSensitive || false,
      requiresReview: auditLog.securityContext?.requiresReview || false
    };
  }
  
  /**
   * Generate title and description for timeline item
   */
  private static generateTimelineContent(auditLog: any): { title: string; description: string } {
    const { action, actorName, targetResource, changes } = auditLog;
    const actor = actorName || 'Unknown User';
    
    switch (action) {
      case AuditAction.TRANSFER_CREATED:
        return {
          title: `Transfer created by ${actor}`,
          description: `New transfer request created for ${targetResource?.name || 'patient'}`
        };
        
      case AuditAction.TRANSFER_APPROVED:
        return {
          title: `Transfer approved by ${actor}`,
          description: `Transfer request has been approved`
        };
        
      case AuditAction.TRANSFER_REJECTED:
        return {
          title: `Transfer rejected by ${actor}`,
          description: `Transfer request has been rejected${changes?.summary ? `: ${changes.summary}` : ''}`
        };
        
      case AuditAction.TRANSFER_COMPLETED:
        return {
          title: `Transfer completed by ${actor}`,
          description: `Transfer has been completed successfully`
        };
        
      case AuditAction.TRANSFER_CANCELLED:
        return {
          title: `Transfer cancelled by ${actor}`,
          description: `Transfer request has been cancelled${changes?.summary ? `: ${changes.summary}` : ''}`
        };
        
      case AuditAction.TRANSFER_REASSIGNED:
        return {
          title: `Transfer reassigned by ${actor}`,
          description: `Transfer has been reassigned to a different manager`
        };
        
      case AuditAction.FILE_UPLOADED:
        return {
          title: `Document uploaded by ${actor}`,
          description: `New document: ${changes?.after?.fileName || 'Unknown file'}`
        };
        
      case AuditAction.FILE_DOWNLOADED:
        return {
          title: `Document downloaded by ${actor}`,
          description: `Document downloaded: ${changes?.after?.fileName || 'Unknown file'}`
        };
        
      case AuditAction.FILE_DELETED:
        return {
          title: `Document deleted by ${actor}`,
          description: `Document deleted: ${changes?.before?.fileName || 'Unknown file'}`
        };
        
      case AuditAction.LOGIN_SUCCESS:
        return {
          title: `User logged in`,
          description: `${actor} logged into the system`
        };
        
      case AuditAction.LOGOUT:
        return {
          title: `User logged out`,
          description: `${actor} logged out of the system`
        };
        
      case AuditAction.NOTIFICATION_SENT:
        return {
          title: `Notification sent by ${actor}`,
          description: `Notification sent to relevant parties`
        };
        
      case AuditAction.SYSTEM_MAINTENANCE:
        return {
          title: `System maintenance performed`,
          description: `System maintenance completed by ${actor}`
        };
        
      default:
        return {
          title: `Action performed by ${actor}`,
          description: auditLog.description || `Action: ${action}`
        };
    }
  }
  
  /**
   * Extract status after this event
   */
  private static extractStatusAfter(auditLog: any): string | undefined {
    if (auditLog.changes?.after?.status) {
      return auditLog.changes.after.status;
    }
    
    // Check if this is a status change action
    const statusChangeActions = [
      AuditAction.TRANSFER_APPROVED,
      AuditAction.TRANSFER_REJECTED,
      AuditAction.TRANSFER_COMPLETED,
      AuditAction.TRANSFER_CANCELLED
    ];
    
    if (statusChangeActions.includes(auditLog.action)) {
      return auditLog.action.replace('TRANSFER_', '').toLowerCase();
    }
    
    return undefined;
  }
  
  /**
   * Extract assignee after this event
   */
  private static extractAssignedToAfter(auditLog: any): string | undefined {
    if (auditLog.changes?.after?.assignedTo) {
      return auditLog.changes.after.assignedTo;
    }
    
    if (auditLog.changes?.after?.managerId) {
      return auditLog.changes.after.managerId;
    }
    
    return undefined;
  }
  
  /**
   * Extract attachments from audit log
   */
  private static extractAttachments(auditLog: any): any[] | undefined {
    if (auditLog.action === AuditAction.FILE_UPLOADED && auditLog.changes?.after) {
      return [{
        type: auditLog.changes.after.documentType || 'file',
        name: auditLog.changes.after.fileName || 'Unknown file',
        size: auditLog.changes.after.fileSize || 0,
        url: auditLog.changes.after.fileUrl
      }];
    }
    
    if (auditLog.action === AuditAction.FILE_DOWNLOADED && auditLog.changes?.after) {
      return [{
        type: auditLog.changes.after.documentType || 'file',
        name: auditLog.changes.after.fileName || 'Unknown file',
        size: auditLog.changes.after.fileSize || 0,
        url: auditLog.changes.after.fileUrl
      }];
    }
    
    return undefined;
  }
}
