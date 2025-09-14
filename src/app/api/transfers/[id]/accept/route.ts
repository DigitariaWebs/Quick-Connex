import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Transfer from '@/models/Transfer';

// PUT /api/transfers/[id]/accept - Accept a transfer request
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const transferId = params.id;
    const body = await request.json();
    const { assignedTo, notes } = body;

    // Find the transfer request
    const transfer = await Transfer.findById(transferId);
    if (!transfer) {
      return NextResponse.json(
        { success: false, error: 'Transfer request not found' },
        { status: 404 }
      );
    }

    // Check if transfer is still pending
    if (transfer.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Transfer request is no longer pending' },
        { status: 400 }
      );
    }

    // Update transfer status
    transfer.status = 'accepted';
    transfer.assignedTo = assignedTo;
    if (notes) {
      transfer.notes = notes;
    }

    await transfer.save();

    // Populate the response
    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate('patient', 'patientId firstName lastName dateOfBirth gender phone currentHospital currentDepartment')
      .populate('requestedBy', 'firstName lastName email userType')
      .populate('assignedTo', 'firstName lastName email');

    return NextResponse.json({
      success: true,
      data: populatedTransfer,
      message: 'Transfer request accepted successfully'
    });

  } catch (error) {
    console.error('Error accepting transfer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to accept transfer request' },
      { status: 500 }
    );
  }
}
