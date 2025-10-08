import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import Notification from '@/models/Notification';
import { requireEmployeeOrManager, createErrorResponse, createSuccessResponse } from '@/lib/auth/auth-middleware';

// GET /api/notifications - Get notifications for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const priority = searchParams.get('priority') || 'all';
    const status = searchParams.get('status') || 'unread'; // 'unread', 'read', 'all'
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const userRoles = [authResult.user.userType];
    const userId = authResult.user._id;

    // Build query
    const query: any = {
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
        }
      ]
    };

    // Filter by type
    if (type !== 'all') {
      query.type = type;
    }

    // Filter by priority
    if (priority !== 'all') {
      query.priority = priority;
    }

    // Filter by read status
    if (status === 'unread') {
      query['deliveries'] = {
        $not: {
          $elemMatch: {
            userId: userId,
            readAt: { $exists: true }
          }
        }
      };
    } else if (status === 'read') {
      query['deliveries'] = {
        $elemMatch: {
          userId: userId,
          readAt: { $exists: true }
        }
      };
    }

    // Get notifications
    const notifications = await Notification.find(query)
      .populate('transfer', 'transferId patient fromHospital toHospital status')
      .populate('createdBy', 'firstName lastName email userType')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await Notification.countDocuments(query);

    // Transform notifications for response
    const transformedNotifications = notifications.map(notification => {
      const userDelivery = notification.deliveries.find(
        (d: any) => d.userId.toString() === userId
      );

      return {
        id: notification.id,
        type: notification.type,
        priority: notification.priority,
        title: notification.title,
        message: notification.message,
        transferId: notification.transferId,
        data: notification.data,
        createdAt: notification.createdAt,
        read: userDelivery?.readAt ? true : false,
        readAt: userDelivery?.readAt,
        dismissedAt: userDelivery?.dismissedAt,
        deliveryMethod: userDelivery?.deliveryMethod || 'realtime'
      };
    });

    // Calculate summary
    const summary = {
      total: totalCount,
      unread: await Notification.countDocuments({
        ...query,
        'deliveries': {
          $not: {
            $elemMatch: {
              userId: userId,
              readAt: { $exists: true }
            }
          }
        }
      }),
      high: await Notification.countDocuments({
        ...query,
        priority: 'high'
      }),
      medium: await Notification.countDocuments({
        ...query,
        priority: 'medium'
      }),
      low: await Notification.countDocuments({
        ...query,
        priority: 'low'
      })
    };

    return createSuccessResponse({
      notifications: transformedNotifications,
      summary,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return createErrorResponse('Failed to fetch notifications', 'NOTIFICATION_FETCH_ERROR', 500);
  }
}

// POST /api/notifications - Mark notifications as read/dismissed or create new ones
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    const body = await request.json();
    const { action, notificationIds, notificationId, all } = body;

    const userId = authResult.user._id;

    switch (action) {
      case 'mark_read':
        if (all) {
          // Mark all notifications as read for this user
          await Notification.updateMany(
            {
              $or: [
                { targetUsers: userId },
                { targetRoles: { $in: [authResult.user.userType] } }
              ],
              'deliveries.userId': userId
            },
            {
              $set: { 'deliveries.$.readAt': new Date() }
            }
          );
        } else if (notificationIds && Array.isArray(notificationIds)) {
          // Mark specific notifications as read
          for (const id of notificationIds) {
            await Notification.updateOne(
              { 
                id,
                'deliveries.userId': userId 
              },
              { 
                $set: { 'deliveries.$.readAt': new Date() }
              }
            );
          }
        } else if (notificationId) {
          // Mark single notification as read
          await Notification.updateOne(
            { 
              id: notificationId,
              'deliveries.userId': userId 
            },
            { 
              $set: { 'deliveries.$.readAt': new Date() }
            }
          );
        }

        return createSuccessResponse({ 
          message: 'Notifications marked as read',
          notificationIds: notificationIds || [notificationId] || 'all'
        });

      case 'mark_dismissed':
        if (all) {
          // Mark all notifications as dismissed for this user
          await Notification.updateMany(
            {
              $or: [
                { targetUsers: userId },
                { targetRoles: { $in: [authResult.user.userType] } }
              ],
              'deliveries.userId': userId
            },
            {
              $set: { 'deliveries.$.dismissedAt': new Date() }
            }
          );
        } else if (notificationIds && Array.isArray(notificationIds)) {
          // Mark specific notifications as dismissed
          for (const id of notificationIds) {
            await Notification.updateOne(
              { 
                id,
                'deliveries.userId': userId 
              },
              { 
                $set: { 'deliveries.$.dismissedAt': new Date() }
              }
            );
          }
        } else if (notificationId) {
          // Mark single notification as dismissed
          await Notification.updateOne(
            { 
              id: notificationId,
              'deliveries.userId': userId 
            },
            { 
              $set: { 'deliveries.$.dismissedAt': new Date() }
            }
          );
        }

        return createSuccessResponse({ 
          message: 'Notifications dismissed',
          notificationIds: notificationIds || [notificationId] || 'all'
        });

      case 'clear_all':
        // Remove all notifications for this user (mark as dismissed)
        await Notification.updateMany(
          {
            $or: [
              { targetUsers: userId },
              { targetRoles: { $in: [authResult.user.userType] } }
            ],
            'deliveries.userId': userId
          },
          {
            $set: { 'deliveries.$.dismissedAt': new Date() }
          }
        );

        return createSuccessResponse({ 
          message: 'All notifications cleared'
        });

      default:
        return createErrorResponse('Invalid action', 'VALIDATION_ERROR', 400);
    }

  } catch (error) {
    console.error('Error processing notification action:', error);
    return createErrorResponse('Failed to process notification action', 'NOTIFICATION_ACTION_ERROR', 500);
  }
}
