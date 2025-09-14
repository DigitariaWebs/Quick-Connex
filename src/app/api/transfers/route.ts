import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Transfer from '@/models/Transfer';
import Patient from '@/models/Patient';
import User from '@/models/User';

// GET /api/transfers - Get all transfer requests for employees
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const assignedTo = searchParams.get('assignedTo');

    // Build query
    const query: any = { status };
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    // Get transfers with populated data
    const transfers = await Transfer.find(query)
      .populate('patient', 'patientId firstName lastName dateOfBirth gender phone currentHospital currentDepartment')
      .populate('requestedBy', 'firstName lastName email userType')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ requestedDate: -1 })
      .limit(50);

    return NextResponse.json({
      success: true,
      data: transfers,
      count: transfers.length
    });

  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
}

// POST /api/transfers - Create a new transfer request (for managers)
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      patientId,
      fromHospital,
      fromDepartment,
      toHospital,
      toDepartment,
      requestedBy,
      reason,
      priority = 'medium',
      scheduledDate,
      notes,
      medicalDocuments = []
    } = body;

    // Validate required fields
    if (!patientId || !fromHospital || !toHospital || !requestedBy || !reason) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if patient exists
    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Generate unique transfer ID
    const transferId = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create transfer request
    const transfer = new Transfer({
      transferId,
      patientId,
      patient: patient._id,
      fromHospital,
      fromDepartment,
      toHospital,
      toDepartment,
      requestedBy,
      reason,
      priority,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      notes,
      medicalDocuments
    });

    await transfer.save();

    // Populate the response
    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate('patient', 'patientId firstName lastName dateOfBirth gender phone currentHospital currentDepartment')
      .populate('requestedBy', 'firstName lastName email userType');

    return NextResponse.json({
      success: true,
      data: populatedTransfer
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating transfer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create transfer request' },
      { status: 500 }
    );
  }
}
