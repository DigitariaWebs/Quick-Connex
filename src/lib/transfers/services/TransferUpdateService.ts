/**
 * Transfer Update Service
 * 
 * Centralized service for updating transfers with integrated audit logging,
 * validation, and status transition management.
 */

import { Types } from 'mongoose';
import { ITransfer } from '@/models/Transfer';
import { TransferStatus, TransferPriority } from '@/lib/transfers/core/constants';
import { validateStatusTransition } from '@/lib/transfers/utils/validation';
import { TimelineService } from '@/lib/transfers/core/TimelineService';
import { extractRequestInfo } from '@/lib/audit/utils/request';
import { AuditRequestInfo } from '@/lib/audit/core/types';
import { TimelineEventType } from '@/types/transfers/transfer.types';

/**
 * Actor information for audit logging
 */
export interface ActorInfo {
  id: Types.ObjectId;
  name: string;
  email: string;
  userType: 'admin' | 'manager' | 'employee';
}

/**
 * Transfer Update Service
 */
export class TransferUpdateService {
  /**
   * Update transfer status with validation and audit logging
   * 
   * @param customEventType - Optional custom timeline event type (e.g., 'approved', 'rejected')
   *                          If provided, this event type will be used instead of 'status_changed'
   *                          If not provided, defaults to 'status_changed'
   */
  static async updateStatus(
    transfer: ITransfer,
    newStatus: TransferStatus,
    actor: ActorInfo,
    reason?: string,
    requestInfo?: AuditRequestInfo,
    customEventType?: string
  ): Promise<void> {
    const currentStatus = transfer.status as TransferStatus;

    // Validate status transition
    if (!validateStatusTransition(currentStatus, newStatus)) {
      throw new Error(
        `Invalid status transition: cannot change from ${currentStatus} to ${newStatus}`
      );
    }

    // Update transfer status
    transfer.status = newStatus;
    transfer.lastModifiedBy = actor.id;

    // Add to status history
    transfer.statusHistory.push({
      status: newStatus,
      changedBy: actor.id,
      changedAt: new Date(),
      reason: reason || `Status changed from ${currentStatus} to ${newStatus}`
    });

    // Save transfer
    await transfer.save();

    // Create timeline event with audit logging
    if (requestInfo) {
      // Determine event type and details based on customEventType or default
      const eventType: TimelineEventType = (customEventType as TimelineEventType) || 'status_changed';
      
      // Generate appropriate title and description based on event type
      let title: string;
      let description: string;
      
      if (customEventType === 'approved') {
        title = 'Transfer Approved';
        description = `Transfer has been approved${reason ? `: ${reason}` : ''}`;
      } else if (customEventType === 'rejected') {
        title = 'Transfer Rejected';
        description = `Transfer has been rejected${reason ? `: ${reason}` : ''}`;
      } else {
        // Default status_changed behavior
        title = `Status Changed: ${currentStatus} → ${newStatus}`;
        description = `Transfer status changed from ${currentStatus} to ${newStatus}${reason ? ` - ${reason}` : ''}`;
      }

      await TimelineService.createEventWithAudit(
        {
          type: eventType,
          title,
          description,
          actor: {
            id: actor.id,
            name: actor.name,
            email: actor.email,
            userType: actor.userType
          },
          metadata: {
            oldValue: currentStatus,
            newValue: newStatus,
            reason,
            details: customEventType 
              ? `${customEventType.charAt(0).toUpperCase() + customEventType.slice(1)} by ${actor.name}`
              : `Status transition from ${currentStatus} to ${newStatus}`
          }
        },
        transfer.transferId,
        requestInfo
      );
    }
  }

  /**
   * Update transfer priority with audit logging
   */
  static async updatePriority(
    transfer: ITransfer,
    newPriority: TransferPriority,
    actor: ActorInfo,
    reason?: string,
    requestInfo?: AuditRequestInfo
  ): Promise<void> {
    const oldPriority = transfer.priority;

    // Update transfer priority
    transfer.priority = newPriority;
    transfer.lastModifiedBy = actor.id;

    // Save transfer
    await transfer.save();

    // Create priority change event with audit logging
    if (requestInfo) {
      await TimelineService.createEventWithAudit(
        {
          type: 'priority_changed',
          title: 'Priority Updated',
          description: `Transfer priority changed from ${oldPriority} to ${newPriority}`,
          actor: {
            id: actor.id,
            name: actor.name,
            email: actor.email,
            userType: actor.userType
          },
          metadata: {
            oldValue: oldPriority,
            newValue: newPriority,
            reason: reason || `Priority changed from ${oldPriority} to ${newPriority}`,
            details: `Priority level changed from ${oldPriority} to ${newPriority}`
          }
        },
        transfer.transferId,
        requestInfo
      );
    }
  }

