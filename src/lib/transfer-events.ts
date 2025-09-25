/**
 * Transfer Event System for Notifications
 * 
 * This file contains the event system for transfer notifications,
 * including event types, event handlers, and notification management.
 */

import { Types } from 'mongoose';
import connectDB from './mongodb';
import Notification from '@/models/Notification';
import { getNotificationService } from './socket-server';
import {
  TransferStatus,
  TransferPriority,
  NOTIFICATION_TYPES,
  TRANSFER_CONFIG
} from '@/constants/transfer-constants';
import {
  ITransfer,
  TransferResponse,
  TransferNotificationData,
  UserInfo,
  PatientInfo
} from '@/types/transfer-types';

/**
 * Transfer Event Types
 */
export enum TransferEventType {
  TRANSFER_CREATED = 'transfer_created',
  TRANSFER_ACCEPTED = 'transfer_accepted',
  TRANSFER_STARTED = 'transfer_started',
  TRANSFER_COMPLETED = 'transfer_completed',
  TRANSFER_CANCELLED = 'transfer_cancelled',
  TRANSFER_STATUS_CHANGED = 'transfer_status_changed',
  TRANSFER_ASSIGNED = 'transfer_assigned',
  TRANSFER_REMINDER = 'transfer_reminder',
  TRANSFER_TIMEOUT = 'transfer_timeout',
  // Note: TRANSFER_CONFLICT_DETECTED removed as hospitals handle their own logistics
  TRANSFER_URGENT_ALERT = 'transfer_urgent_alert'
}

/**
 * Transfer Event Data Interface
 */
