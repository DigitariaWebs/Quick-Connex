import { NextRequest, NextResponse } from 'next/server';
import { requireManager } from '@/lib/auth-middleware';
import { getPopulatedTransfers, getMockStats } from '@/data/mockData';

// GET /api/mock-transfers - Get mock transfer data for testing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get all populated transfers
    let transfers = getPopulatedTransfers();

    // Apply status filter if provided
    if (status && status !== 'all') {
      transfers = transfers.filter(t => t.status === status);
    }

    // Apply limit
    transfers = transfers.slice(0, limit);

    // Get statistics
    const stats = getMockStats();

    return NextResponse.json({
      success: true,
      data: transfers,
      stats: stats,
      count: transfers.length,
      total: getPopulatedTransfers().length
    });

  } catch (error) {
    console.error('Error fetching mock transfers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mock transfers' },
      { status: 500 }
    );
  }
}

// POST /api/mock-transfers - Create a new mock transfer request (for managers only)
export async function POST(request: NextRequest) {
  try {
    // Authenticate user - only managers can create transfers
    const authResult = await requireManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    const {
      patientId,
      fromHospital,
      toHospital,
      reason,
      priority = 'medium',
      notes,
      medicalDocuments = []
    } = body;

    // Validate required fields
    if (!patientId || !fromHospital || !toHospital || !reason) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create a new mock transfer
    const newTransfer = {
      _id: `transfer${Date.now()}`,
      transferId: `TRF-${Date.now()}`,
      patientId,
      patient: null, // Will be populated by the frontend
      fromHospital,
      toHospital,
      requestedBy: null, // Will be populated by the frontend
      assignedTo: undefined,
      reason,
      priority,
      status: 'pending' as const,
      requestedDate: new Date(),
      scheduledDate: undefined,
      completedDate: undefined,
      notes,
      medicalDocuments,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return NextResponse.json({
      success: true,
      data: newTransfer,
      message: 'Mock transfer request created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating mock transfer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create mock transfer request' },
      { status: 500 }
    );
  }
}
