import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Patient from '@/models/Patient';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import { mockUsers, mockPatients, mockTransfers } from '@/data/mockData';

// POST /api/load-mock-data - Load mock data into the database
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Clear existing data
    await Patient.deleteMany({});
    await Transfer.deleteMany({});
    await User.deleteMany({});

    // Create users
    const createdUsers = await User.insertMany(mockUsers);
    console.log(`Created ${createdUsers.length} users`);

    // Create patients
    const createdPatients = await Patient.insertMany(mockPatients);
    console.log(`Created ${createdPatients.length} patients`);

    // Create transfers with proper references
    const transfersWithReferences = mockTransfers.map(transfer => ({
      ...transfer,
      patient: createdPatients.find(p => p._id === transfer.patient)?._id,
      requestedBy: createdUsers.find(u => u._id === transfer.requestedBy)?._id,
      assignedTo: transfer.assignedTo ? createdUsers.find(u => u._id === transfer.assignedTo)?._id : undefined
    }));

    const createdTransfers = await Transfer.insertMany(transfersWithReferences);
    console.log(`Created ${createdTransfers.length} transfers`);

    return NextResponse.json({
      success: true,
      message: 'Mock data loaded successfully',
      data: {
        users: createdUsers.length,
        patients: createdPatients.length,
        transfers: createdTransfers.length
      }
    });

  } catch (error) {
    console.error('Error loading mock data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load mock data' },
      { status: 500 }
    );
  }
}

// GET /api/load-mock-data - Get information about mock data
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const userCount = await User.countDocuments();
    const patientCount = await Patient.countDocuments();
    const transferCount = await Transfer.countDocuments();

    return NextResponse.json({
      success: true,
      data: {
        users: userCount,
        patients: patientCount,
        transfers: transferCount
      },
      mockDataAvailable: {
        users: mockUsers.length,
        patients: mockPatients.length,
        transfers: mockTransfers.length
      }
    });

  } catch (error) {
    console.error('Error getting data info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get data info' },
      { status: 500 }
    );
  }
}
