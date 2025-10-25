/**
 * Timeline Event Creators
 * 
 * Static methods for creating timeline events for transfer operations.
 */

import { Types } from 'mongoose';
import { TimelineEvent, TimelineEventType } from '@/types/transfer';
import { TimelineEventData } from '../core/types';

/**
 * Generate a unique event ID
 */
export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a timeline event
 */
export function createEvent(data: TimelineEventData): TimelineEvent {
  return {
    id: generateEventId(),
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
 * Create transfer created event
 */
export function createTransferCreatedEvent(
  actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
  transferId: string,
  patientName: string,
  fromHospital: string,
  toHospital: string
): TimelineEvent {
  return createEvent({
    type: 'created',
    title: 'Transfer Request Created',
    description: `Transfer request created for ${patientName} from ${fromHospital} to ${toHospital}`,
    actor,
    metadata: {
      transferId,
      patientName,
      fromHospital,
      toHospital
    }
  });
}

/**
 * Create status change event
 */
export function createStatusChangeEvent(
  actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
  oldStatus: string,
  newStatus: string,
  reason?: string
): TimelineEvent {
  return createEvent({
    type: 'status_changed',
    title: 'Status Changed',
    description: `Status changed from ${oldStatus} to ${newStatus}${reason ? ` - ${reason}` : ''}`,
    actor,
    metadata: {
      oldValue: oldStatus,
      newValue: newStatus,
      reason
    }
  });
}

/**
 * Create approval event
 */
export function createApprovalEvent(
  actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
  reason?: string
): TimelineEvent {
  return createEvent({
    type: 'approved',
    title: 'Transfer Approved',
    description: `Transfer approved${reason ? ` - ${reason}` : ''}`,
    actor,
    metadata: {
      reason
    }
  });
}

/**
 * Create rejection event
 */
export function createRejectionEvent(
  actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
  reason?: string
): TimelineEvent {
  return createEvent({
    type: 'rejected',
    title: 'Transfer Rejected',
    description: `Transfer rejected${reason ? ` - ${reason}` : ''}`,
    actor,
    metadata: {
      reason
    }
  });
}

/**
 * Create assignment event
 */
export function createAssignmentEvent(
  actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
  assigneeName: string,
  assigneeEmail: string
): TimelineEvent {
  return createEvent({
    type: 'assigned',
    title: 'Transfer Assigned',
    description: `Transfer assigned to ${assigneeName}`,
    actor,
    metadata: {
      assigneeName,
      assigneeEmail
    }
  });
}

/**
 * Create unassignment event
 */
export function createUnassignmentEvent(
  actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
  previousAssignee: string,
  reason?: string
): TimelineEvent {
  return createEvent({
    type: 'unassigned',
    title: 'Transfer Unassigned',
    description: `Transfer unassigned from ${previousAssignee}${reason ? ` - ${reason}` : ''}`,
    actor,
    metadata: {
      previousAssignee,
      reason
    }
  });
}

/**
 * Create acceptance event
 */
export function createAcceptanceEvent(
  actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
  notes?: string
): TimelineEvent {
  return createEvent({
    type: 'accepted',
    title: 'Transfer Accepted',
    description: `Transfer accepted${notes ? ` - ${notes}` : ''}`,
    actor,
    metadata: {
      notes
    }
  });
}

/**
 * Create completion event
 */
export function createCompletionEvent(
  actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
  completionNotes?: string
): TimelineEvent {
  return createEvent({
    type: 'completed',
    title: 'Transfer Completed',
    description: `Transfer completed${completionNotes ? ` - ${completionNotes}` : ''}`,
    actor,
    metadata: {
      completionNotes
    }
  });
}

/**
 * Create cancellation event
 */
export function createCancellationEvent(
  actor: { id: Types.ObjectId; name: string; email: string; userType: 'manager' | 'employee' | 'admin' },
  reason: string
): TimelineEvent {
  return createEvent({
    type: 'cancelled',
    title: 'Transfer Cancelled',
    description: `Transfer cancelled - ${reason}`,
    actor,
    metadata: {
      reason
    }
  });
}

/**
 * Create system event
 */
export function createSystemEvent(
  title: string,
  description: string,
  metadata?: Record<string, any>
): TimelineEvent {
  return createEvent({
    type: 'system',
    title,
    description,
    actor: {
      id: new Types.ObjectId(),
      name: 'System',
      email: 'system@hospital.com',
      userType: 'admin'
    },
    metadata,
    isSystemEvent: true
  });
}