  /**
   * Assign transfer to a user with audit logging
   */
  static async assignTransfer(
    transfer: ITransfer,
    assignedToUserId: Types.ObjectId,
    assignedToUserInfo: { name: string; email: string },
    actor: ActorInfo,
    reason?: string,
    requestInfo?: AuditRequestInfo
  ): Promise<void> {
    const oldAssignee = transfer.assignedTo;

    // Update transfer assignment
    transfer.assignedTo = assignedToUserId;
    transfer.lastModifiedBy = actor.id;

    // Save transfer
    await transfer.save();

    // Create assignment event with audit logging
    if (requestInfo) {
      await TimelineService.createEventWithAudit(
        {
          type: 'assigned',
          title: 'Transfer Assigned',
          description: `Transfer has been assigned to ${assignedToUserInfo.name}`,
          actor: {
            id: actor.id,
            name: actor.name,
            email: actor.email,
            userType: actor.userType
          },
          metadata: {
            assignedTo: {
              id: assignedToUserId,
              name: assignedToUserInfo.name,
              email: assignedToUserInfo.email
            },
            reason: reason || 'Transfer assigned to employee',
            details: `Assigned to: ${assignedToUserInfo.name} (${assignedToUserInfo.email})`
          }
        },
        transfer.transferId,
        requestInfo
      );
    }
  }

  /**
   * Update transfer notes with audit logging
   */
  static async updateNotes(
    transfer: ITransfer,
    newNotes: string,
    actor: ActorInfo,
    reason?: string,
    requestInfo?: AuditRequestInfo
  ): Promise<void> {
    const oldNotes = transfer.notes || '';

    // Update transfer notes
    transfer.notes = newNotes;
    transfer.lastModifiedBy = actor.id;

    // Save transfer
    await transfer.save();

    // Create notes update event with audit logging
    if (requestInfo) {
      await TimelineService.createEventWithAudit(
        {
          type: 'notes_updated',
          title: 'Notes Updated',
          description: 'Transfer notes have been updated',
          actor: {
            id: actor.id,
            name: actor.name,
            email: actor.email,
            userType: actor.userType
          },
          metadata: {
            oldValue: oldNotes,
            newValue: newNotes,
            reason: reason || 'Notes updated',
            details: 'Additional notes or comments have been added'
          }
        },
        transfer.transferId,
        requestInfo
      );
    }
  }

  /**
   * Generic update method for multiple fields
   */
  static async updateTransfer(
    transfer: ITransfer,
    updates: {
      status?: TransferStatus;
      priority?: TransferPriority;
      assignedTo?: Types.ObjectId;
      notes?: string;
      [key: string]: any;
    },
    actor: ActorInfo,
    reason?: string,
    requestInfo?: AuditRequestInfo
  ): Promise<void> {
    const changes: string[] = [];

    // Track changes for audit
    if (updates.status && updates.status !== transfer.status) {
      await this.updateStatus(transfer, updates.status, actor, reason, requestInfo);
      changes.push('status');
    }

    if (updates.priority && updates.priority !== transfer.priority) {
      await this.updatePriority(transfer, updates.priority, actor, reason, requestInfo);
      changes.push('priority');
    }

    if (updates.assignedTo && updates.assignedTo.toString() !== transfer.assignedTo?.toString()) {
      // Note: This requires user info, so this method may need the user fetched first
      // For now, we'll handle assignment separately
      changes.push('assignedTo');
    }

    if (updates.notes && updates.notes !== transfer.notes) {
      await this.updateNotes(transfer, updates.notes, actor, reason, requestInfo);
      changes.push('notes');
    }

    // Update any other fields
    Object.keys(updates).forEach(key => {
      if (!['status', 'priority', 'assignedTo', 'notes'].includes(key) && updates[key] !== undefined) {
        (transfer as any)[key] = updates[key];
        changes.push(key);
      }
    });

    if (changes.length > 0) {
      transfer.lastModifiedBy = actor.id;
      await transfer.save();
    }
  }
}

