import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Transfer from '@/models/Transfer';
import { requireEmployeeOrManager, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware';

// GET /api/transfers/[id] - Get a specific transfer by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    const transferId = params.id;

    // Find the transfer with populated data
    const transfer = await Transfer.findById(transferId)
      .populate('requestedBy', 'firstName lastName email userType')
      .populate('lastModifiedBy', 'firstName lastName email');

    if (!transfer) {
      return createErrorResponse('Transfer not found', 'TRANSFER_NOT_FOUND', 404);
    }

    return createSuccessResponse(transfer);

  } catch (error) {
    console.error('Error fetching transfer:', error);
    return createErrorResponse('Failed to fetch transfer', 'FETCH_ERROR', 500, {
      originalError: error.message,
      errorType: error.name
    });
  }
}
