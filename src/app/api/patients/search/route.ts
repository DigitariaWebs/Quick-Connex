import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import Patient from '@/models/Patient';
import { requireEmployeeOrManager, handleAuthError, createSuccessResponse } from '@/lib/auth/auth-utils';

// GET /api/patients/search - Search patients
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await requireEmployeeOrManager();

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
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
    return handleAuthError(error);
  }
}
