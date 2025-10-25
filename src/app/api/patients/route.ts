import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import Patient from '@/models/Patient';
import { AuthService } from '@/lib/auth';
import { AuditService } from '@/lib/audit';
import { PatientAuditContext } from '@/lib/audit';
import { AuditAction, ActorType, TargetResourceType } from '@/models/AuditLog';

// GET /api/patients - Get patients (search and list)
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    let query: any = { isActive: true };

    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { dossierNumber: searchRegex },
        { 'address.city': searchRegex }
      ];
    }

    // Get patients with pagination using DatabaseService
    const result = await DatabaseService.findWithPagination(Patient, query, {
      page,
      limit,
      sort: { createdAt: -1 }
    }, {
      populate: [
        { path: 'createdBy', select: 'firstName lastName email' },
        { path: 'lastModifiedBy', select: 'firstName lastName email' }
      ]
    });

    const patients = result.data;
    const totalCount = result.pagination.total;

    // Log patient data access (viewing patient list)
    const patientContext: PatientAuditContext = {
      actorId: user._id.toString(),
      actorType: ActorType.USER,
      actorEmail: user.email,
      actorName: `${user.firstName} ${user.lastName}`,
      actorRole: user.userType,
      action: AuditAction.PATIENT_VIEWED,
      description: `Patient list accessed (${totalCount} patients)`,
      targetResourceType: TargetResourceType.PATIENT,
      targetResourceId: 'multiple', // Multiple patients
      targetResourceName: 'Patient List',
      metadata: {
        searchQuery: search || undefined,
        resultCount: totalCount,
        page,
        limit
      },
      requestInfo: AuditService.extractRequestInfo(request),
      success: true
    };
    
    await AuditService.logPatientAction(patientContext);

    return NextResponse.json({
      success: true,
      data: {
        patients,
        pagination: result.pagination
      },
      message: 'Patients retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching patients:', error);
    
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

// POST /api/patients - Create a new patient
export async function POST(request: NextRequest) {
  try {
    // Authenticate user - only managers can create patients
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    const body = await request.json();
    const {
      firstName,
      lastName,
      age,
      dossierNumber
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !age || !dossierNumber) {
      return NextResponse.json({ error: 'Missing required fields: firstName, lastName, age, dossierNumber' }, { status: 400 });
    }

    // Check if patient with dossier number already exists
    const existingPatient = await DatabaseService.findOne(Patient, { 
      dossierNumber: dossierNumber.toUpperCase(),
      isActive: true 
    });

    if (existingPatient) {
      return NextResponse.json({ error: 'Patient with this dossier number already exists' }, { status: 409 });
    }

    // Create new patient using DatabaseService
    const patient = await DatabaseService.create(Patient, {
      firstName,
      lastName,
      age,
      dossierNumber: dossierNumber.toUpperCase(),
      createdBy: user._id,
      lastModifiedBy: user._id,
      isActive: true
    });

    // Log patient creation
    const patientContext: PatientAuditContext = {
      actorId: user._id.toString(),
      actorType: ActorType.USER,
      actorEmail: user.email,
      actorName: `${user.firstName} ${user.lastName}`,
      actorRole: user.userType,
      action: AuditAction.PATIENT_CREATED,
      description: `Patient created: ${firstName} ${lastName} (${dossierNumber})`,
      targetResourceType: TargetResourceType.PATIENT,
      targetResourceId: patient._id.toString(),
      targetResourceName: `${firstName} ${lastName}`,
      metadata: {
        dossierNumber: dossierNumber.toUpperCase(),
        age,
        changes: {
          after: {
            firstName,
            lastName,
            age,
            dossierNumber: dossierNumber.toUpperCase()
          },
          fields: ['firstName', 'lastName', 'age', 'dossierNumber']
        }
      },
      requestInfo: AuditService.extractRequestInfo(request),
      success: true
    };
    
    await AuditService.logPatientAction(patientContext);

    // Get populated patient for response
    const populatedPatient = await DatabaseService.findById(Patient, patient._id.toString(), {
      populate: [
        { path: 'createdBy', select: 'firstName lastName email' },
        { path: 'lastModifiedBy', select: 'firstName lastName email' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: populatedPatient,
      message: 'Patient created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating patient:', error);
    
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
