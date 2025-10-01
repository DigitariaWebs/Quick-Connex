import dbConnect from '@/lib/mongoose';
import Notification from '@/models/Notification';
import User from '@/models/User';

interface SSEConnection {
  userId: string;
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  userType: string;
  lastHeartbeat: Date;
}

interface NotificationData {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  transferId?: string;
  data?: any;
  timestamp: string;
  read?: boolean;
}

export class NotificationSSEService {
  private static instance: NotificationSSEService;
  private connections: Map<string, SSEConnection> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  private constructor() {
    // Clean up stale connections every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 5 * 60 * 1000);
  }

  public static getInstance(): NotificationSSEService {
    if (!NotificationSSEService.instance) {
      NotificationSSEService.instance = new NotificationSSEService();
    }
    return NotificationSSEService.instance;
  }

  public addConnection(
    userId: string, 
    controller: ReadableStreamDefaultController, 
    encoder: TextEncoder,
    userType?: string
  ) {
    this.connections.set(userId, {
      userId,
      controller,
      encoder,
      userType: userType || 'employee',
      lastHeartbeat: new Date()
    });
    console.log(`SSE connection added for user ${userId}. Total connections: ${this.connections.size}`);
  }

  public removeConnection(userId: string) {
    this.connections.delete(userId);
    console.log(`SSE connection removed for user ${userId}. Total connections: ${this.connections.size}`);
  }

  public updateHeartbeat(userId: string) {
    const connection = this.connections.get(userId);
    if (connection) {
      connection.lastHeartbeat = new Date();
    }
  }

  // Send notification to specific user
  public sendToUser(userId: string, notification: NotificationData) {
    const connection = this.connections.get(userId);
    if (!connection) {
      console.log(`No SSE connection found for user ${userId}`);
      return false;
    }

    try {
      const message = `data: ${JSON.stringify(notification)}\n\n`;
      connection.controller.enqueue(connection.encoder.encode(message));
      return true;
    } catch (error) {
      console.error(`Error sending notification to user ${userId}:`, error);
      this.removeConnection(userId);
      return false;
    }
  }

  // Send notification to all users with specific role
  public sendToRole(userType: string, notification: NotificationData) {
    let sentCount = 0;
    for (const [userId, connection] of this.connections) {
      if (connection.userType === userType) {
        if (this.sendToUser(userId, notification)) {
          sentCount++;
        }
      }
    }
    console.log(`Sent notification to ${sentCount} users with role ${userType}`);
    return sentCount;
  }

  // Send notification to all connected users
  public sendToAll(notification: NotificationData) {
    let sentCount = 0;
    for (const [userId] of this.connections) {
      if (this.sendToUser(userId, notification)) {
        sentCount++;
      }
    }
    console.log(`Sent notification to ${sentCount} total users`);
    return sentCount;
  }

  // Send transfer status change notification
  public async sendTransferStatusChange(
    transfer: any, 
    oldStatus: string, 
    newStatus: string, 
    changedBy: any
  ) {
    const notificationId = `transfer_status_${transfer._id}_${Date.now()}`;
    const priority = this.getStatusChangePriority(oldStatus, newStatus);
    
    const notification: NotificationData = {
      id: notificationId,
      type: 'transfer_status_change',
      priority,
      title: 'Transfer Status Updated',
      message: this.getStatusChangeMessage(transfer, oldStatus, newStatus, changedBy),
      transferId: transfer.transferId,
      data: {
        transfer: {
          id: transfer._id,
          transferId: transfer.transferId,
          patient: transfer.patient,
          fromHospital: transfer.fromHospital,
          toHospital: transfer.toHospital,
          status: newStatus,
          oldStatus: oldStatus
        },
        changedBy: {
          id: changedBy._id,
          name: `${changedBy.firstName} ${changedBy.lastName}`,
          userType: changedBy.userType
        }
      },
      timestamp: new Date().toISOString(),
      read: false
    };

    // Create persistent notification in database
    try {
      await dbConnect();
      
      const targetUsers = [];
      if (transfer.requestedBy) targetUsers.push(transfer.requestedBy);
      if (transfer.assignedTo) targetUsers.push(transfer.assignedTo);
      
      const persistentNotification = new Notification({
        id: notificationId,
        type: 'transfer_status_change',
        priority,
        title: 'Transfer Status Updated',
        message: this.getStatusChangeMessage(transfer, oldStatus, newStatus, changedBy),
        targetUsers,
        targetRoles: ['manager', 'employee'],
        transferId: transfer.transferId,
        transfer: transfer._id,
        data: notification.data,
        settings: {
          persistent: true,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        },
        createdBy: changedBy._id
      });

      await persistentNotification.save();
    } catch (error) {
      console.error('Error creating persistent notification:', error);
    }

    // Send real-time notifications
    this.sendToAll(notification);

    // Send to specific users involved in the transfer
    if (transfer.requestedBy) {
      this.sendToUser(transfer.requestedBy.toString(), notification);
    }
    
    if (transfer.assignedTo) {
      this.sendToUser(transfer.assignedTo.toString(), notification);
    }
  }

  // Send urgent transfer notification
  public sendUrgentTransferNotification(transfer: any, urgency: string) {
    const notification: NotificationData = {
      id: `urgent_transfer_${transfer._id}_${Date.now()}`,
      type: 'urgent_transfer',
      priority: 'high',
      title: 'Urgent Transfer Alert',
      message: `Urgent transfer request: ${transfer.patient?.firstName} ${transfer.patient?.lastName} from ${transfer.fromHospital} to ${transfer.toHospital}`,
      transferId: transfer.transferId,
      data: {
        transfer: {
          id: transfer._id,
          transferId: transfer.transferId,
          patient: transfer.patient,
          fromHospital: transfer.fromHospital,
          toHospital: transfer.toHospital,
          priority: transfer.priority,
          urgency
        }
      },
      timestamp: new Date().toISOString(),
      read: false
    };

    // Send to managers and available employees
    this.sendToRole('manager', notification);
    this.sendToRole('employee', notification);
  }

