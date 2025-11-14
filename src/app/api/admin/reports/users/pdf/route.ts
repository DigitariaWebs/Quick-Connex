import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { DatabaseService } from '@/lib/database';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { PDFGenerator } from '@/lib/reports/pdf-generator';
import { UserReportData, TimeRange } from '@/types/reports/report.types';
import { AuditAction, AuditCategory } from '@/models/AuditLog';

/**
 * User Report PDF Download Endpoint
 * 
 * POST /api/admin/reports/users/pdf
 * Body: { timeRange: '7d' | '30d' | '90d' | 'all' }
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
      start.setTime(0);
      break;
  }
  
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['admin', 'super_admin'],
      requireSession: true
    });

    // Get request body
    const body = await request.json();
    const timeRange = (body.timeRange || '30d') as TimeRange;
    
    const { start, end } = calculateDateRange(timeRange);

    // Fetch user statistics in parallel
    const [
      totalUsers,
      approvedUsers,
      pendingUsers,
      suspendedUsers,
      rejectedUsers,
      newUsersInPeriod,
      usersByRole,
      activityLogs
    ] = await Promise.all([
      DatabaseService.count(User, {}),
      DatabaseService.count(User, { status: 'approved' }),
      DatabaseService.count(User, { status: 'pending' }),
      DatabaseService.count(User, { status: 'suspended' }),
      DatabaseService.count(User, { status: 'rejected' }),
      DatabaseService.count(User, {
        createdAt: { $gte: start, $lte: end }
      }),
      DatabaseService.aggregate(User, [
        { $group: { _id: '$userType', count: { $sum: 1 } } }
      ]),
      DatabaseService.findMany(AuditLog, {
        $or: [
          { category: AuditCategory.USER_MANAGEMENT },
          { category: AuditCategory.AUTHENTICATION },
          { action: { $in: [AuditAction.LOGIN_SUCCESS, AuditAction.LOGIN_FAILED, AuditAction.LOGOUT] } }
        ],
        timestamp: { $gte: start, $lte: end }
      }, {
        sort: { timestamp: -1 },
        limit: 100
      })
    ]);

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

    // Process activity logs
    const activitySummary = await Promise.all(
      activityLogs.map(async (log: any) => {
        let userName = log.adminName || log.actorName || 'System';
        let userEmail = log.adminEmail || log.actorEmail || 'system@example.com';
        let userType = log.adminRole || log.actorType || 'system';
        let userId = log.adminId || log.actorId || 'unknown';

        if (log.actorId && log.actorId !== 'unknown') {
          try {
            const user = await DatabaseService.findOne(User, { _id: log.actorId });
            if (user && user._id) {
              userName = `${user.firstName} ${user.lastName}`;
              userEmail = user.email;
              userType = user.userType;
              userId = String(user._id);
            }
          } catch (error) {
            console.warn('User not found for activity log:', log.actorId);
          }
        }

        return {
          userId,
          userName,
          userEmail,
          userType,
          action: log.action || 'Unknown Action',
          description: log.description || 'No description',
          timestamp: log.timestamp.toISOString(),
          category: log.category || 'system'
        };
      })
    );

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

    // Generate PDF
    const pdfBuffer = await PDFGenerator.generateUserReport(reportData, timeRange);

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `user-report-${timeRange}-${timestamp}.pdf`;

    // Return PDF
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('❌ User report PDF generation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate PDF',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

