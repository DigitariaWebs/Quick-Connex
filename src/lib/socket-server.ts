import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { connectDB } from '@/lib/mongodb';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userType?: string;
  user?: any;
}

interface SocketServer {
  io: SocketIOServer;
  isInitialized: boolean;
}

let socketServer: SocketServer | null = null;

export function initializeSocketServer(httpServer: NetServer): SocketIOServer {
  if (socketServer?.isInitialized) {
    return socketServer.io;
  }

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_APP_URL 
        : "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Get user from database
      const user = await User.findById(decoded.userId).select('_id firstName lastName email userType');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user info to socket
      socket.userId = user._id.toString();
      socket.userType = user.userType;
      socket.user = user;
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handling
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} (${socket.userType}) connected to socket`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);
    
    // Join role-based rooms
    socket.join(`role:${socket.userType}`);
    
    // Join all users room for global notifications
    socket.join('all_users');

    // Handle joining transfer-specific rooms
    socket.on('join_transfer_room', (transferId: string) => {
      socket.join(`transfer:${transferId}`);
      console.log(`User ${socket.userId} joined transfer room: ${transferId}`);
    });

    // Handle leaving transfer-specific rooms
    socket.on('leave_transfer_room', (transferId: string) => {
      socket.leave(`transfer:${transferId}`);
      console.log(`User ${socket.userId} left transfer room: ${transferId}`);
    });

    // Handle notification preferences
    socket.on('update_notification_preferences', (preferences: any) => {
      // Store user notification preferences
      socket.data.notificationPreferences = preferences;
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.userId} disconnected: ${reason}`);
    });

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Successfully connected to real-time notifications',
      userId: socket.userId,
      userType: socket.userType
    });
  });

  socketServer = {
    io,
    isInitialized: true
  };

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return socketServer?.io || null;
}

// Notification utility functions
export class NotificationService {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  // Send notification to specific user
  sendToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Send notification to all users with specific role
  sendToRole(userType: string, event: string, data: any) {
    this.io.to(`role:${userType}`).emit(event, data);
  }

  // Send notification to all users
  sendToAll(event: string, data: any) {
    this.io.to('all_users').emit(event, data);
  }

  // Send notification to users in a transfer room
  sendToTransferRoom(transferId: string, event: string, data: any) {
    this.io.to(`transfer:${transferId}`).emit(event, data);
  }

  // Send transfer status change notification
  async sendTransferStatusChange(transfer: any, oldStatus: string, newStatus: string, changedBy: any) {
    const notificationId = `transfer_status_${transfer._id}_${Date.now()}`;
    const priority = this.getStatusChangePriority(oldStatus, newStatus);
    
    const notification = {
      id: notificationId,
      type: 'transfer_status_change',
      priority,
      title: 'Transfer Status Updated',
      message: this.getStatusChangeMessage(transfer, oldStatus, newStatus, changedBy),
      transferId: transfer.transferId,
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
      },
      timestamp: new Date().toISOString(),
      read: false
    };

    // Create persistent notification
    try {
      await connectDB();
      
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
        targetRoles: ['manager', 'employee'], // All users should see status changes
        transferId: transfer.transferId,
        transfer: transfer._id,
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
    this.sendToAll('transfer_status_change', notification);

    // Send to specific users involved in the transfer
    if (transfer.requestedBy) {
      this.sendToUser(transfer.requestedBy.toString(), 'transfer_status_change', notification);
    }
    
    if (transfer.assignedTo) {
      this.sendToUser(transfer.assignedTo.toString(), 'transfer_status_change', notification);
    }

    // Send to transfer room
    this.sendToTransferRoom(transfer._id.toString(), 'transfer_status_change', notification);
  }

  // Send urgent transfer notification
  sendUrgentTransferNotification(transfer: any, urgency: string) {
    const notification = {
      id: `urgent_transfer_${transfer._id}_${Date.now()}`,
      type: 'urgent_transfer',
      priority: 'high',
      title: 'Urgent Transfer Alert',
      message: `Urgent transfer request: ${transfer.patient?.firstName} ${transfer.patient?.lastName} from ${transfer.fromHospital} to ${transfer.toHospital}`,
      transferId: transfer.transferId,
      transfer: {
        id: transfer._id,
        transferId: transfer.transferId,
        patient: transfer.patient,
        fromHospital: transfer.fromHospital,
        toHospital: transfer.toHospital,
        priority: transfer.priority,
        urgency
      },
      timestamp: new Date().toISOString(),
      read: false
    };

    // Send to managers and available employees
    this.sendToRole('manager', 'urgent_transfer', notification);
    this.sendToRole('employee', 'urgent_transfer', notification);
  }

  // Send transfer reminder notification
  sendTransferReminder(transfer: any, reminderType: string) {
    const notification = {
      id: `transfer_reminder_${transfer._id}_${Date.now()}`,
      type: 'transfer_reminder',
      priority: reminderType === 'immediate' ? 'high' : 'medium',
      title: 'Transfer Reminder',
      message: this.getReminderMessage(transfer, reminderType),
      transferId: transfer.transferId,
      transfer: {
        id: transfer._id,
        transferId: transfer.transferId,
        patient: transfer.patient,
        scheduledDate: transfer.scheduledDate,
        fromHospital: transfer.fromHospital,
        toHospital: transfer.toHospital
      },
      reminderType,
      timestamp: new Date().toISOString(),
      read: false
    };

    // Send to assigned employee and requesting manager
    if (transfer.assignedTo) {
      this.sendToUser(transfer.assignedTo.toString(), 'transfer_reminder', notification);
    }
    
    if (transfer.requestedBy) {
      this.sendToUser(transfer.requestedBy.toString(), 'transfer_reminder', notification);
    }
  }

  private getStatusChangePriority(oldStatus: string, newStatus: string): string {
    // High priority for critical status changes
    if (newStatus === 'cancelled' || newStatus === 'completed') {
      return 'high';
    }
    
    // Medium priority for workflow changes
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

    return `Transfer for ${patientName} ${statusMessages[newStatus]} by ${changedByName}`;
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
}

// Export singleton instance
export function getNotificationService(): NotificationService | null {
  const io = getSocketServer();
  return io ? new NotificationService(io) : null;
}
