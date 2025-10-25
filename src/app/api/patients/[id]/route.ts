import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import Patient from '@/models/Patient';
import { AuthService } from '@/lib/auth';
import { ActorType, AuditAction, TargetResourceType } from '@/models/AuditLog';import mongoose from 'mongoose';
import { AuditService } from '@/lib/services/audit';
import { PatientAuditContext } from '@/lib/services/audit';
// GET /api/patients/[id] - Get a specific patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
const { id } = await params;
    const patient = await DatabaseService.findById(Patient, id, {
      populate: [
        { path: 'createdBy', select: 'firstName lastName email' },
        { path: 'lastModifiedBy', select: 'firstName lastName email' }
      ]
    });

    if (!patient || !patient.isActive) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Log patient access (viewing individual patient)
    const patientContext: PatientAuditContext = {
      actorId: user._id.toString(),
      actorType: ActorType.USER,
      actorEmail: user.email,
      actorName: `${user.firstName} ${user.lastName}`,
      actorRole: user.userType,
      action: AuditAction.PATIENT_VIEWED,
      description: `Patient accessed: ${patient.firstName} ${patient.lastName} (${patient.dossierNumber})`,
      targetResourceType: TargetResourceType.PATIENT,
      targetResourceId: patient._id.toString(),
      targetResourceName: `${patient.firstName} ${patient.lastName}`,
      metadata: {
        dossierNumber: patient.dossierNumber,
        age: patient.age
      },
      requestInfo: AuditService.extractRequestInfo(request),
      success: true
    };
    
    await AuditService.logPatientAction(patientContext);

    return NextResponse.json({
      success: true,
      data: patient,
      message: 'Patient retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching patient:', error);
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

// PUT /api/patients/[id] - Update a specific patient
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
const { id } = await params;
    const body = await request.json();
    const {
      firstName,
      lastName,
      age,
      dossierNumber
    } = body;

    const patient = await DatabaseService.findById(Patient, id);

    if (!patient || !patient.isActive) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Store original values for audit logging
    const originalValues = {
      firstName: patient.firstName,
      lastName: patient.lastName,
      age: patient.age,
      dossierNumber: patient.dossierNumber
    };

    // Check if dossier number is being changed and if it conflicts
    if (dossierNumber && dossierNumber.toUpperCase() !== patient.dossierNumber) {
      const existingPatient = await DatabaseService.findOne(Patient, { 
        dossierNumber: dossierNumber.toUpperCase(),
        isActive: true,
        _id: { $ne: id }
      });

      if (existingPatient) {
        return NextResponse.json({ error: 'Another patient with this dossier number already exists' }, { status: 409 });
      }
    }

    // Update patient fields
    if (firstName !== undefined) patient.firstName = firstName;
    if (lastName !== undefined) patient.lastName = lastName;
    if (age !== undefined) patient.age = age;
    if (dossierNumber !== undefined) patient.dossierNumber = dossierNumber.toUpperCase();

    patient.lastModifiedBy = new mongoose.Types.ObjectId(user._id);

    await patient;

    // Log patient update
    const patientContext: PatientAuditContext = {
      actorId: user._id.toString(),
      actorType: ActorType.USER,
      actorEmail: user.email,
      actorName: `${user.firstName} ${user.lastName}`,
      actorRole: user.userType,
      action: AuditAction.PATIENT_UPDATED,
      description: `Patient updated: ${patient.firstName} ${patient.lastName} (${patient.dossierNumber})`,
      targetResourceType: TargetResourceType.PATIENT,
      targetResourceId: patient._id.toString(),
      targetResourceName: `${patient.firstName} ${patient.lastName}`,
      metadata: {
        dossierNumber: patient.dossierNumber,
        age: patient.age,
        changes: {
          before: originalValues,
          after: {
            firstName: patient.firstName,
            lastName: patient.lastName,
            age: patient.age,
            dossierNumber: patient.dossierNumber
          },
          fields: Object.keys(originalValues).filter(key => originalValues[key as keyof typeof originalValues] !== patient[key as keyof typeof patient])
        }
      },
      requestInfo: AuditService.extractRequestInfo(request),
      success: true
    };
    
    await AuditService.logPatientAction(patientContext);

    // Populate the response
    const populatedPatient = await DatabaseService.findById(Patient, patient._id, {
      populate: [
        { path: 'createdBy', select: 'firstName lastName email' },
        { path: 'lastModifiedBy', select: 'firstName lastName email' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: populatedPatient,
      message: 'Patient updated successfully'
    });

  } catch (error) {
    console.error('Error updating patient:', error);
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

// DELETE /api/patients/[id] - Soft delete a patient
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
const { id } = await params;
    const patient = await DatabaseService.findById(Patient, id);

    if (!patient || !patient.isActive) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Soft delete - set isActive to false
    patient.isActive = false;
    patient.lastModifiedBy = new mongoose.Types.ObjectId(user._id);

    await patient;

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Patient deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting patient:', error);
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
