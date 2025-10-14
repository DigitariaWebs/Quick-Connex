import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import Patient from '@/models/Patient';
import { requireEmployeeOrManager, createErrorResponse, createSuccessResponse } from '@/lib/auth/auth-middleware';

// GET /api/patients/search - Search patients
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length < 2) {
      return createErrorResponse('Search query must be at least 2 characters', 'VALIDATION_ERROR', 400);
    }

    const searchRegex = new RegExp(query.trim(), 'i');
    const patients = await Patient.find({
      isActive: true,
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { dossierNumber: searchRegex },
        { 'address.city': searchRegex }
      ]
    })
    .select('firstName lastName age dossierNumber address.city')
    .limit(limit)
    .sort({ lastName: 1, firstName: 1 });

    return createSuccessResponse(patients, 'Patient search completed');

  } catch (error) {
    console.error('Error searching patients:', error);
    return createErrorResponse('Failed to search patients', 'INTERNAL_ERROR', 500);
  }
}
