import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { DatabaseService } from '@/lib/database';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import Hospital from '@/models/Hospital';
import AuditLog from '@/models/AuditLog';
import { PDFGenerator } from '@/lib/reports/pdf-generator';
import { TransferSummaryReportData, TimeRange } from '@/types/reports/report.types';
import { TargetResourceType } from '@/models/AuditLog';

/**
 * Transfer Summary Report PDF Download Endpoint
 * 
 * POST /api/admin/reports/transfers/summary/pdf
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

async function getTransferDetails(transfer: any): Promise<any> {
  const [requestedByUser, assignedToUser, fromHospitalData, toHospitalData] = await Promise.all([
    transfer.requestedBy 
      ? DatabaseService.findOne(User, { _id: transfer.requestedBy })
      : null,
    transfer.assignedTo 
      ? DatabaseService.findOne(User, { _id: transfer.assignedTo })
      : null,
    transfer.fromHospital 
      ? DatabaseService.findOne(Hospital, { _id: transfer.fromHospital })
      : null,
    transfer.toHospital 
      ? DatabaseService.findOne(Hospital, { _id: transfer.toHospital })
      : null
  ]);

  const transferIdStr = transfer._id ? String(transfer._id) : transfer.transferId;
  const timelineLogs = await DatabaseService.findMany(AuditLog, {
    $or: [
      {
        'targetResource.type': TargetResourceType.TRANSFER,
        'targetResource.id': transferIdStr
      },
      {
        'targetResource.type': TargetResourceType.TRANSFER,
        'targetResource.id': transfer.transferId
      }
    ]
  }, {
    sort: { timestamp: 1 }
  });

  const timeline = await Promise.all(
    timelineLogs.map(async (log: any) => {
      let actorName = log.adminName || log.actorName || 'System';
      let actorEmail = log.adminEmail || log.actorEmail || 'system@example.com';
      let actorType = log.adminRole || log.actorType || 'system';
      let actorId = log.adminId || log.actorId || 'unknown';

      if (log.actorId && log.actorId !== 'unknown') {
        try {
          const actor = await DatabaseService.findOne(User, { _id: log.actorId });
          if (actor && actor._id) {
            actorName = `${actor.firstName} ${actor.lastName}`;
            actorEmail = actor.email;
            actorType = actor.userType;
            actorId = String(actor._id);
          }
        } catch (error) {
          // Use log data if user not found
        }
      }

      return {
        id: log._id.toString(),
        action: log.action || 'Unknown Action',
        description: log.description || 'No description',
        timestamp: log.timestamp.toISOString(),
        actor: {
          id: actorId,
          name: actorName,
          email: actorEmail,
          userType: actorType
        },
        status: log.metadata?.status || log.changes?.status,
        changes: log.changes
      };
    })
  );

  return {
    transferId: transfer.transferId,
    transferCategory: transfer.transferCategory,
    status: transfer.status,
    priority: transfer.priority,
    requestedDate: transfer.requestedDate.toISOString(),
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

    // Fetch transfers in date range
    const transfers = await DatabaseService.findMany(Transfer, {
      requestedDate: { $gte: start, $lte: end }
    }, {
      sort: { requestedDate: -1 }
    });

    // Calculate statistics
    const statistics = {
      total: transfers.length,
      byStatus: {
        pending: transfers.filter(t => t.status === 'pending').length,
        accepted: transfers.filter(t => t.status === 'accepted').length,
        in_progress: transfers.filter(t => t.status === 'in_progress').length,
        completed: transfers.filter(t => t.status === 'completed').length,
        cancelled: transfers.filter(t => t.status === 'cancelled').length
      },
      byPriority: {
        low: transfers.filter(t => t.priority === 'low').length,
        urgent: transfers.filter(t => t.priority === 'urgent').length
      },
      byCategory: {
        patient: transfers.filter(t => t.transferCategory === 'patient').length,
        envelope: transfers.filter(t => t.transferCategory === 'envelope').length,
        medical_instruments: transfers.filter(t => t.transferCategory === 'medical_instruments').length
      }
    };

    // Get detailed information for each transfer
    const transferDetails = await Promise.all(
      transfers.map(transfer => getTransferDetails(transfer))
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

    // Generate PDF
    const pdfBuffer = await PDFGenerator.generateTransferSummaryReport(reportData, timeRange);

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `transfer-summary-${timeRange}-${timestamp}.pdf`;

    // Return PDF
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('❌ Transfer summary report PDF generation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate PDF',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

