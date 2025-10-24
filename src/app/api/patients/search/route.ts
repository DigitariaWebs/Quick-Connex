import { NextRequest, NextResponse } from 'next/server';
import Patient from '@/models/Patient';
import { AuthService } from '@/lib/auth';// GET /api/patients/search - Search patients
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
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

    return NextResponse.json({
      success: true,
      data: patients,
      message: 'Patient search completed'
    });

  } catch (error) {
    console.error('Error searching patients:', error);
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
