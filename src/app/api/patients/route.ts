import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import Patient from '@/models/Patient';
import { requireEmployeeOrManager, handleAuthError, createSuccessResponse } from '@/lib/auth/auth-utils';
import mongoose from 'mongoose';

// GET /api/patients - Get patients (search and list)
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await requireEmployeeOrManager();

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

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

    // Get patients with pagination
    const patients = await Patient.find(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await Patient.countDocuments(query);

    return createSuccessResponse({
      patients,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    }, 'Patients retrieved successfully');

  } catch (error) {
    console.error('Error fetching patients:', error);
    return handleAuthError(error);
  }
}

// POST /api/patients - Create a new patient
export async function POST(request: NextRequest) {
  try {
    // Authenticate user - only managers can create patients
    const { user } = await requireEmployeeOrManager();

    await dbConnect();

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
    const existingPatient = await Patient.findOne({ 
      dossierNumber: dossierNumber.toUpperCase(),
      isActive: true 
    });

    if (existingPatient) {
      return NextResponse.json({ error: 'Patient with this dossier number already exists' }, { status: 409 });
    }

    // Create new patient
    const patient = new Patient({
      firstName,
      lastName,
      age,
      dossierNumber: dossierNumber.toUpperCase(),
      createdBy: new mongoose.Types.ObjectId(user._id),
      lastModifiedBy: new mongoose.Types.ObjectId(user._id),
      isActive: true
    });

    await patient.save();

    // Populate the response
    const populatedPatient = await Patient.findById(patient._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email');

    return createSuccessResponse(populatedPatient, 'Patient created successfully', 201);

  } catch (error) {
    console.error('Error creating patient:', error);
    return handleAuthError(error);
  }
}
