/**
 * Timeline Service
 * 
 * Handles comprehensive timeline tracking for transfer requests.
 * Automatically creates timeline events for all transfer-related actions.
 */

import { Types } from 'mongoose';
import { TimelineEvent, TimelineEventType } from '@/types/transfer-types';

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
   * Create a transfer creation event
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
   * Create a status change event
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
}

export default TimelineService;
