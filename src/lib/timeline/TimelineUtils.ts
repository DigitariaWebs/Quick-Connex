/**
 * Timeline Utility Functions
 * 
 * Helper functions for timeline operations, formatting, and content generation
 */

import { AuditAction, AuditCategory, ActorType, RiskLevel } from '@/models/AuditLog';
import { TimelineItem, EVENT_KIND_MAPPING, BADGE_MAPPING, TAG_MAPPING } from '@/types/timeline';

export class TimelineUtils {
  
  /**
   * Get event kind from audit action
   */
  static getEventKind(action: AuditAction): string {
    return EVENT_KIND_MAPPING[action] || 'unknown';
  }
  
  /**
   * Get badges for an event kind
   */
  static getEventBadges(kind: string): string[] {
    return BADGE_MAPPING[kind] || [];
  }
  
  /**
   * Get tags for an event kind
   */
  static getEventTags(kind: string): string[] {
    return TAG_MAPPING[kind] || [];
  }
  
  /**
   * Generate human-readable title for an event
   */
  static generateEventTitle(action: AuditAction, actorName: string, targetName?: string): string {
    const actor = actorName || 'Unknown User';
    
    switch (action) {
      case AuditAction.TRANSFER_CREATED:
        return `Transfer created by ${actor}`;
      case AuditAction.TRANSFER_APPROVED:
        return `Transfer approved by ${actor}`;
      case AuditAction.TRANSFER_REJECTED:
        return `Transfer rejected by ${actor}`;
      case AuditAction.TRANSFER_COMPLETED:
        return `Transfer completed by ${actor}`;
      case AuditAction.TRANSFER_CANCELLED:
        return `Transfer cancelled by ${actor}`;
      case AuditAction.TRANSFER_REASSIGNED:
        return `Transfer reassigned by ${actor}`;
      case AuditAction.FILE_UPLOADED:
        return `Document uploaded by ${actor}`;
      case AuditAction.FILE_DOWNLOADED:
        return `Document downloaded by ${actor}`;
      case AuditAction.FILE_DELETED:
        return `Document deleted by ${actor}`;
      case AuditAction.LOGIN_SUCCESS:
        return `User logged in`;
      case AuditAction.LOGOUT:
        return `User logged out`;
      case AuditAction.NOTIFICATION_SENT:
        return `Notification sent by ${actor}`;
      case AuditAction.SYSTEM_MAINTENANCE:
        return `System maintenance performed`;
      default:
        return `Action performed by ${actor}`;
    }
  }
  
  /**
   * Generate detailed description for an event
   */
  static generateEventDescription(
    action: AuditAction, 
    actorName: string, 
    targetName?: string, 
    changes?: any
  ): string {
    const actor = actorName || 'Unknown User';
    
    switch (action) {
      case AuditAction.TRANSFER_CREATED:
        return `New transfer request created for ${targetName || 'patient'}`;
      case AuditAction.TRANSFER_APPROVED:
        return `Transfer request has been approved`;
      case AuditAction.TRANSFER_REJECTED:
        const rejectionReason = changes?.summary || changes?.reason || '';
        return `Transfer request has been rejected${rejectionReason ? `: ${rejectionReason}` : ''}`;
      case AuditAction.TRANSFER_COMPLETED:
        return `Transfer has been completed successfully`;
      case AuditAction.TRANSFER_CANCELLED:
        const cancellationReason = changes?.summary || changes?.reason || '';
        return `Transfer request has been cancelled${cancellationReason ? `: ${cancellationReason}` : ''}`;
      case AuditAction.TRANSFER_REASSIGNED:
        return `Transfer has been reassigned to a different manager`;
      case AuditAction.FILE_UPLOADED:
        const fileName = changes?.after?.fileName || 'Unknown file';
        return `New document: ${fileName}`;
      case AuditAction.FILE_DOWNLOADED:
        const downloadedFile = changes?.after?.fileName || 'Unknown file';
        return `Document downloaded: ${downloadedFile}`;
      case AuditAction.FILE_DELETED:
        const deletedFile = changes?.before?.fileName || 'Unknown file';
        return `Document deleted: ${deletedFile}`;
      case AuditAction.LOGIN_SUCCESS:
        return `${actor} logged into the system`;
      case AuditAction.LOGOUT:
        return `${actor} logged out of the system`;
      case AuditAction.NOTIFICATION_SENT:
        return `Notification sent to relevant parties`;
      case AuditAction.SYSTEM_MAINTENANCE:
        return `System maintenance completed by ${actor}`;
      default:
        return `Action: ${action}`;
    }
  }
  
