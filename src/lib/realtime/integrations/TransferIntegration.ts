/**
 * Transfer Integration Service
 * 
 * Integrates transfer lifecycle events with the real-time notification system.
 * Handles transfer creation, updates, assignments, and status changes.
 */

import { SocketProvider } from '../providers';
import { NotificationService } from '../core';
import { DashboardIntegrationService } from './DashboardIntegration';
import { log } from '@/lib/logging';
import { 
  SOCKET_EVENTS,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  USER_ROLES
} from '../core/constants';
import { 
  AppError,
  formatErrorForClient 
} from '@/lib/utils/error-handling';

// ===== TRANSFER INTEGRATION SERVICE =====

export class TransferIntegrationService {
  private static instance: TransferIntegrationService;
  private socketProvider: SocketProvider;
  private notificationService: NotificationService;
  private dashboardIntegration: DashboardIntegrationService;

  private constructor() {
    this.socketProvider = SocketProvider.getInstance();
    this.notificationService = NotificationService.getInstance();
    this.dashboardIntegration = DashboardIntegrationService.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TransferIntegrationService {
    if (!TransferIntegrationService.instance) {
      TransferIntegrationService.instance = new TransferIntegrationService();
    }
    return TransferIntegrationService.instance;
  }

  /**
   * Handle transfer creation
   */
  public async handleTransferCreated(
    transfer: any,
    createdBy: any
  ): Promise<void> {
    try {
      log.info('Transfer created - emitting real-time events', {
        transferId: transfer.id,
        createdBy: createdBy._id
      });

      // Emit socket event
      await this.emitTransferEvent(SOCKET_EVENTS.TRANSFER_CREATED, {
        transfer: this.formatTransferData(transfer),
        createdBy: this.formatUserData(createdBy),
        timestamp: new Date()
      });

      // Send notification
      await this.sendTransferNotification(
        NOTIFICATION_TYPES.NEW_TRANSFER,
        'New Transfer Created',
        `Transfer ${transfer.transferId} has been created`,
        transfer,
        createdBy,
        this.getTargetUsersForNewTransfer(transfer, createdBy)
      );

      // Update dashboard
      await this.dashboardIntegration.handleNewTransfer(transfer, createdBy);

      // Join transfer room
      await this.joinTransferRoom(transfer.id, createdBy._id);

    } catch (error) {
      log.error('Failed to handle transfer creation:', error);
      throw error;
    }
  }

  /**
   * Handle transfer status change
   */
  public async handleTransferStatusChange(
    transfer: any,
    oldStatus: string,
    newStatus: string,
    changedBy: any
  ): Promise<void> {
    try {
      log.info('Transfer status changed - emitting real-time events', {
        transferId: transfer.id,
        oldStatus,
        newStatus,
        changedBy: changedBy._id
      });

      // Emit socket event
      await this.emitTransferEvent(SOCKET_EVENTS.TRANSFER_STATUS_CHANGED, {
        transfer: this.formatTransferData(transfer),
        oldStatus,
        newStatus,
        changedBy: this.formatUserData(changedBy),
        timestamp: new Date()
      });

      // Send notification
      await this.sendTransferNotification(
        NOTIFICATION_TYPES.TRANSFER_STATUS_CHANGE,
        'Transfer Status Updated',
        `Transfer ${transfer.transferId} status changed from ${oldStatus} to ${newStatus}`,
        transfer,
        changedBy,
        this.getTargetUsersForStatusChange(transfer, changedBy)
      );

      // Update dashboard
      await this.dashboardIntegration.handleTransferStatusChange(
        transfer,
        oldStatus,
        newStatus,
        changedBy
      );

      // Handle specific status changes
      if (newStatus === 'completed') {
        await this.handleTransferCompleted(transfer, changedBy);
      } else if (newStatus === 'cancelled') {
        await this.handleTransferCancelled(transfer, changedBy);
      }

    } catch (error) {
      log.error('Failed to handle transfer status change:', error);
      throw error;
    }
  }

  /**
   * Handle transfer assignment
   */
  public async handleTransferAssigned(
    transfer: any,
    assignedTo: any,
    assignedBy: any
  ): Promise<void> {
    try {
      log.info('Transfer assigned - emitting real-time events', {
        transferId: transfer.id,
        assignedTo: assignedTo._id,
        assignedBy: assignedBy._id
      });

      // Emit socket event
      await this.emitTransferEvent(SOCKET_EVENTS.TRANSFER_ASSIGNED, {
        transfer: this.formatTransferData(transfer),
        assignedTo: this.formatUserData(assignedTo),
        assignedBy: this.formatUserData(assignedBy),
        timestamp: new Date()
      });

      // Send notification to assigned user
      await this.sendTransferNotification(
        NOTIFICATION_TYPES.NEW_TRANSFER,
        'Transfer Assigned',
        `Transfer ${transfer.transferId} has been assigned to you`,
        transfer,
        assignedBy,
        [assignedTo._id]
      );

      // Join transfer room for assigned user
      await this.joinTransferRoom(transfer.id, assignedTo._id);

    } catch (error) {
      log.error('Failed to handle transfer assignment:', error);
      throw error;
    }
  }

  /**
   * Handle transfer completion
   */
  public async handleTransferCompleted(
    transfer: any,
    completedBy: any
  ): Promise<void> {
    try {
      log.info('Transfer completed - emitting real-time events', {
        transferId: transfer.id,
        completedBy: completedBy._id
      });

      // Emit socket event
      await this.emitTransferEvent(SOCKET_EVENTS.TRANSFER_COMPLETED, {
        transfer: this.formatTransferData(transfer),
        completedBy: this.formatUserData(completedBy),
        timestamp: new Date()
      });

      // Send notification
      await this.sendTransferNotification(
        NOTIFICATION_TYPES.TRANSFER_STATUS_CHANGE,
        'Transfer Completed',
        `Transfer ${transfer.transferId} has been completed`,
        transfer,
        completedBy,
        this.getTargetUsersForCompletion(transfer, completedBy)
      );

      // Update dashboard
      await this.dashboardIntegration.handleTransferCompletion(transfer, completedBy);

    } catch (error) {
      log.error('Failed to handle transfer completion:', error);
      throw error;
    }
  }

  /**
   * Handle transfer cancellation
   */
  public async handleTransferCancelled(
    transfer: any,
    cancelledBy: any
  ): Promise<void> {
    try {
      log.info('Transfer cancelled - emitting real-time events', {
        transferId: transfer.id,
        cancelledBy: cancelledBy._id
      });

      // Emit socket event
      await this.emitTransferEvent(SOCKET_EVENTS.TRANSFER_CANCELLED, {
        transfer: this.formatTransferData(transfer),
        cancelledBy: this.formatUserData(cancelledBy),
        timestamp: new Date()
      });

      // Send notification
      await this.sendTransferNotification(
        NOTIFICATION_TYPES.TRANSFER_STATUS_CHANGE,
        'Transfer Cancelled',
        `Transfer ${transfer.transferId} has been cancelled`,
        transfer,
        cancelledBy,
        this.getTargetUsersForCancellation(transfer, cancelledBy)
      );

    } catch (error) {
      log.error('Failed to handle transfer cancellation:', error);
      throw error;
    }
  }

  /**
   * Handle transfer update
   */
  public async handleTransferUpdated(
    transfer: any,
    updatedBy: any,
    changes: any
  ): Promise<void> {
    try {
      log.info('Transfer updated - emitting real-time events', {
        transferId: transfer.id,
        updatedBy: updatedBy._id,
        changes: Object.keys(changes)
      });

      // Emit socket event
      await this.emitTransferEvent(SOCKET_EVENTS.TRANSFER_UPDATED, {
        transfer: this.formatTransferData(transfer),
        changes,
        updatedBy: this.formatUserData(updatedBy),
        timestamp: new Date()
      });

      // Send notification for significant changes
      if (this.isSignificantChange(changes)) {
        await this.sendTransferNotification(
          NOTIFICATION_TYPES.TRANSFER_STATUS_CHANGE,
          'Transfer Updated',
          `Transfer ${transfer.transferId} has been updated`,
          transfer,
          updatedBy,
          this.getTargetUsersForUpdate(transfer, updatedBy)
        );
      }

    } catch (error) {
      log.error('Failed to handle transfer update:', error);
      throw error;
    }
  }

  // ===== PRIVATE METHODS =====

  private async emitTransferEvent(eventType: string, eventData: any): Promise<void> {
    try {
      // Emit to transfer-specific room
      this.socketProvider.emitToRoom(
        `transfer:${eventData.transfer.id}`,
        eventType as any,
        eventData
      );

      // Emit to relevant users
      const targetUsers = this.extractTargetUsers(eventData);
      for (const userId of targetUsers) {
        this.socketProvider.emitToUser(userId, eventType as any, eventData);
      }

    } catch (error) {
      log.error('Failed to emit transfer event:', error);
    }
  }

  private async sendTransferNotification(
    type: string,
    title: string,
    message: string,
    transfer: any,
    sender: any,
    targetUsers: string[]
  ): Promise<void> {
    try {
      const notificationData = {
        type: type as any,
        priority: transfer.priority === 'urgent' ? NOTIFICATION_PRIORITIES.URGENT : NOTIFICATION_PRIORITIES.MEDIUM,
        title,
        message,
        targetUsers,
        transferId: transfer.id,
        data: {
          transfer: this.formatTransferData(transfer),
          changedBy: this.formatUserData(sender)
        }
      };

      await this.notificationService.createAndSendNotification(
        notificationData,
        ['realtime', 'email'],
        sender._id
      );

    } catch (error) {
      log.error('Failed to send transfer notification:', error);
    }
  }

  private async joinTransferRoom(transferId: string, userId: string): Promise<void> {
    try {
      // This would be handled by the room manager
      // For now, we'll just log it
      log.debug('User joined transfer room', {
        transferId,
        userId,
        room: `transfer:${transferId}`
      });

    } catch (error) {
      log.error('Failed to join transfer room:', error);
    }
  }

  private formatTransferData(transfer: any): any {
    return {
      id: transfer.id,
      transferId: transfer.transferId,
      status: transfer.status,
      priority: transfer.priority,
      patient: transfer.patient ? {
        firstName: transfer.patient.firstName,
        lastName: transfer.patient.lastName,
        patientId: transfer.patient.patientId
      } : null,
      fromHospital: transfer.fromHospital,
      toHospital: transfer.toHospital,
      scheduledDate: transfer.scheduledDate,
      createdAt: transfer.createdAt,
      updatedAt: transfer.updatedAt
    };
  }

  private formatUserData(user: any): any {
    return {
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      userType: user.userType,
      email: user.email
    };
  }

  private getTargetUsersForNewTransfer(transfer: any, createdBy: any): string[] {
    const targets = [createdBy._id];
    
    // Add managers and admins
    // This would typically query the database for users with these roles
    return targets;
  }

  private getTargetUsersForStatusChange(transfer: any, changedBy: any): string[] {
    const targets = [changedBy._id];
    
    // Add transfer creator, assigned user, and managers
    if (transfer.createdBy && transfer.createdBy !== changedBy._id) {
      targets.push(transfer.createdBy);
    }
    
    if (transfer.assignedTo && transfer.assignedTo !== changedBy._id) {
      targets.push(transfer.assignedTo);
    }
    
    return targets;
  }

  private getTargetUsersForCompletion(transfer: any, completedBy: any): string[] {
    const targets = [completedBy._id];
    
    // Add transfer creator and managers
    if (transfer.createdBy && transfer.createdBy !== completedBy._id) {
      targets.push(transfer.createdBy);
    }
    
    return targets;
  }

  private getTargetUsersForCancellation(transfer: any, cancelledBy: any): string[] {
    const targets = [cancelledBy._id];
    
    // Add transfer creator, assigned user, and managers
    if (transfer.createdBy && transfer.createdBy !== cancelledBy._id) {
      targets.push(transfer.createdBy);
    }
    
    if (transfer.assignedTo && transfer.assignedTo !== cancelledBy._id) {
      targets.push(transfer.assignedTo);
    }
    
    return targets;
  }

  private getTargetUsersForUpdate(transfer: any, updatedBy: any): string[] {
    const targets = [updatedBy._id];
    
    // Add transfer creator and assigned user
    if (transfer.createdBy && transfer.createdBy !== updatedBy._id) {
      targets.push(transfer.createdBy);
    }
    
    if (transfer.assignedTo && transfer.assignedTo !== updatedBy._id) {
      targets.push(transfer.assignedTo);
    }
    
    return targets;
  }

  private extractTargetUsers(eventData: any): string[] {
    const users = new Set<string>();
    
    if (eventData.createdBy?.id) users.add(eventData.createdBy.id);
    if (eventData.changedBy?.id) users.add(eventData.changedBy.id);
    if (eventData.assignedTo?.id) users.add(eventData.assignedTo.id);
    if (eventData.completedBy?.id) users.add(eventData.completedBy.id);
    if (eventData.cancelledBy?.id) users.add(eventData.cancelledBy.id);
    if (eventData.updatedBy?.id) users.add(eventData.updatedBy.id);
    
    return Array.from(users);
  }

  private isSignificantChange(changes: any): boolean {
    const significantFields = [
      'priority',
      'scheduledDate',
      'fromHospital',
      'toHospital',
      'patient',
      'assignedTo'
    ];
    
    return Object.keys(changes).some(field => significantFields.includes(field));
  }
}

// ===== EXPORTS =====

export default TransferIntegrationService;
