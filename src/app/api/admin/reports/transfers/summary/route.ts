import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import Hospital from '@/models/Hospital';
import AuditLog from '@/models/AuditLog';
import { TransferSummaryReportData, TimeRange } from '@/types/reports/report.types';
import { TargetResourceType } from '@/models/AuditLog';
import mongoose from 'mongoose';

/**
 * Transfer Summary Report API Endpoint
 * 
 * GET /api/admin/reports/transfers/summary
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
      start.setTime(0);
      break;
  }
  
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

// Helper function to process transfer with pre-fetched data
function processTransfer(
  transfer: any,
  timelineMap: Map<string, any[]>,
  actorsMap: Map<string, any>
): any {
  const transferIdStr = transfer._id ? String(transfer._id) : transfer.transferId;
  const timelineLogs = timelineMap.get(transferIdStr) || [];

  // Process timeline events using pre-fetched actor data
  const timeline = timelineLogs.map((log: any) => {
    let actorName = log.actorName || 'System';
    let actorEmail = log.actorEmail || 'system@example.com';
    let actorType = log.actorType || 'system';
    let actorId = log.actorId || 'unknown';

    // Use pre-fetched actor data if available
    if (log.actorId && mongoose.Types.ObjectId.isValid(log.actorId)) {
      const actor = actorsMap.get(log.actorId.toString());
      if (actor) {
        actorName = `${actor.firstName} ${actor.lastName}`;
        actorEmail = actor.email;
        actorType = actor.userType;
        actorId = actor._id.toString();
      }
    }

    return {
      id: log._id.toString(),
      action: log.action || 'Unknown Action',
      description: log.description || 'No description',
      timestamp: log.timestamp?.toISOString() || new Date().toISOString(),
      actor: {
        id: actorId,
        name: actorName,
        email: actorEmail,
        userType: actorType
      },
      status: log.metadata?.status || log.changes?.status,
      changes: log.changes
    };
  });

  // Use populated data directly from transfer (already populated)
  const requestedByUser = transfer.requestedBy || null;
  const assignedToUser = transfer.assignedTo || null;
  const fromHospitalData = transfer.fromHospital || null;
  const toHospitalData = transfer.toHospital || null;

  return {
    transferId: transfer.transferId,
    transferCategory: transfer.transferCategory,
    status: transfer.status,
    priority: transfer.priority,
    requestedDate: transfer.requestedDate?.toISOString() || new Date().toISOString(),
    scheduledDate: transfer.scheduledDate?.toISOString(),
    acceptedAt: transfer.acceptedAt?.toISOString(),
    completedDate: transfer.completedDate?.toISOString(),
    reason: transfer.reason,
    notes: transfer.notes,
    
    patientInfo: transfer.patientInfo || transfer.transferData?.patientInfo,
    envelopeInfo: transfer.transferData?.envelopeInfo,
    equipmentInfo: transfer.transferData?.equipmentInfo,
    
    fromHospital: fromHospitalData ? {
      id: fromHospitalData._id ? String(fromHospitalData._id) : '',
      name: fromHospitalData.name,
      address: fromHospitalData.address || '',
      organization: fromHospitalData.organization
    } : {
      id: '',
      name: transfer.fromHospitalName || 'Unknown',
      address: ''
    },
    toHospital: toHospitalData ? {
      id: toHospitalData._id ? String(toHospitalData._id) : '',
      name: toHospitalData.name,
      address: toHospitalData.address || '',
      organization: toHospitalData.organization
    } : {
      id: '',
      name: transfer.toHospitalName || 'Unknown',
      address: ''
    },
    
    requestedBy: requestedByUser ? {
      id: requestedByUser._id ? String(requestedByUser._id) : '',
      firstName: requestedByUser.firstName,
      lastName: requestedByUser.lastName,
      email: requestedByUser.email,
      phone: requestedByUser.phone,
      userType: requestedByUser.userType
    } : {
      id: '',
      firstName: 'Unknown',
      lastName: 'User',
      email: '',
      userType: 'unknown'
    },
    assignedTo: assignedToUser ? {
      id: assignedToUser._id ? String(assignedToUser._id) : '',
      firstName: assignedToUser.firstName,
      lastName: assignedToUser.lastName,
      email: assignedToUser.email,
      phone: assignedToUser.phone,
      userType: assignedToUser.userType
    } : undefined,
    
    timeline,
    estimatedDuration: transfer.estimatedDuration,
    actualDuration: transfer.actualDuration,
    medicalDocuments: transfer.medicalDocuments
  };
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

    // Optimize: Fetch transfers with populate and calculate stats in parallel
    const [transfers, statsResult] = await Promise.all([
      // Fetch transfers with populated relationships
      Transfer.find({
        requestedDate: { $gte: start, $lte: end }
      })
        .populate('requestedBy', 'firstName lastName email phone userType')
        .populate('assignedTo', 'firstName lastName email phone userType')
        .populate('fromHospital', 'name address organization')
        .populate('toHospital', 'name address organization')
        .sort({ requestedDate: -1 })
        .lean(),
      
      // Calculate statistics using aggregation (much faster than client-side filtering)
      Transfer.aggregate([
        { $match: { requestedDate: { $gte: start, $lte: end } } },
        {
          $facet: {
            byStatus: [
              { $group: { _id: '$status', count: { $sum: 1 } } }
            ],
            byPriority: [
              { $group: { _id: '$priority', count: { $sum: 1 } } }
            ],
            byCategory: [
              { $group: { _id: '$transferCategory', count: { $sum: 1 } } }
            ],
            total: [{ $count: 'count' }]
          }
        }
      ])
    ]);

    // Extract statistics from aggregation result
    const statsData = statsResult[0];
    const statusCounts = statsData.byStatus.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    const priorityCounts = statsData.byPriority.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    const categoryCounts = statsData.byCategory.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    
    const statistics = {
      total: statsData.total[0]?.count || 0,
      byStatus: {
        pending: statusCounts.pending || 0,
        accepted: statusCounts.accepted || 0,
        in_progress: statusCounts.in_progress || 0,
        completed: statusCounts.completed || 0,
        cancelled: statusCounts.cancelled || 0
      },
      byPriority: {
        low: priorityCounts.low || 0,
        urgent: priorityCounts.urgent || 0
      },
      byCategory: {
        patient: categoryCounts.patient || 0,
        envelope: categoryCounts.envelope || 0,
        medical_instruments: categoryCounts.medical_instruments || 0
      }
    };

    // Optimize: Batch fetch all timeline logs and actors at once
    const transferIds = transfers.map(t => {
      const id = t._id ? String(t._id) : t.transferId;
      return id;
    });
    const transferObjectIds = transfers
      .map(t => t.transferId)
      .filter((id): id is string => !!id);

    // Fetch all timeline logs in a single query
    const allTimelineLogs = await AuditLog.find({
      $or: [
        {
          'targetResource.type': TargetResourceType.TRANSFER,
          'targetResource.id': { $in: transferIds }
        },
        {
          'targetResource.type': TargetResourceType.TRANSFER,
          'targetResource.id': { $in: transferObjectIds }
        }
      ]
    })
      .select('targetResource action description timestamp actorId actorName actorEmail actorType metadata changes')
      .sort({ timestamp: 1 })
      .lean();

    // Group timeline logs by transfer ID
    const timelineMap = new Map<string, any[]>();
    allTimelineLogs.forEach((log: any) => {
      const transferId = log.targetResource?.id;
      if (transferId) {
        if (!timelineMap.has(transferId)) {
          timelineMap.set(transferId, []);
        }
        timelineMap.get(transferId)!.push(log);
      }
    });

    // Collect all unique actor IDs and batch fetch users
    const actorIds = allTimelineLogs
      .map((log: any) => log.actorId)
      .filter((id: any) => id && id !== 'unknown' && mongoose.Types.ObjectId.isValid(id))
      .filter((id: any, index: number, self: any[]) => self.indexOf(id) === index);

    const actorsMap = new Map<string, any>();
    if (actorIds.length > 0) {
      const actors = await User.find({ _id: { $in: actorIds } })
        .select('_id firstName lastName email userType')
        .lean();
      actors.forEach((actor: any) => {
        actorsMap.set(actor._id.toString(), actor);
      });
    }

    // Process all transfers using pre-fetched data
    // Note: transfers are already populated with users and hospitals
    const transferDetails = transfers.map(transfer =>
      processTransfer(transfer, timelineMap, actorsMap)
    );

    // Build report data
    const reportData: TransferSummaryReportData = {
      timeRange,
      period: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      statistics,
      transfers: transferDetails
    };

    return NextResponse.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('Transfer summary report API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate transfer summary report',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

