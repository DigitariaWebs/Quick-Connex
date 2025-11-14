import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { TransferReportData } from '@/types/reports/report.types';
import { TargetResourceType } from '@/models/AuditLog';
import mongoose from 'mongoose';

/**
 * Individual Transfer Report API Endpoint
 * 
 * GET /api/admin/reports/transfers/[id]
 * Returns complete transfer details with timeline
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

    // Optimize: Fetch transfer with populated references in a single query
    const transfer = await Transfer.findOne({ 
      $or: [
        { _id: transferId },
        { transferId: transferId }
      ]
    })
      .populate('requestedBy', 'firstName lastName email phone userType')
      .populate('assignedTo', 'firstName lastName email phone userType')
      .populate('fromHospital', 'name address organization')
      .populate('toHospital', 'name address organization')
      .lean();

    if (!transfer) {
      return NextResponse.json({
        success: false,
        error: 'Transfer not found'
      }, { status: 404 });
    }

    // Fetch timeline from audit logs
    const transferIdStr = transfer._id ? String(transfer._id) : transfer.transferId;
    const timelineLogs = await AuditLog.find({
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
    })
      .select('actorId actorName actorEmail actorType action description timestamp metadata changes')
      .sort({ timestamp: 1 }) // Chronological order
      .lean();

    // Optimize: Batch fetch all actor users at once instead of N+1 queries
    const actorIds = timelineLogs
      .map((log: any) => log.actorId)
      .filter((id: any) => id && id !== 'unknown' && mongoose.Types.ObjectId.isValid(id))
      .filter((id: any, index: number, self: any[]) => self.indexOf(id) === index); // Remove duplicates

    const actorsMap = new Map<string, any>();
    if (actorIds.length > 0) {
      const actors = await User.find({ _id: { $in: actorIds } })
        .select('_id firstName lastName email userType')
        .lean();
      actors.forEach((actor: any) => {
        actorsMap.set(actor._id.toString(), actor);
      });
    }

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

    // Build transfer report data
    const reportData: TransferReportData = {
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
      
      // Transfer-specific data
      patientInfo: transfer.patientInfo || transfer.transferData?.patientInfo,
      envelopeInfo: transfer.transferData?.envelopeInfo,
      equipmentInfo: transfer.transferData?.equipmentInfo,
      
      // Hospital information (from populated data)
      fromHospital: (transfer.fromHospital && typeof transfer.fromHospital === 'object' && 'name' in transfer.fromHospital) ? {
        id: (transfer.fromHospital as any)._id ? String((transfer.fromHospital as any)._id) : '',
        name: (transfer.fromHospital as any).name,
        address: (transfer.fromHospital as any).address || '',
        organization: (transfer.fromHospital as any).organization
      } : {
        id: '',
        name: transfer.fromHospitalName || 'Unknown',
        address: ''
      },
      toHospital: (transfer.toHospital && typeof transfer.toHospital === 'object' && 'name' in transfer.toHospital) ? {
        id: (transfer.toHospital as any)._id ? String((transfer.toHospital as any)._id) : '',
        name: (transfer.toHospital as any).name,
        address: (transfer.toHospital as any).address || '',
        organization: (transfer.toHospital as any).organization
      } : {
        id: '',
        name: transfer.toHospitalName || 'Unknown',
        address: ''
      },
      
      // User information (from populated data)
      requestedBy: (transfer.requestedBy && typeof transfer.requestedBy === 'object' && 'firstName' in transfer.requestedBy) ? {
        id: (transfer.requestedBy as any)._id ? String((transfer.requestedBy as any)._id) : '',
        firstName: (transfer.requestedBy as any).firstName,
        lastName: (transfer.requestedBy as any).lastName,
        email: (transfer.requestedBy as any).email,
        phone: (transfer.requestedBy as any).phone,
        userType: (transfer.requestedBy as any).userType
      } : {
        id: '',
        firstName: 'Unknown',
        lastName: 'User',
        email: '',
        userType: 'unknown'
      },
      assignedTo: (transfer.assignedTo && typeof transfer.assignedTo === 'object' && 'firstName' in transfer.assignedTo) ? {
        id: (transfer.assignedTo as any)._id ? String((transfer.assignedTo as any)._id) : '',
        firstName: (transfer.assignedTo as any).firstName,
        lastName: (transfer.assignedTo as any).lastName,
        email: (transfer.assignedTo as any).email,
        phone: (transfer.assignedTo as any).phone,
        userType: (transfer.assignedTo as any).userType
      } : undefined,
      
      // Timeline
      timeline,
      
      // Additional info
      estimatedDuration: transfer.estimatedDuration,
      actualDuration: transfer.actualDuration,
      medicalDocuments: transfer.medicalDocuments
    };

    return NextResponse.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('Transfer report API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate transfer report',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

