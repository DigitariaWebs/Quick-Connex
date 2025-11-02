/**
 * My Accepted Transfers API
 * 
 * This endpoint returns transfers that have been accepted by the current employee.
 * Only shows transfers where the current user is the assigned employee.
 */

import { NextRequest, NextResponse } from 'next/server';
import Transfer from '@/models/Transfer';
import { AuthService } from '@/lib/auth';
import { createSuccessResponse } from '@/lib/utils/api-responses';
import { TransferStatus } from '@/lib/transfers';
import { log } from '@/lib/logging';

export async function GET(request: NextRequest) {
  let user: any = null;
  
  try {
    // Authenticate user
    const authResult = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });
    user = authResult.user;

    // Only employees can access their accepted transfers
    if (user.userType !== 'employee') {
      return NextResponse.json({ error: 'Only employees can access their accepted transfers' }, { status: 403 });
    }

    // DatabaseService handles connection automatically
const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build query for transfers assigned to this employee
    const query: any = {
      assignedTo: user._id
    };

    // Add status filter if provided
    if (status && status !== 'all') {
      query.status = status;
    } else {
      // Default: only show active transfers (not pending or accepted)
      query.status = { $in: [TransferStatus.IN_PROGRESS, TransferStatus.COMPLETED, TransferStatus.CANCELLED] };
    }

    // Get transfers with populated data
    const transfers = await Transfer.find(query)
      .populate('requestedBy', 'firstName lastName email phone userType')
      .populate('assignedTo', 'firstName lastName email phone userType')
      .populate('fromHospital', 'name address organization')
      .populate('toHospital', 'name address organization')
      .sort({ requestedDate: -1 })
      .lean();

    // Transform the data for the frontend
    const transformedTransfers = transfers.map(transfer => ({
      _id: transfer._id,
      transferId: transfer.transferId,
      transferCategory: transfer.transferCategory,
      patientInfo: transfer.patientInfo,
      transferData: transfer.transferData,
      fromHospital: transfer.fromHospital,
      toHospital: transfer.toHospital,
      fromHospitalName: transfer.fromHospitalName,
      toHospitalName: transfer.toHospitalName,
      requestedBy: transfer.requestedBy,
      assignedTo: transfer.assignedTo,
      reason: transfer.reason,
      priority: transfer.priority,
      status: transfer.status,
      requestedDate: transfer.requestedDate,
      scheduledDate: transfer.scheduledDate,
      completedDate: transfer.completedDate,
      notes: transfer.notes,
      statusHistory: transfer.statusHistory || []
    }));

    return createSuccessResponse({
      transfers: transformedTransfers,
      count: transformedTransfers.length,
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        userType: user.userType
      }
    });

  } catch (error) {
    log.error('Error fetching my accepted transfers', error, {
      category: 'transfer',
      operation: 'get_my_accepted',
      userId: user?._id?.toString() || 'unknown'
    });
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