  // Send transfer reminder notification
  public sendTransferReminder(transfer: any, reminderType: string) {
    const notification: NotificationData = {
      id: `transfer_reminder_${transfer._id}_${Date.now()}`,
      type: 'transfer_reminder',
      priority: reminderType === 'immediate' ? 'high' : 'medium',
      title: 'Transfer Reminder',
      message: this.getReminderMessage(transfer, reminderType),
      transferId: transfer.transferId,
      data: {
        transfer: {
          id: transfer._id,
          transferId: transfer.transferId,
          patient: transfer.patient,
          scheduledDate: transfer.scheduledDate,
          fromHospital: transfer.fromHospital,
          toHospital: transfer.toHospital
        },
        reminderType
      },
      timestamp: new Date().toISOString(),
      read: false
    };

    // Send to assigned employee and requesting manager
    if (transfer.assignedTo) {
      this.sendToUser(transfer.assignedTo.toString(), notification);
    }
    
    if (transfer.requestedBy) {
      this.sendToUser(transfer.requestedBy.toString(), notification);
    }
  }

  // Send notification count update
  public async sendNotificationCountUpdate(userId: string) {
    try {
      await dbConnect();
      
      const userRoles = await this.getUserRoles(userId);
      
      // Get unread count
      const unreadCount = await Notification.countDocuments({
        $and: [
          {
            $or: [
              { targetUsers: userId },
              { targetRoles: { $in: userRoles } }
            ]
          },
          {
            excludeUsers: { $ne: userId }
          },
          {
            status: { $in: ['pending', 'delivered'] }
          },
          {
            'deliveries': {
              $not: {
                $elemMatch: {
                  userId: userId,
                  readAt: { $exists: true }
                }
              }
            }
          }
        ]
      });

      const notification: NotificationData = {
        id: `count_update_${Date.now()}`,
        type: 'notification_count_update',
        priority: 'low',
        title: 'Notification Count Update',
        message: `You have ${unreadCount} unread notifications`,
        data: {
          unreadCount,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        read: false
      };

      this.sendToUser(userId, notification);
    } catch (error) {
      console.error('Error sending notification count update:', error);
    }
  }

  // Send urgent alerts update
  public async sendUrgentAlertsUpdate(userId: string) {
    try {
      await dbConnect();
      
      // Get urgent transfers for this user
      const urgentTransfers = await this.getUrgentTransfersForUser(userId);
      
      const notification: NotificationData = {
        id: `urgent_alerts_update_${Date.now()}`,
        type: 'urgent_alerts_update',
        priority: 'high',
        title: 'Urgent Alerts Update',
        message: `You have ${urgentTransfers.length} urgent transfers requiring attention`,
        data: {
          urgentTransfers,
          count: urgentTransfers.length,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        read: false
      };

      this.sendToUser(userId, notification);
    } catch (error) {
      console.error('Error sending urgent alerts update:', error);
    }
  }

  private async getUserRoles(userId: string): Promise<string[]> {
    try {
      const user = await User.findById(userId).select('userType');
      return user ? [user.userType] : ['employee'];
    } catch (error) {
      console.error('Error getting user roles:', error);
      return ['employee'];
    }
  }

  private async getUrgentTransfersForUser(userId: string): Promise<any[]> {
    // This would need to be implemented based on your transfer model
    // For now, return empty array
    return [];
  }

  private getStatusChangePriority(oldStatus: string, newStatus: string): string {
    if (newStatus === 'cancelled' || newStatus === 'completed') {
      return 'high';
    }
    
    if (newStatus === 'accepted' || newStatus === 'in_progress') {
      return 'medium';
    }
    
    return 'low';
  }

  private getStatusChangeMessage(transfer: any, oldStatus: string, newStatus: string, changedBy: any): string {
    const patientName = transfer.patient ? `${transfer.patient.firstName} ${transfer.patient.lastName}` : 'Unknown Patient';
    const changedByName = `${changedBy.firstName} ${changedBy.lastName}`;
    
    const statusMessages = {
      'pending': 'is pending approval',
      'accepted': 'has been accepted',
      'in_progress': 'is now in progress',
      'completed': 'has been completed',
      'cancelled': 'has been cancelled'
    };

    return `Transfer for ${patientName} ${(statusMessages as any)[newStatus]} by ${changedByName}`;
  }

  private getReminderMessage(transfer: any, reminderType: string): string {
    const patientName = transfer.patient ? `${transfer.patient.firstName} ${transfer.patient.lastName}` : 'Unknown Patient';
    
    switch (reminderType) {
      case 'immediate':
        return `URGENT: Transfer for ${patientName} is scheduled to start now!`;
      case '15min':
        return `Transfer for ${patientName} starts in 15 minutes`;
      case '1hour':
        return `Transfer for ${patientName} starts in 1 hour`;
      case '24hour':
        return `Transfer for ${patientName} is scheduled for tomorrow`;
      default:
        return `Reminder: Transfer for ${patientName} is scheduled`;
    }
  }

  private cleanupStaleConnections() {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [userId, connection] of this.connections) {
      if (now.getTime() - connection.lastHeartbeat.getTime() > staleThreshold) {
        console.log(`Removing stale SSE connection for user ${userId}`);
        this.removeConnection(userId);
      }
    }
  }

  public destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.connections.clear();
  }
}

