import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import Patient from '@/models/Patient';
import { requireEmployeeOrManager, handleAuthError, createSuccessResponse } from '@/lib/auth/auth-utils';
import mongoose from 'mongoose';

// GET /api/patients/[id] - Get a specific patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { user } = await requireEmployeeOrManager();

    await dbConnect();

    const { id } = await params;
    const patient = await Patient.findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email');

    if (!patient || !patient.isActive) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    return createSuccessResponse(patient, 'Patient retrieved successfully');

  } catch (error) {
    console.error('Error fetching patient:', error);
    return handleAuthError(error);
  }
}

// PUT /api/patients/[id] - Update a specific patient
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { user } = await requireEmployeeOrManager();

    await dbConnect();

    const { id } = await params;
    const body = await request.json();
    const {
      firstName,
      lastName,
      age,
      dossierNumber
    } = body;

    const patient = await Patient.findById(id);

    if (!patient || !patient.isActive) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Check if dossier number is being changed and if it conflicts
    if (dossierNumber && dossierNumber.toUpperCase() !== patient.dossierNumber) {
      const existingPatient = await Patient.findOne({ 
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

    await patient.save();

    // Populate the response
    const populatedPatient = await Patient.findById(patient._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email');

    return createSuccessResponse(populatedPatient, 'Patient updated successfully');

  } catch (error) {
    console.error('Error updating patient:', error);
    return handleAuthError(error);
  }
}

// DELETE /api/patients/[id] - Soft delete a patient
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { user } = await requireEmployeeOrManager();

    await dbConnect();

    const { id } = await params;
    const patient = await Patient.findById(id);

    if (!patient || !patient.isActive) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Soft delete - set isActive to false
    patient.isActive = false;
    patient.lastModifiedBy = new mongoose.Types.ObjectId(user._id);

    await patient.save();

    return createSuccessResponse(null, 'Patient deleted successfully');

  } catch (error) {
    console.error('Error deleting patient:', error);
    return handleAuthError(error);
  }
}
