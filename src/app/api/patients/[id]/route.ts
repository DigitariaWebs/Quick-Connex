import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import Patient from '@/models/Patient';
import { requireEmployeeOrManagerWithSessionWithSession, createSessionErrorResponse, createSessionSuccessResponse } from '@/lib/auth/session-auth-middleware';

// GET /api/patients/[id] - Get a specific patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManagerWithSession(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    const { id } = await params;
    const patient = await Patient.findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email');

    if (!patient || !patient.isActive) {
      return createSessionErrorResponse('Patient not found', 'NOT_FOUND', 404);
    }

    return createSessionSuccessResponse(patient, 'Patient retrieved successfully');

  } catch (error) {
    console.error('Error fetching patient:', error);
    return createSessionErrorResponse('Failed to fetch patient', 'INTERNAL_ERROR', 500);
  }
}

// PUT /api/patients/[id] - Update a specific patient
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManagerWithSession(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    const { id } = await params;
    const body = await request.json();
    const {
      firstName,
      lastName,
      age,
      dossierNumber,
      dateOfBirth,
      gender,
      phoneNumber,
      email,
      address,
      emergencyContact,
      medicalInfo,
      insuranceInfo
    } = body;

    const patient = await Patient.findById(id);

    if (!patient || !patient.isActive) {
      return createSessionErrorResponse('Patient not found', 'NOT_FOUND', 404);
    }

    // Check if dossier number is being changed and if it conflicts
    if (dossierNumber && dossierNumber.toUpperCase() !== patient.dossierNumber) {
      const existingPatient = await Patient.findOne({ 
        dossierNumber: dossierNumber.toUpperCase(),
        isActive: true,
        _id: { $ne: id }
      });

      if (existingPatient) {
        return createSessionErrorResponse('Another patient with this dossier number already exists', 'DUPLICATE_ERROR', 409);
      }
    }

    // Update patient fields
    if (firstName !== undefined) patient.firstName = firstName;
    if (lastName !== undefined) patient.lastName = lastName;
    if (age !== undefined) patient.age = age;
    if (dossierNumber !== undefined) patient.dossierNumber = dossierNumber.toUpperCase();
    if (dateOfBirth !== undefined) patient.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    if (gender !== undefined) patient.gender = gender;
    if (phoneNumber !== undefined) patient.phoneNumber = phoneNumber;
    if (email !== undefined) patient.email = email;
    if (address !== undefined) patient.address = address;
    if (emergencyContact !== undefined) patient.emergencyContact = emergencyContact;
    if (medicalInfo !== undefined) patient.medicalInfo = medicalInfo;
    if (insuranceInfo !== undefined) patient.insuranceInfo = insuranceInfo;

    patient.lastModifiedBy = authResult.user._id;

    await patient.save();

    // Populate the response
    const populatedPatient = await Patient.findById(patient._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email');

    return createSessionSuccessResponse(populatedPatient, 'Patient updated successfully');

  } catch (error) {
    console.error('Error updating patient:', error);
    return createSessionErrorResponse('Failed to update patient', 'INTERNAL_ERROR', 500);
  }
}

// DELETE /api/patients/[id] - Soft delete a patient
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManagerWithSession(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    const { id } = await params;
    const patient = await Patient.findById(id);

    if (!patient || !patient.isActive) {
      return createSessionErrorResponse('Patient not found', 'NOT_FOUND', 404);
    }

    // Soft delete - set isActive to false
    patient.isActive = false;
    patient.lastModifiedBy = authResult.user._id;

    await patient.save();

    return createSessionSuccessResponse(null, 'Patient deleted successfully');

  } catch (error) {
    console.error('Error deleting patient:', error);
    return createSessionErrorResponse('Failed to delete patient', 'INTERNAL_ERROR', 500);
  }
}
