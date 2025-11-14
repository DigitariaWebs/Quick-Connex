import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { DatabaseService } from '@/lib/database';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import Hospital from '@/models/Hospital';
import AuditLog from '@/models/AuditLog';
import { PDFGenerator } from '@/lib/reports/pdf-generator';
import { TransferReportData } from '@/types/reports/report.types';
import { TargetResourceType } from '@/models/AuditLog';

/**
 * Individual Transfer Report PDF Download Endpoint
 * 
 * GET /api/admin/reports/transfers/[id]/pdf
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['admin', 'super_admin'],
      requireSession: true
    });

    const transferId = params.id;

    // Fetch transfer
    const transfer = await DatabaseService.findOne(Transfer, { 
      $or: [
        { _id: transferId },
        { transferId: transferId }
      ]
    });

    if (!transfer) {
      return NextResponse.json({
        success: false,
        error: 'Transfer not found'
      }, { status: 404 });
    }

    // Populate user and hospital references
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

    // Fetch timeline from audit logs
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

    // Process timeline events
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

    // Build transfer report data
    const reportData: TransferReportData = {
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

    // Generate PDF
    const pdfBuffer = await PDFGenerator.generateTransferReport(reportData);

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `transfer-report-${reportData.transferId}-${timestamp}.pdf`;

    // Return PDF
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('❌ Transfer report PDF generation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate PDF',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

