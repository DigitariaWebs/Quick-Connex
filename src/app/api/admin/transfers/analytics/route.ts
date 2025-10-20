import { NextRequest, NextResponse } from 'next/server';
import { requireManager, handleAuthError, createSuccessResponse } from '@/lib/auth/auth-utils';
// import { logAdminAction } from '@/lib/auth/admin-middleware'; // Removed - using auth-utils instead
import dbConnect from '@/lib/database/mongoose';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import Hospital from '@/models/Hospital';
import { Permission } from '@/models/User';
import { AuditAction, AuditCategory, TargetResourceType } from '@/models/AuditLog';

/**
 * Admin Transfer Analytics API Endpoint
 * 
 * Provides comprehensive analytics for transfers:
 * - Transfer statistics and trends
 * - Performance metrics
 * - Hospital analysis
 * - User activity analysis
 * - Export functionality
 */

// GET /api/admin/transfers/analytics - Get transfer analytics
export async function GET(request: NextRequest) {
  try {
    // Check admin permissions
    const { user } = await requireManager();

    const adminUser = user;

    // Check specific permissions
    const hasMetricsPermission = adminUser.userType === 'super_admin' || adminUser.userType === 'admin';
    
    if (!hasMetricsPermission) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions',
        message: 'You do not have permission to view transfer analytics'
      }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d'; // 7d, 30d, 90d, 1y, all
    const hospitalId = searchParams.get('hospitalId');
    const userId = searchParams.get('userId');
    const exportFormat = searchParams.get('export'); // csv, excel, json

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (dateRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = new Date(0); // All time
        break;
    }

    // Build base query
    const baseQuery: any = {
      requestedDate: { $gte: startDate }
    };

    if (hospitalId) {
      baseQuery.$or = [
        { fromHospital: hospitalId },
        { toHospital: hospitalId }
      ];
    }

    if (userId) {
      baseQuery.requestedBy = userId;
    }

    // Get overall statistics
    const overallStats = await Transfer.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } },
          patient: { $sum: { $cond: [{ $eq: ['$transferCategory', 'patient'] }, 1, 0] } },
          envelope: { $sum: { $cond: [{ $eq: ['$transferCategory', 'envelope'] }, 1, 0] } },
          medical_instruments: { $sum: { $cond: [{ $eq: ['$transferCategory', 'medical_instruments'] }, 1, 0] } }
        }
      }
    ]);

    // Get daily trends for the last 30 days
    const dailyTrends = await Transfer.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: {
            year: { $year: '$requestedDate' },
            month: { $month: '$requestedDate' },
            day: { $dayOfMonth: '$requestedDate' }
          },
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      { $limit: 30 }
    ]);

    // Get hospital analysis
    const hospitalAnalysis = await Transfer.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$fromHospital',
          totalFrom: { $sum: 1 },
          completedFrom: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelledFrom: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'hospitals',
          localField: '_id',
          foreignField: '_id',
          as: 'hospital'
        }
      },
      { $unwind: '$hospital' },
      {
        $project: {
          hospitalId: '$_id',
          hospitalName: '$hospital.name',
          totalFrom: 1,
          completedFrom: 1,
          cancelledFrom: 1,
          completionRate: {
            $cond: [
              { $gt: ['$totalFrom', 0] },
              { $multiply: [{ $divide: ['$completedFrom', '$totalFrom'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { totalFrom: -1 } },
      { $limit: 10 }
    ]);

    // Get user activity analysis
    const userActivity = await Transfer.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$requestedBy',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          userEmail: '$user.email',
          userType: '$user.userType',
          total: 1,
          completed: 1,
          cancelled: 1,
          urgent: 1,
          completionRate: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 20 }
    ]);

    // Get performance metrics
    const performanceMetrics = await Transfer.aggregate([
      { $match: { ...baseQuery, status: 'completed' } },
      {
        $group: {
          _id: null,
          avgCompletionTime: { $avg: '$actualDuration' },
          minCompletionTime: { $min: '$actualDuration' },
          maxCompletionTime: { $max: '$actualDuration' },
          totalCompleted: { $sum: 1 }
        }
      }
    ]);

    // Get status distribution over time
    const statusDistribution = await Transfer.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: {
            status: '$status',
            month: { $month: '$requestedDate' },
            year: { $year: '$requestedDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get priority distribution
    const priorityDistribution = await Transfer.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get category distribution
    const categoryDistribution = await Transfer.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$transferCategory',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Log admin action
    console.log('Admin action logged:', {
      adminId: adminUser._id.toString(),
      adminName: `${adminUser.firstName} ${adminUser.lastName}`,
      adminEmail: adminUser.email,
      adminRole: adminUser.userType as 'admin' | 'super_admin',
      action: AuditAction.REPORT_GENERATED,
      category: AuditCategory.DATA_ACCESS,
      description: `Generated transfer analytics report (${dateRange})`,
      targetResource: {
        type: TargetResourceType.REPORT,
        id: 'transfer_analytics',
        name: 'Transfer Analytics Report'
      },
      metadata: {
        dateRange,
        hospitalId,
        userId,
        exportFormat
      },
      requestInfo: {
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        method: request.method,
        endpoint: request.url
      },
      outcome: 'success'
    });

    const analytics = {
      overview: {
        dateRange,
        period: {
          start: startDate,
          end: now
        },
        stats: overallStats[0] || {
          total: 0,
          pending: 0,
          accepted: 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
          urgent: 0,
          high: 0,
          medium: 0,
          low: 0,
          patient: 0,
          envelope: 0,
          medical_instruments: 0
        }
      },
      trends: {
        daily: dailyTrends,
        statusDistribution,
        priorityDistribution,
        categoryDistribution
      },
      performance: {
        metrics: performanceMetrics[0] || {
          avgCompletionTime: 0,
          minCompletionTime: 0,
          maxCompletionTime: 0,
          totalCompleted: 0
        },
        hospitalAnalysis,
        userActivity
      },
      filters: {
        dateRange,
        hospitalId,
        userId
      }
    };

    // Handle export requests
    if (exportFormat) {
      return handleExport(analytics, exportFormat, adminUser, request);
    }

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Admin transfer analytics error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to handle export requests
async function handleExport(analytics: any, format: string, adminUser: any, request: NextRequest) {
  try {
    // Log export action
    console.log('Admin action logged:', {
      adminId: adminUser._id.toString(),
      adminName: `${adminUser.firstName} ${adminUser.lastName}`,
      adminEmail: adminUser.email,
      adminRole: adminUser.userType as 'admin' | 'super_admin',
      action: AuditAction.DATA_EXPORTED,
      category: AuditCategory.DATA_ACCESS,
      description: `Exported transfer analytics as ${format}`,
      targetResource: {
        type: TargetResourceType.REPORT,
        id: 'transfer_analytics',
        name: 'Transfer Analytics Export'
      },
      metadata: {
        format,
        dataPoints: Object.keys(analytics).length
      },
      requestInfo: {
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        method: request.method,
        endpoint: request.url
      },
      outcome: 'success'
    });

    switch (format.toLowerCase()) {
      case 'csv':
        return new NextResponse(generateCSV(analytics), {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="transfer-analytics-${new Date().toISOString().split('T')[0]}.csv"`
          }
        });

      case 'json':
        return new NextResponse(JSON.stringify(analytics, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="transfer-analytics-${new Date().toISOString().split('T')[0]}.json"`
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Unsupported export format',
          message: `Export format '${format}' is not supported`
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({
      success: false,
      error: 'Export failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to generate CSV data
function generateCSV(analytics: any): string {
  const lines = [];
  
  // Add header
  lines.push('Metric,Value');
  
  // Add overview stats
  const stats = analytics.overview.stats;
  lines.push(`Total Transfers,${stats.total}`);
  lines.push(`Pending,${stats.pending}`);
  lines.push(`Accepted,${stats.accepted}`);
  lines.push(`In Progress,${stats.inProgress}`);
  lines.push(`Completed,${stats.completed}`);
  lines.push(`Cancelled,${stats.cancelled}`);
  lines.push(`Urgent Priority,${stats.urgent}`);
  lines.push(`High Priority,${stats.high}`);
  lines.push(`Medium Priority,${stats.medium}`);
  lines.push(`Low Priority,${stats.low}`);
  
  // Add performance metrics
  const perf = analytics.performance.metrics;
  lines.push(`Average Completion Time,${perf.avgCompletionTime || 0}`);
  lines.push(`Min Completion Time,${perf.minCompletionTime || 0}`);
  lines.push(`Max Completion Time,${perf.maxCompletionTime || 0}`);
  lines.push(`Total Completed,${perf.totalCompleted || 0}`);
  
  return lines.join('\n');
}