export interface TransferEventData {
  transferId: string;
  transfer: TransferResponse;
  oldStatus?: TransferStatus;
  newStatus?: TransferStatus;
  changedBy: UserInfo;
  timestamp: string;
  metadata?: {
    reason?: string;
    notes?: string;
    // Note: conflicts field removed as hospitals handle their own logistics
    urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Transfer Event Handler Interface
 */
export interface TransferEventHandler {
  eventType: TransferEventType;
  handle(eventType: TransferEventType, eventData: TransferEventData): Promise<void>;
}

/**
 * Transfer Event Manager
 */
export class TransferEventManager {
  private static handlers: Map<TransferEventType, TransferEventHandler[]> = new Map();
  private static isInitialized = false;

  /**
   * Initialize the event system
   */
  static initialize(): void {
    if (this.isInitialized) return;

    // Register default handlers
    this.registerHandler(new TransferNotificationHandler());
    this.registerHandler(new TransferAuditHandler());
    this.registerHandler(new TransferReminderHandler());
    // Note: TransferConflictHandler removed as hospitals handle their own logistics

    this.isInitialized = true;
    console.log('🔄 Transfer Event System initialized');
  }

  /**
   * Register an event handler
   */
  static registerHandler(handler: TransferEventHandler): void {
    const handlers = this.handlers.get(handler.eventType) || [];
    handlers.push(handler);
    this.handlers.set(handler.eventType, handlers);
  }

  /**
   * Emit a transfer event
   */
  static async emitEvent(
    eventType: TransferEventType,
    eventData: TransferEventData
  ): Promise<void> {
    try {
      const handlers = this.handlers.get(eventType) || [];
      
      // Execute all handlers for this event type
      await Promise.all(
        handlers.map(handler => 
          this.executeHandler(handler, eventType, eventData)
        )
      );

      console.log(`📡 Transfer event emitted: ${eventType}`, {
        transferId: eventData.transferId,
        timestamp: eventData.timestamp
      });

    } catch (error) {
      console.error('Error emitting transfer event:', error);
      // Don't throw - event emission should not break the main flow
    }
  }

  /**
   * Execute a single handler with error handling
   */
  private static async executeHandler(
    handler: TransferEventHandler,
    eventType: TransferEventType,
    eventData: TransferEventData
  ): Promise<void> {
    try {
      await handler.handle(eventType, eventData);
    } catch (error) {
      console.error(`Error in event handler for ${handler.eventType}:`, error);
    }
  }
}

/**
 * Transfer Notification Handler
 */
class TransferNotificationHandler implements TransferEventHandler {
  eventType = TransferEventType.TRANSFER_CREATED;

  async handle(eventType: TransferEventType, eventData: TransferEventData): Promise<void> {
    const { transfer } = eventData;
    
    // Handle different event types
    switch (eventType) {
      case TransferEventType.TRANSFER_CREATED:
        await this.handleTransferCreated(eventData);
        break;
      case TransferEventType.TRANSFER_ACCEPTED:
        await this.handleTransferAccepted(eventData);
        break;
      case TransferEventType.TRANSFER_STARTED:
        await this.handleTransferStarted(eventData);
        break;
      case TransferEventType.TRANSFER_COMPLETED:
        await this.handleTransferCompleted(eventData);
        break;
      case TransferEventType.TRANSFER_CANCELLED:
        await this.handleTransferCancelled(eventData);
        break;
      case TransferEventType.TRANSFER_STATUS_CHANGED:
        await this.handleStatusChanged(eventData);
        break;
      case TransferEventType.TRANSFER_URGENT_ALERT:
        await this.handleUrgentAlert(eventData);
        break;
    }
  }

  private async handleTransferCreated(eventData: TransferEventData): Promise<void> {
    const { transfer, changedBy } = eventData;
    
    const notificationData: TransferNotificationData = {
      id: `new_transfer_${transfer._id}_${Date.now()}`,
      type: NOTIFICATION_TYPES.NEW_TRANSFER,
      priority: transfer.priority === TransferPriority.URGENT ? 'urgent' : 'medium',
      title: 'New Transfer Request',
      message: `New transfer request for ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName} from ${transfer.fromHospital} to ${transfer.toHospital}`,
      transferId: transfer.transferId,
      transfer: {
        id: transfer._id,
        transferId: transfer.transferId,
        patientInfo: transfer.patientInfo,
        fromHospital: transfer.fromHospital,
        toHospital: transfer.toHospital,
        priority: transfer.priority,
        status: transfer.status,
        scheduledDate: transfer.scheduledDate ? new Date(transfer.scheduledDate) : undefined
      },
      requestedBy: {
        id: changedBy._id.toString(),
        name: `${changedBy.firstName} ${changedBy.lastName}`,
        userType: changedBy.userType
      },
      timestamp: new Date().toISOString(),
      read: false
    };

    await this.sendNotification(notificationData, 'employee');
  }

  private async handleTransferAccepted(eventData: TransferEventData): Promise<void> {
    const { transfer, changedBy } = eventData;
    
    const notificationData: TransferNotificationData = {
      id: `transfer_accepted_${transfer._id}_${Date.now()}`,
      type: NOTIFICATION_TYPES.TRANSFER_ACCEPTED,
      priority: 'medium',
      title: 'Transfer Accepted',
      message: `Transfer for ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName} has been accepted by ${changedBy.firstName} ${changedBy.lastName}`,
      transferId: transfer.transferId,
      transfer: {
        id: transfer._id,
        transferId: transfer.transferId,
        patientInfo: transfer.patientInfo,
        fromHospital: transfer.fromHospital,
        toHospital: transfer.toHospital,
        priority: transfer.priority,
        status: transfer.status,
        scheduledDate: transfer.scheduledDate ? new Date(transfer.scheduledDate) : undefined
      },
      requestedBy: {
        id: changedBy._id.toString(),
        name: `${changedBy.firstName} ${changedBy.lastName}`,
        userType: changedBy.userType
      },
      timestamp: new Date().toISOString(),
      read: false
    };

    // Send to the person who requested the transfer
    if (transfer.requestedBy) {
      await this.sendNotificationToUser(notificationData, transfer.requestedBy._id.toString());
    }
  }

  private async handleTransferStarted(eventData: TransferEventData): Promise<void> {
    const { transfer, changedBy } = eventData;
    
    const notificationData: TransferNotificationData = {
      id: `transfer_started_${transfer._id}_${Date.now()}`,
      type: NOTIFICATION_TYPES.TRANSFER_STARTED,
      priority: 'medium',
      title: 'Transfer Started',
      message: `Transfer for ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName} has been started`,
      transferId: transfer.transferId,
      transfer: {
        id: transfer._id,
        transferId: transfer.transferId,
        patientInfo: transfer.patientInfo,
        fromHospital: transfer.fromHospital,
        toHospital: transfer.toHospital,
        priority: transfer.priority,
        status: transfer.status,
        scheduledDate: transfer.scheduledDate ? new Date(transfer.scheduledDate) : undefined
      },
      requestedBy: {
        id: changedBy._id.toString(),
        name: `${changedBy.firstName} ${changedBy.lastName}`,
        userType: changedBy.userType
      },
      timestamp: new Date().toISOString(),
      read: false
    };

    // Send to all relevant parties
    await this.sendNotificationToTransferParties(notificationData, transfer);
  }

  private async handleTransferCompleted(eventData: TransferEventData): Promise<void> {
    const { transfer, changedBy } = eventData;
    
    const notificationData: TransferNotificationData = {
      id: `transfer_completed_${transfer._id}_${Date.now()}`,
      type: NOTIFICATION_TYPES.TRANSFER_COMPLETED,
      priority: 'medium',
      title: 'Transfer Completed',
      message: `Transfer for ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName} has been completed successfully`,
      transferId: transfer.transferId,
      transfer: {
        id: transfer._id,
        transferId: transfer.transferId,
        patientInfo: transfer.patientInfo,
        fromHospital: transfer.fromHospital,
        toHospital: transfer.toHospital,
        priority: transfer.priority,
        status: transfer.status,
        scheduledDate: transfer.scheduledDate ? new Date(transfer.scheduledDate) : undefined
      },
      requestedBy: {
        id: changedBy._id.toString(),
        name: `${changedBy.firstName} ${changedBy.lastName}`,
        userType: changedBy.userType
      },
      timestamp: new Date().toISOString(),
      read: false
    };

    // Send to all relevant parties
    await this.sendNotificationToTransferParties(notificationData, transfer);
  }

  private async handleTransferCancelled(eventData: TransferEventData): Promise<void> {
    const { transfer, changedBy, metadata } = eventData;
    
    const notificationData: TransferNotificationData = {
      id: `transfer_cancelled_${transfer._id}_${Date.now()}`,
      type: NOTIFICATION_TYPES.TRANSFER_CANCELLED,
      priority: 'high',
      title: 'Transfer Cancelled',
      message: `Transfer for ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName} has been cancelled${metadata?.reason ? `: ${metadata.reason}` : ''}`,
      transferId: transfer.transferId,
      transfer: {
        id: transfer._id,
        transferId: transfer.transferId,
        patientInfo: transfer.patientInfo,
        fromHospital: transfer.fromHospital,
        toHospital: transfer.toHospital,
        priority: transfer.priority,
        status: transfer.status,
        scheduledDate: transfer.scheduledDate ? new Date(transfer.scheduledDate) : undefined
      },
      requestedBy: {
        id: changedBy._id.toString(),
        name: `${changedBy.firstName} ${changedBy.lastName}`,
        userType: changedBy.userType
      },
      timestamp: new Date().toISOString(),
      read: false
    };

    // Send to all relevant parties
    await this.sendNotificationToTransferParties(notificationData, transfer);
  }

  private async handleStatusChanged(eventData: TransferEventData): Promise<void> {
    const { transfer, oldStatus, newStatus, changedBy } = eventData;
    
    const notificationData: TransferNotificationData = {
      id: `status_changed_${transfer._id}_${Date.now()}`,
      type: NOTIFICATION_TYPES.TRANSFER_STATUS_CHANGE,
      priority: 'medium',
      title: 'Transfer Status Updated',
      message: `Transfer for ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName} status changed from ${oldStatus} to ${newStatus}`,
      transferId: transfer.transferId,
      transfer: {
        id: transfer._id,
        transferId: transfer.transferId,
        patientInfo: transfer.patientInfo,
        fromHospital: transfer.fromHospital,
        toHospital: transfer.toHospital,
        priority: transfer.priority,
        status: transfer.status,
        scheduledDate: transfer.scheduledDate ? new Date(transfer.scheduledDate) : undefined
      },
      requestedBy: {
        id: changedBy._id.toString(),
        name: `${changedBy.firstName} ${changedBy.lastName}`,
        userType: changedBy.userType
      },
      timestamp: new Date().toISOString(),
      read: false
    };

    // Send to all relevant parties
    await this.sendNotificationToTransferParties(notificationData, transfer);
  }

  private async handleUrgentAlert(eventData: TransferEventData): Promise<void> {
    const { transfer, metadata } = eventData;
    
    const notificationData: TransferNotificationData = {
      id: `urgent_alert_${transfer._id}_${Date.now()}`,
      type: NOTIFICATION_TYPES.URGENT_TRANSFER,
      priority: 'urgent',
      title: '🚨 URGENT TRANSFER ALERT',
      message: `URGENT: ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName} requires immediate transfer from ${transfer.fromHospital} to ${transfer.toHospital}`,
      transferId: transfer.transferId,
      transfer: {
        id: transfer._id,
        transferId: transfer.transferId,
        patientInfo: transfer.patientInfo,
        fromHospital: transfer.fromHospital,
        toHospital: transfer.toHospital,
        priority: transfer.priority,
        status: transfer.status,
        scheduledDate: transfer.scheduledDate ? new Date(transfer.scheduledDate) : undefined
      },
      requestedBy: {
        id: transfer.requestedBy._id.toString(),
        name: `${transfer.requestedBy.firstName} ${transfer.requestedBy.lastName}`,
        userType: transfer.requestedBy.userType
      },
      timestamp: new Date().toISOString(),
      read: false
    };

    // Send urgent notification to all employees
    await this.sendNotification(notificationData, 'employee');
  }

  private async sendNotification(
    notificationData: TransferNotificationData,
    targetRole: 'employee' | 'manager' | 'admin'
  ): Promise<void> {
    try {
      // Send real-time notification
      const notificationService = getNotificationService();
      if (notificationService) {
        notificationService.sendToRole(targetRole, notificationData.type, notificationData);
      }

      // Create persistent notification
      await this.createPersistentNotification(notificationData, targetRole);

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  private async sendNotificationToUser(
    notificationData: TransferNotificationData,
    userId: string
  ): Promise<void> {
    try {
      // Send real-time notification
      const notificationService = getNotificationService();
      if (notificationService) {
        notificationService.sendToUser(userId, notificationData.type, notificationData);
      }

      // Create persistent notification
      await this.createPersistentNotification(notificationData, undefined, [userId]);

    } catch (error) {
      console.error('Error sending notification to user:', error);
    }
  }

  private async sendNotificationToTransferParties(
    notificationData: TransferNotificationData,
    transfer: TransferResponse
  ): Promise<void> {
    const targetUsers: string[] = [];
    
    if (transfer.requestedBy) {
      targetUsers.push(transfer.requestedBy._id.toString());
    }
    
    if (transfer.assignedTo) {
      targetUsers.push(transfer.assignedTo._id.toString());
    }

    if (targetUsers.length > 0) {
      await this.createPersistentNotification(notificationData, undefined, targetUsers);
    }
  }

  private async createPersistentNotification(
    notificationData: TransferNotificationData,
    targetRole?: 'employee' | 'manager' | 'admin',
    targetUsers?: string[]
  ): Promise<void> {
    try {
      await connectDB;

      const notification = new Notification({
        id: notificationData.id,
        type: notificationData.type,
        priority: notificationData.priority,
        title: notificationData.title,
        message: notificationData.message,
        targetUsers: targetUsers || [],
        targetRoles: targetRole ? [targetRole] : [],
        transferId: notificationData.transferId,
        transfer: notificationData.transfer.id,
        data: notificationData,
        settings: {
          persistent: true,
          expiresAt: new Date(Date.now() + TRANSFER_CONFIG.TIMEOUTS.NOTIFICATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
        },
        createdBy: new Types.ObjectId(notificationData.requestedBy.id)
      });

      await notification.save();

    } catch (error) {
      console.error('Error creating persistent notification:', error);
    }
  }
}

/**
 * Transfer Audit Handler
 */
class TransferAuditHandler implements TransferEventHandler {
  eventType = TransferEventType.TRANSFER_CREATED;

  async handle(eventType: TransferEventType, eventData: TransferEventData): Promise<void> {
    // Log transfer events for audit purposes
    console.log('📋 Transfer Audit Log:', {
      eventType: eventType,
      transferId: eventData.transferId,
      status: eventData.newStatus || eventData.transfer.status,
      changedBy: eventData.changedBy,
      timestamp: eventData.timestamp,
      metadata: eventData.metadata
    });

    // Here you could implement more sophisticated audit logging
    // such as writing to a dedicated audit database or external service
  }
}

/**
 * Transfer Reminder Handler
 */
class TransferReminderHandler implements TransferEventHandler {
  eventType = TransferEventType.TRANSFER_CREATED;

  async handle(eventType: TransferEventType, eventData: TransferEventData): Promise<void> {
    const { transfer } = eventData;
    
    // Schedule reminders for pending transfers
    if (transfer.status === TransferStatus.PENDING && transfer.scheduledDate) {
      const scheduledDate = new Date(transfer.scheduledDate);
      const now = new Date();
      
      // Schedule reminder 1 hour before transfer
      const reminderTime = new Date(scheduledDate.getTime() - 60 * 60 * 1000);
      
      if (reminderTime > now) {
        setTimeout(async () => {
          await TransferEventManager.emitEvent(TransferEventType.TRANSFER_REMINDER, {
            transferId: transfer._id,
            transfer,
            changedBy: transfer.requestedBy,
            timestamp: new Date().toISOString(),
            metadata: {
              urgencyLevel: 'medium'
            }
          });
        }, reminderTime.getTime() - now.getTime());
      }
    }
  }
}

// Note: TransferConflictHandler removed as hospitals handle their own logistics

/**
 * Transfer Event Factory
 */
export class TransferEventFactory {
  /**
   * Create transfer created event
   */
  static createTransferCreatedEvent(
    transfer: TransferResponse,
    createdBy: UserInfo
  ): TransferEventData {
    return {
      transferId: transfer._id,
      transfer,
      changedBy: createdBy,
      timestamp: new Date().toISOString(),
      metadata: {
        urgencyLevel: transfer.priority === TransferPriority.URGENT ? 'critical' : 'medium'
      }
    };
  }

  /**
   * Create status change event
   */
  static createStatusChangeEvent(
    transfer: TransferResponse,
    oldStatus: TransferStatus,
    newStatus: TransferStatus,
    changedBy: UserInfo,
    reason?: string
  ): TransferEventData {
    return {
      transferId: transfer._id,
      transfer,
      oldStatus,
      newStatus,
      changedBy,
      timestamp: new Date().toISOString(),
      metadata: {
        reason,
        urgencyLevel: transfer.priority === TransferPriority.URGENT ? 'critical' : 'medium'
      }
    };
  }

  /**
   * Create urgent alert event
   */
  static createUrgentAlertEvent(
    transfer: TransferResponse,
    triggeredBy: UserInfo,
    reason: string
  ): TransferEventData {
    return {
      transferId: transfer._id,
      transfer,
      changedBy: triggeredBy,
      timestamp: new Date().toISOString(),
      metadata: {
        reason,
        urgencyLevel: 'critical'
      }
    };
  }
}

/**
 * Initialize the transfer event system
 */
export function initializeTransferEvents(): void {
  TransferEventManager.initialize();
}

