import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService, Notification } from '@/lib/database';
import { AuthService } from '@/lib/auth';// GET /api/notifications - Get notifications for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const priority = searchParams.get('priority') || 'all';
    const status = searchParams.get('status') || 'unread'; // 'unread', 'read', 'all'
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const userRoles = [user.userType];
    const userId = user._id;

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
    const notifications = await DatabaseService.findMany(Notification, query, {
      populate: [
        { path: 'transfer', select: 'transferId patient fromHospital toHospital status' },
        { path: 'createdBy', select: 'firstName lastName email userType' }
      ],
      sort: { createdAt: -1 },
      skip: offset,
      limit: limit
    });

    // Get total count for pagination
    const totalCount = await DatabaseService.count(Notification, query);

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
      unread: await DatabaseService.count(Notification, {
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
      high: await DatabaseService.count(Notification, {
        ...query,
        priority: 'high'
      }),
      medium: await DatabaseService.count(Notification, {
        ...query,
        priority: 'medium'
      }),
      low: await DatabaseService.count(Notification, {
        ...query,
        priority: 'low'
      })
    };

    return NextResponse.json({
      success: true,
      data: {
        notifications: transformedNotifications,
        summary,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Mark notifications as read/dismissed or create new ones
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
const body = await request.json();
    const { action, notificationIds, notificationId, all } = body;

    const userId = user._id;

    switch (action) {
      case 'mark_read':
        if (all) {
          // Mark all notifications as read for this user
          await Notification.updateMany(
            {
              $or: [
                { targetUsers: userId },
                { targetRoles: { $in: [user.userType] } }
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

        return NextResponse.json({
          success: true,
          data: { 
            message: 'Notifications marked as read',
            notificationIds: notificationIds || [notificationId] || 'all'
          }
        });

      case 'mark_dismissed':
        if (all) {
          // Mark all notifications as dismissed for this user
          await Notification.updateMany(
            {
              $or: [
                { targetUsers: userId },
                { targetRoles: { $in: [user.userType] } }
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

        return NextResponse.json({
          success: true,
          data: { 
            message: 'Notifications dismissed',
            notificationIds: notificationIds || [notificationId] || 'all'
          }
        });

      case 'clear_all':
        // Remove all notifications for this user (mark as dismissed)
        await Notification.updateMany(
          {
            $or: [
              { targetUsers: userId },
              { targetRoles: { $in: [user.userType] } }
            ],
            'deliveries.userId': userId
          },
          {
            $set: { 'deliveries.$.dismissedAt': new Date() }
          }
        );

        return NextResponse.json({
          success: true,
          data: { 
            message: 'All notifications cleared'
          }
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing notification action:', error);
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
