/**
 * Dashboard Integration Service
 * 
 * Handles real-time dashboard updates and integrates with the notification system.
 * Emits dashboard events when stats or activities change.
 */

import { SocketProvider } from '../providers';
import { NotificationService } from '../core';
import { log } from '@/lib/logging';
import { 
  SOCKET_EVENTS,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  USER_ROLES
} from '../core/constants';
import { 
  UserRole
} from '../core/types';
import { 
  AppError,
  formatErrorForClient 
} from '@/lib/utils/error-handling';

// ===== DASHBOARD INTEGRATION SERVICE =====

export class DashboardIntegrationService {
  private static instance: DashboardIntegrationService;
  private socketProvider: SocketProvider;
  private notificationService: NotificationService;

  private constructor() {
    this.socketProvider = SocketProvider.getInstance();
    this.notificationService = NotificationService.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DashboardIntegrationService {
    if (!DashboardIntegrationService.instance) {
      DashboardIntegrationService.instance = new DashboardIntegrationService();
    }
    return DashboardIntegrationService.instance;
  }

  /**
   * Emit dashboard stats update
   */
  public async emitStatsUpdate(
    stats: any,
    targetUsers?: string[],
    targetRoles?: string[]
  ): Promise<void> {
    try {
      const eventData = {
        stats,
        timestamp: new Date(),
        source: 'dashboard-integration'
      };

      // Emit to specific users
      if (targetUsers && targetUsers.length > 0) {
        for (const userId of targetUsers) {
          this.socketProvider.emitToUser(userId, SOCKET_EVENTS.DASHBOARD_STATS_UPDATE, eventData);
        }
      }

      // Emit to specific roles
      if (targetRoles && targetRoles.length > 0) {
        for (const role of targetRoles) {
          this.socketProvider.emitToRole(role as any, SOCKET_EVENTS.DASHBOARD_STATS_UPDATE, eventData);
        }
      }

      // If no specific targets, emit to all managers and admins
      if (!targetUsers && !targetRoles) {
        this.socketProvider.emitToRole(USER_ROLES.MANAGER, SOCKET_EVENTS.DASHBOARD_STATS_UPDATE, eventData);
        this.socketProvider.emitToRole(USER_ROLES.ADMIN, SOCKET_EVENTS.DASHBOARD_STATS_UPDATE, eventData);
      }

      log.debug('Dashboard stats update emitted', {
        stats,
        targetUsers: targetUsers?.length || 0,
        targetRoles: targetRoles?.length || 0
      });

    } catch (error) {
      log.error('Failed to emit dashboard stats update:', error);
      throw error;
    }
  }

  /**
   * Emit new activity
   */
  public async emitActivityUpdate(
    activity: any,
    targetUsers?: string[],
    targetRoles?: string[]
  ): Promise<void> {
    try {
      const eventData = {
        activity,
        timestamp: new Date(),
        source: 'dashboard-integration'
      };

      // Emit to specific users
      if (targetUsers && targetUsers.length > 0) {
        for (const userId of targetUsers) {
          this.socketProvider.emitToUser(userId, SOCKET_EVENTS.DASHBOARD_ACTIVITY_NEW, eventData);
        }
      }

      // Emit to specific roles
      if (targetRoles && targetRoles.length > 0) {
        for (const role of targetRoles) {
          this.socketProvider.emitToRole(role as any, SOCKET_EVENTS.DASHBOARD_ACTIVITY_NEW, eventData);
        }
      }

      // If no specific targets, emit to all managers and admins
      if (!targetUsers && !targetRoles) {
        this.socketProvider.emitToRole(USER_ROLES.MANAGER, SOCKET_EVENTS.DASHBOARD_ACTIVITY_NEW, eventData);
        this.socketProvider.emitToRole(USER_ROLES.ADMIN, SOCKET_EVENTS.DASHBOARD_ACTIVITY_NEW, eventData);
      }

      log.debug('Dashboard activity update emitted', {
        activity,
        targetUsers: targetUsers?.length || 0,
        targetRoles: targetRoles?.length || 0
      });

    } catch (error) {
      log.error('Failed to emit dashboard activity update:', error);
      throw error;
    }
  }

  /**
   * Emit urgent transfer alert
   */
  public async emitUrgentAlert(
    transfer: any,
    targetUsers?: string[],
    targetRoles?: string[]
  ): Promise<void> {
    try {
      const eventData = {
        transfer,
        timestamp: new Date(),
        source: 'dashboard-integration',
        priority: 'urgent'
      };

      // Emit to specific users
      if (targetUsers && targetUsers.length > 0) {
        for (const userId of targetUsers) {
          this.socketProvider.emitToUser(userId, SOCKET_EVENTS.DASHBOARD_URGENT_ALERT, eventData);
        }
      }

      // Emit to specific roles
      if (targetRoles && targetRoles.length > 0) {
        for (const role of targetRoles) {
          this.socketProvider.emitToRole(role as any, SOCKET_EVENTS.DASHBOARD_URGENT_ALERT, eventData);
        }
      }

      // If no specific targets, emit to all managers and admins
      if (!targetUsers && !targetRoles) {
        this.socketProvider.emitToRole(USER_ROLES.MANAGER, SOCKET_EVENTS.DASHBOARD_URGENT_ALERT, eventData);
        this.socketProvider.emitToRole(USER_ROLES.ADMIN, SOCKET_EVENTS.DASHBOARD_URGENT_ALERT, eventData);
      }

      // Also send notification for urgent alerts
      await this.sendUrgentTransferNotification(transfer, targetUsers, targetRoles);

      log.debug('Dashboard urgent alert emitted', {
        transfer: transfer.id,
        targetUsers: targetUsers?.length || 0,
        targetRoles: targetRoles?.length || 0
      });

    } catch (error) {
      log.error('Failed to emit dashboard urgent alert:', error);
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
      // Update dashboard stats
      await this.updateDashboardStats(transfer, oldStatus, newStatus);

      // Add activity entry
      await this.addActivityEntry({
        type: 'transfer_status_change',
        description: `Transfer ${transfer.transferId} status changed from ${oldStatus} to ${newStatus}`,
        transferId: transfer.id,
        changedBy: changedBy._id,
        timestamp: new Date()
      });

      // Send notification if urgent
      if (transfer.priority === 'urgent' || newStatus === 'urgent') {
        await this.emitUrgentAlert(transfer);
      }

      log.info('Transfer status change handled', {
        transferId: transfer.id,
        oldStatus,
        newStatus,
        changedBy: changedBy._id
      });

    } catch (error) {
      log.error('Failed to handle transfer status change:', error);
      throw error;
    }
  }

  /**
   * Handle new transfer creation
   */
  public async handleNewTransfer(
    transfer: any,
    createdBy: any
  ): Promise<void> {
    try {
      // Update dashboard stats
      await this.updateDashboardStats(transfer, null, 'pending');

      // Add activity entry
      await this.addActivityEntry({
        type: 'new_transfer',
        description: `New transfer ${transfer.transferId} created`,
        transferId: transfer.id,
        createdBy: createdBy._id,
        timestamp: new Date()
      });

      // Send notification if urgent
      if (transfer.priority === 'urgent') {
        await this.emitUrgentAlert(transfer);
      }

      log.info('New transfer handled', {
        transferId: transfer.id,
        createdBy: createdBy._id
      });

    } catch (error) {
      log.error('Failed to handle new transfer:', error);
      throw error;
    }
  }

  /**
   * Handle transfer completion
   */
  public async handleTransferCompletion(
    transfer: any,
    completedBy: any
  ): Promise<void> {
    try {
      // Update dashboard stats
      await this.updateDashboardStats(transfer, 'in_progress', 'completed');

      // Add activity entry
      await this.addActivityEntry({
        type: 'transfer_completed',
        description: `Transfer ${transfer.transferId} completed`,
        transferId: transfer.id,
        completedBy: completedBy._id,
        timestamp: new Date()
      });

      log.info('Transfer completion handled', {
        transferId: transfer.id,
        completedBy: completedBy._id
      });

    } catch (error) {
      log.error('Failed to handle transfer completion:', error);
      throw error;
    }
  }

  // ===== PRIVATE METHODS =====

  private async updateDashboardStats(
    transfer: any,
    oldStatus: string | null,
    newStatus: string
  ): Promise<void> {
    try {
      // This would typically update database stats
      // For now, we'll emit a generic stats update
      const statsUpdate = {
        timestamp: new Date(),
        transferId: transfer.id,
        oldStatus,
        newStatus,
        priority: transfer.priority
      };

      await this.emitStatsUpdate(statsUpdate);

    } catch (error) {
      log.error('Failed to update dashboard stats:', error);
    }
  }

  private async addActivityEntry(activity: any): Promise<void> {
    try {
      await this.emitActivityUpdate(activity);

    } catch (error) {
      log.error('Failed to add activity entry:', error);
    }
  }

  private async sendUrgentTransferNotification(
    transfer: any,
    targetUsers?: string[],
    targetRoles?: string[]
  ): Promise<void> {
    try {
      const notificationData = {
        type: NOTIFICATION_TYPES.URGENT_TRANSFER,
        priority: NOTIFICATION_PRIORITIES.URGENT,
        title: 'Urgent Transfer Alert',
        message: `Urgent transfer ${transfer.transferId} requires immediate attention`,
        targetUsers: targetUsers || [],
        targetRoles: (targetRoles || [USER_ROLES.MANAGER, USER_ROLES.ADMIN]) as UserRole[],
        transferId: transfer.id,
        data: {
          transfer: {
            id: transfer.id,
            transferId: transfer.transferId,
            patient: transfer.patient,
            fromHospital: transfer.fromHospital,
            toHospital: transfer.toHospital,
            priority: transfer.priority,
            status: transfer.status
          }
        }
      };

      await this.notificationService.createAndSendNotification(
        notificationData,
        ['realtime', 'push'],
        'system'
      );

    } catch (error) {
      log.error('Failed to send urgent transfer notification:', error);
    }
  }
}

// ===== EXPORTS =====

export default DashboardIntegrationService;
