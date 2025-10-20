import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import Transfer from '@/models/Transfer';
import { requireEmployeeOrManager, handleAuthError, createSuccessResponse } from '@/lib/auth/auth-utils';

// GET /api/notifications/schedule - Get scheduling notifications
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await requireEmployeeOrManager();

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'conflicts', 'reminders', 'upcoming', 'all'
    const limit = parseInt(searchParams.get('limit') || '20');

    const notifications = [];

    // Get upcoming transfers (next 24 hours)
    if (type === 'all' || type === 'upcoming') {
      const now = new Date();
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const upcomingTransfers = await Transfer.find({
        scheduledDate: {
          $gte: now,
          $lte: next24Hours
        },
        status: { $in: ['pending', 'accepted', 'in_progress'] }
      })
      .populate('requestedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ scheduledDate: 1 })
      .limit(10);

      for (const transfer of upcomingTransfers) {
        const timeUntilTransfer = transfer.scheduledDate!.getTime() - now.getTime();
        const hoursUntil = Math.floor(timeUntilTransfer / (1000 * 60 * 60));
        const minutesUntil = Math.floor((timeUntilTransfer % (1000 * 60 * 60)) / (1000 * 60));

        let priority = 'low';
        let message = '';

        if (hoursUntil < 1) {
          priority = 'high';
          message = `URGENT: Transfer for ${transfer.patientInfo ? `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}` : 'Unknown Patient'} is scheduled in ${minutesUntil} minutes`;
        } else if (hoursUntil < 4) {
          priority = 'medium';
          message = `Transfer for ${transfer.patientInfo ? `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}` : 'Unknown Patient'} is scheduled in ${hoursUntil} hours`;
        } else {
          priority = 'low';
          message = `Transfer for ${transfer.patientInfo ? `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}` : 'Unknown Patient'} is scheduled in ${hoursUntil} hours`;
        }

        notifications.push({
          id: `upcoming_${transfer._id}`,
          type: 'upcoming',
          priority,
          title: 'Upcoming Transfer',
          message,
          transferId: transfer.transferId,
          scheduledDate: transfer.scheduledDate,
          patient: transfer.patientInfo,
          fromHospital: transfer.fromHospitalName,
          toHospital: transfer.toHospitalName,
          createdAt: new Date(),
          read: false
        });
      }
    }

    // Get scheduling conflicts
    if (type === 'all' || type === 'conflicts') {
      const now = new Date();
      const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const transfersWithConflicts = await Transfer.find({
        scheduledDate: {
          $gte: now,
          $lte: next7Days
        },
        'scheduling.conflicts': { $exists: true, $ne: [] },
        status: { $in: ['pending', 'accepted', 'in_progress'] }
      })
      .populate('requestedBy', 'firstName lastName email')
      .sort({ scheduledDate: 1 })
      .limit(10);

      for (const transfer of transfersWithConflicts) {
        const highSeverityConflicts: any[] = [];
        const mediumSeverityConflicts: any[] = [];

        if (highSeverityConflicts.length > 0) {
          notifications.push({
            id: `conflict_high_${transfer._id}`,
            type: 'conflict',
            priority: 'high',
            title: 'High Priority Scheduling Conflict',
            message: `Transfer ${transfer.transferId} has ${highSeverityConflicts.length} high-severity conflicts that require immediate attention`,
            transferId: transfer.transferId,
            scheduledDate: transfer.scheduledDate,
            patient: transfer.patientInfo,
            conflicts: highSeverityConflicts,
            createdAt: new Date(),
            read: false
          });
        } else if (mediumSeverityConflicts.length > 0) {
          notifications.push({
            id: `conflict_medium_${transfer._id}`,
            type: 'conflict',
            priority: 'medium',
            title: 'Scheduling Conflict Detected',
            message: `Transfer ${transfer.transferId} has ${mediumSeverityConflicts.length} conflicts that should be reviewed`,
            transferId: transfer.transferId,
            scheduledDate: transfer.scheduledDate,
            patient: transfer.patientInfo,
            conflicts: mediumSeverityConflicts,
            createdAt: new Date(),
            read: false
          });
        }
      }
    }

    // Get overdue transfers
    if (type === 'all' || type === 'overdue') {
      const now = new Date();
      const overdueTransfers = await Transfer.find({
        scheduledDate: { $lt: now },
        status: { $in: ['pending', 'accepted'] }
      })
      .populate('requestedBy', 'firstName lastName email')
      .sort({ scheduledDate: 1 })
      .limit(10);

      for (const transfer of overdueTransfers) {
        const overdueMinutes = Math.floor((now.getTime() - transfer.scheduledDate!.getTime()) / (1000 * 60));
        
        notifications.push({
          id: `overdue_${transfer._id}`,
          type: 'overdue',
          priority: 'high',
          title: 'Overdue Transfer',
          message: `Transfer for ${transfer.patientInfo ? `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}` : 'Unknown Patient'} is ${overdueMinutes} minutes overdue`,
          transferId: transfer.transferId,
          scheduledDate: transfer.scheduledDate,
          patient: transfer.patientInfo,
          fromHospital: transfer.fromHospitalName,
          toHospital: transfer.toHospitalName,
          overdueMinutes,
          createdAt: new Date(),
          read: false
        });
      }
    }

    // Get resource availability notifications
    if (type === 'all' || type === 'resources') {
      const now = new Date();
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Check for unassigned drivers/vehicles

    }

    // Sort notifications by priority and date
    notifications.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Limit results
    const limitedNotifications = notifications.slice(0, limit);

    // Calculate summary
    const summary = {
      total: notifications.length,
      high: notifications.filter(n => n.priority === 'high').length,
      medium: notifications.filter(n => n.priority === 'medium').length,
      low: notifications.filter(n => n.priority === 'low').length,
      unread: notifications.filter(n => !n.read).length
    };

    return createSuccessResponse({
      notifications: limitedNotifications,
      summary,
      type,
      limit
    });

  } catch (error) {
    console.error('Error fetching scheduling notifications:', error);
    return handleAuthError('Failed to fetch notifications', 'NOTIFICATION_ERROR', 500);
  }
}

