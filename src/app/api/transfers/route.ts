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
      patientFirstName,
      patientLastName,
      patientAge,
      fromHospital,
      toHospital,
      transferDate,
      transferTime,
      transferType,
      issuer,
      priority = 'medium',
      reason,
      notes,
      medicalDocuments = []
    } = body;

    // Validate required fields
    if (!patientFirstName || !patientLastName || !fromHospital || !toHospital || !transferDate || !reason) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current user (would come from session in a real app)
    // This is a placeholder - in a real app, you'd get the user from the session
    const requestingUser = await User.findOne({ userType: 'manager' });
    if (!requestingUser) {
      return NextResponse.json(
        { success: false, error: 'User not authorized' },
        { status: 401 }
      );
    }

    // Create or find patient
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - parseInt(patientAge as string));
    
    // Generate a unique patient ID
    const patientId = `PAT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Create new patient record
    const patient = new Patient({
      patientId,
      firstName: patientFirstName,
      lastName: patientLastName,
      dateOfBirth: dob,
      gender: 'other', // Default since we don't collect in the form
      phone: '000-000-0000', // Default since we don't collect in the form
      address: {
        street: 'Unknown',
        city: 'Unknown',
        state: 'Unknown',
        zipCode: 'Unknown',
        country: 'Unknown'
      },
      medicalInfo: {
        emergencyContact: {
          name: 'Unknown',
          relationship: 'Unknown',
          phone: 'Unknown'
        }
      },
      currentHospital: fromHospital,
      status: 'active'
    });

    await patient.save();

    // Generate unique transfer ID
    const transferId = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Combine date and time for scheduled transfer
    const scheduledDateTime = transferDate && transferTime ? 
      new Date(`${transferDate}T${transferTime}`) : 
      new Date();

    // Create transfer request
    const transfer = new Transfer({
      transferId,
      patientId: patient.patientId,
      patient: patient._id,
      fromHospital,
      fromDepartment: 'General', // Default since we don't collect in the form
      toHospital,
      toDepartment: 'General', // Default since we don't collect in the form
      requestedBy: requestingUser._id,
      reason,
      priority,
      status: transferType === 'stat' ? 'urgent' : 'pending',
      requestedDate: new Date(),
      scheduledDate: scheduledDateTime,
      notes: `Issued by: ${issuer}${notes ? `\nAdditional notes: ${notes}` : ''}`,
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