  /**
   * Extract status from event changes
   */
  static extractStatusFromChanges(action: AuditAction, changes?: any): string | undefined {
    if (changes?.after?.status) {
      return changes.after.status;
    }
    
    // Map action to status
    const statusMap: Partial<Record<AuditAction, string>> = {
      [AuditAction.TRANSFER_APPROVED]: 'approved',
      [AuditAction.TRANSFER_REJECTED]: 'rejected',
      [AuditAction.TRANSFER_COMPLETED]: 'completed',
      [AuditAction.TRANSFER_CANCELLED]: 'cancelled',
      [AuditAction.TRANSFER_CREATED]: 'pending'
    };
    
    return statusMap[action] || 'unknown';
  }
  
  /**
   * Extract assignee from event changes
   */
  static extractAssigneeFromChanges(changes?: any): string | undefined {
    if (changes?.after?.assignedTo) {
      return changes.after.assignedTo;
    }
    
    if (changes?.after?.managerId) {
      return changes.after.managerId;
    }
    
    if (changes?.after?.managerName) {
      return changes.after.managerName;
    }
    
    return undefined;
  }
  
  /**
   * Extract attachments from event changes
   */
  static extractAttachmentsFromChanges(action: AuditAction, changes?: any): any[] | undefined {
    if (action === AuditAction.FILE_UPLOADED && changes?.after) {
      return [{
        type: changes.after.documentType || 'file',
        name: changes.after.fileName || 'Unknown file',
        size: changes.after.fileSize || 0,
        url: changes.after.fileUrl
      }];
    }
    
    if (action === AuditAction.FILE_DOWNLOADED && changes?.after) {
      return [{
        type: changes.after.documentType || 'file',
        name: changes.after.fileName || 'Unknown file',
        size: changes.after.fileSize || 0,
        url: changes.after.fileUrl
      }];
    }
    
    return undefined;
  }
  
  /**
   * Format timestamp for display
   */
  static formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (days < 7) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  }
  
  /**
   * Get actor display name
   */
  static getActorDisplayName(actor: {
    name?: string;
    email?: string;
    type: ActorType;
  }): string {
    if (actor.name) {
      return actor.name;
    }
    
    if (actor.email) {
      return actor.email;
    }
    
    switch (actor.type) {
      case ActorType.SYSTEM:
        return 'System';
      case ActorType.API:
        return 'API';
      case ActorType.BATCH:
        return 'Batch Process';
      default:
        return 'Unknown User';
    }
  }
  
  /**
   * Get actor avatar/icon
   */
  static getActorIcon(actorType: ActorType): string {
    switch (actorType) {
      case ActorType.ADMIN:
        return '👤';
      case ActorType.USER:
        return '👤';
      case ActorType.SYSTEM:
        return '⚙️';
      case ActorType.API:
        return '🔌';
      case ActorType.BATCH:
        return '🔄';
      default:
        return '❓';
    }
  }
  
  /**
   * Get event icon
   */
  static getEventIcon(kind: string): string {
    const iconMap: Record<string, string> = {
      'transfer_created': '📝',
      'transfer_approved': '✅',
      'transfer_rejected': '❌',
      'transfer_completed': '🎉',
      'transfer_cancelled': '🚫',
      'transfer_reassigned': '🔄',
      'document_added': '📎',
      'document_downloaded': '⬇️',
      'document_deleted': '🗑️',
      'user_login': '🔐',
      'user_logout': '🚪',
      'notification_sent': '📢',
      'system_maintenance': '🔧'
    };
    
    return iconMap[kind] || '📋';
  }
  
  /**
   * Get risk level color
   */
  static getRiskLevelColor(riskLevel: RiskLevel): string {
    switch (riskLevel) {
      case RiskLevel.LOW:
        return 'green';
      case RiskLevel.MEDIUM:
        return 'yellow';
      case RiskLevel.HIGH:
        return 'orange';
      case RiskLevel.CRITICAL:
        return 'red';
      default:
        return 'gray';
    }
  }
  
  /**
   * Filter timeline items by search query
   */
  static filterTimelineItems(items: TimelineItem[], searchQuery: string): TimelineItem[] {
    if (!searchQuery.trim()) {
      return items;
    }
    
    const query = searchQuery.toLowerCase();
    
    return items.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.actor.name.toLowerCase().includes(query) ||
      item.actor.email.toLowerCase().includes(query) ||
      item.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }
  
  /**
   * Group timeline items by date
   */
  static groupTimelineItemsByDate(items: TimelineItem[]): Record<string, TimelineItem[]> {
    const groups: Record<string, TimelineItem[]> = {};
    
    items.forEach(item => {
      const date = item.timestamp.toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });
    
    return groups;
  }
  
  /**
   * Sort timeline items by timestamp
   */
  static sortTimelineItems(items: TimelineItem[], ascending: boolean = false): TimelineItem[] {
    return items.sort((a, b) => {
      const comparison = a.timestamp.getTime() - b.timestamp.getTime();
      return ascending ? comparison : -comparison;
    });
  }
}

