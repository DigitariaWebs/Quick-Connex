import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { UserReportData, TimeRange } from '@/types/reports/report.types';
import { AuditAction, AuditCategory } from '@/models/AuditLog';
import mongoose from 'mongoose';

/**
 * User Reports API Endpoint
 * 
 * GET /api/admin/reports/users
 * Query parameters: timeRange (7d, 30d, 90d, all)
 */

function calculateDateRange(timeRange: TimeRange): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  
  switch (timeRange) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case 'all':
      start.setTime(0); // Beginning of time
      break;
  }
  
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['admin', 'super_admin'],
      requireSession: true
    });

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const timeRange = (searchParams.get('timeRange') || '30d') as TimeRange;
    
    const { start, end } = calculateDateRange(timeRange);

    // Optimize: Use a single aggregation pipeline to get all user stats at once
    // This is much faster than multiple separate count queries
    const [
      userStatsResult,
      activityLogs
    ] = await Promise.all([
      // Single aggregation to get all user counts
      User.aggregate([
        {
          $facet: {
            total: [{ $count: "count" }],
            byStatus: [
              { $group: { _id: "$status", count: { $sum: 1 } } }
            ],
            newInPeriod: [
              { $match: { createdAt: { $gte: start, $lte: end } } },
              { $count: "count" }
            ],
            byRole: [
              { $group: { _id: "$userType", count: { $sum: 1 } } }
            ]
          }
        }
      ]),
      
      // User activity from audit logs
      AuditLog.find({
        $or: [
          { category: AuditCategory.USER_MANAGEMENT },
          { category: AuditCategory.AUTHENTICATION },
          { action: { $in: [AuditAction.LOGIN_SUCCESS, AuditAction.LOGIN_FAILED, AuditAction.LOGOUT] } }
        ],
        timestamp: { $gte: start, $lte: end }
      })
        .select('actorId actorName actorEmail actorType action description timestamp category')
        .sort({ timestamp: -1 })
        .limit(100)
        .lean()
    ]);

    // Extract stats from aggregation result
    const statsData = userStatsResult[0];
    const totalUsers = statsData.total[0]?.count || 0;
    const statusCounts = statsData.byStatus.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    const approvedUsers = statusCounts.approved || 0;
    const pendingUsers = statusCounts.pending || 0;
    const suspendedUsers = statusCounts.suspended || 0;
    const rejectedUsers = statusCounts.rejected || 0;
    const newUsersInPeriod = statsData.newInPeriod[0]?.count || 0;
    const usersByRole = statsData.byRole || [];

    // Process role breakdown
    const roleBreakdown = {
      employee: 0,
      manager: 0,
      admin: 0,
      super_admin: 0
    };
    
    usersByRole.forEach((role: any) => {
      if (role._id in roleBreakdown) {
        roleBreakdown[role._id as keyof typeof roleBreakdown] = role.count;
      }
    });

    // Optimize: Batch fetch all user details at once instead of N+1 queries
    // Collect all unique actorIds that need user details
    const actorIds = activityLogs
      .map((log: any) => log.actorId)
      .filter((id: any) => id && id !== 'unknown' && mongoose.Types.ObjectId.isValid(id))
      .filter((id: any, index: number, self: any[]) => self.indexOf(id) === index); // Remove duplicates

    // Batch fetch all users in a single query
    const usersMap = new Map();
    if (actorIds.length > 0) {
      const users = await User.find({ _id: { $in: actorIds } })
        .select('_id firstName lastName email userType')
        .lean();
      
      users.forEach((user: any) => {
        usersMap.set(user._id.toString(), user);
      });
    }

    // Process activity logs using the batch-fetched user data
    const activitySummary = activityLogs.map((log: any) => {
      let userName = log.actorName || 'System';
      let userEmail = log.actorEmail || 'system@example.com';
      let userType = log.actorType || 'system';
      let userId = log.actorId || 'unknown';

      // Use batch-fetched user data if available
      if (log.actorId && mongoose.Types.ObjectId.isValid(log.actorId)) {
        const user = usersMap.get(log.actorId.toString());
        if (user) {
          userName = `${user.firstName} ${user.lastName}`;
          userEmail = user.email;
          userType = user.userType;
          userId = user._id.toString();
        }
      }

      return {
        userId,
        userName,
        userEmail,
        userType,
        action: log.action || 'Unknown Action',
        description: log.description || 'No description',
        timestamp: log.timestamp?.toISOString() || new Date().toISOString(),
        category: log.category || 'system'
      };
    });

    // Build report data
    const reportData: UserReportData = {
      timeRange,
      period: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      statusBreakdown: {
        approved: approvedUsers,
        pending: pendingUsers,
        suspended: suspendedUsers,
        rejected: rejectedUsers,
        total: totalUsers
      },
      roleBreakdown,
      totalUsers,
      newUsersInPeriod,
      activitySummary
    };

    return NextResponse.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('User reports API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate user report',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