// POST /api/notifications/schedule - Mark notifications as read or create new ones
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await requireEmployeeOrManager();

    await dbConnect();

    const body = await request.json();
    const { action, notificationIds, transferId, message, type } = body;

    switch (action) {
      case 'mark_read':
        // In a real implementation, you would store notification read status in a database
        // For now, we'll just return success
        return createSuccessResponse({ 
          message: 'Notifications marked as read',
          notificationIds 
        });

      case 'create_reminder':
        if (!transferId || !message) {
          return handleAuthError('Transfer ID and message are required', 'VALIDATION_ERROR', 400);
        }

        // Create a reminder notification
        const reminder = {
          id: `reminder_${Date.now()}`,
          type: 'reminder',
          priority: 'medium',
          title: 'Transfer Reminder',
          message,
          transferId,
          createdAt: new Date(),
          createdBy: user._id,
          read: false
        };

        return createSuccessResponse(reminder, 'Reminder created successfully');

      case 'dismiss_conflict':
        if (!transferId) {
          return handleAuthError('Transfer ID is required', 'VALIDATION_ERROR', 400);
        }

        // Update transfer to acknowledge conflicts
        const transfer = await Transfer.findOne({ transferId });
        if (transfer) {
          await Transfer.findByIdAndUpdate(
            transfer._id,
            {
              $set: { 'scheduling.conflicts': [] },
              lastModifiedBy: user._id,
              $push: {
                statusHistory: {
                  status: transfer.status,
                  changedBy: user._id,
                  changedAt: new Date(),
                  reason: 'Conflicts dismissed by user'
                }
              }
            }
          );
        }

        return createSuccessResponse({ 
          message: 'Conflicts dismissed',
          transferId 
        });

      default:
        return handleAuthError('Invalid action', 'VALIDATION_ERROR', 400);
    }

  } catch (error) {
    console.error('Error processing notification action:', error);
    return handleAuthError('Failed to process notification action', 'NOTIFICATION_ACTION_ERROR', 500);
  }
}
