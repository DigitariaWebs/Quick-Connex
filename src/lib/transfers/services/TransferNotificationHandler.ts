/**
 * Transfer Notification Handler
 * 
 * Handles notification events for transfer operations.
 */

import { Types } from 'mongoose';
import { DatabaseService } from '../../database';
import Notification from '@/models/Notification';
import {
  TransferPriority,
  NOTIFICATION_TYPES
} from '../core/constants';
import { TRANSFER_CONFIG } from '../core/config';
import {
  TransferEventType,
  TransferEventData,
  TransferEventHandler,
  TransferNotificationData
} from './types';
import { TransferResponse } from '@/types/transfer';

export class TransferNotificationHandler implements TransferEventHandler {
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
      priority: transfer.priority === TransferPriority.URGENT ? 'urgent' : 'low',
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
      priority: 'low',
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
      priority: 'low',
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
      priority: 'low',
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
      priority: 'urgent',
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
      priority: 'low',
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
      // Note: Real-time notifications are handled by SSE system
      // The SSE system will pick up database changes and send notifications

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
      // Note: Real-time notifications are handled by SSE system
      // The SSE system will pick up database changes and send notifications

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
      // DatabaseService handles connection automatically

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

