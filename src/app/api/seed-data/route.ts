import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Patient from '@/models/Patient';
import Transfer from '@/models/Transfer';
import User from '@/models/User';

// POST /api/seed-data - Create sample data for testing
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Clear existing data
    await Patient.deleteMany({});
    await Transfer.deleteMany({});
    await User.deleteMany({});

    // Create sample users
    const manager = new User({
      userType: 'manager',
      firstName: 'Dr. Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@hospital.com',
      phone: '(555) 123-4567',
      post: 'Head of Emergency Department',
      class: 'A'
    });
    await manager.save();

    const employee = new User({
      userType: 'employee',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@hospital.com',
      phone: '(555) 987-6543',
      opiqPermit: 'OPIQ-2024-001',
      rcr: 'RCR-2024-001'
    });
    await employee.save();

    // Create sample patients
    const patients = [
      {
        patientId: 'PAT-001',
        firstName: 'Alice',
        lastName: 'Williams',
        dateOfBirth: new Date('1985-03-15'),
        gender: 'female',
        phone: '(555) 111-2222',
        email: 'alice.williams@email.com',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        medicalInfo: {
          bloodType: 'O+',
          allergies: ['Penicillin'],
          medications: ['Metformin'],
          medicalHistory: 'Type 2 Diabetes',
          emergencyContact: {
            name: 'Bob Williams',
            relationship: 'Husband',
            phone: '(555) 111-3333'
          }
        },
        currentHospital: 'City General Hospital',
        currentDepartment: 'Emergency',
        admissionDate: new Date('2024-01-15'),
        status: 'active'
      },
      {
        patientId: 'PAT-002',
        firstName: 'Michael',
        lastName: 'Brown',
        dateOfBirth: new Date('1978-07-22'),
        gender: 'male',
        phone: '(555) 444-5555',
        email: 'michael.brown@email.com',
        address: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          country: 'USA'
        },
        medicalInfo: {
          bloodType: 'A-',
          allergies: ['Shellfish'],
          medications: ['Lisinopril'],
          medicalHistory: 'Hypertension',
          emergencyContact: {
            name: 'Lisa Brown',
            relationship: 'Wife',
            phone: '(555) 444-6666'
          }
        },
        currentHospital: 'Metro Medical Center',
        currentDepartment: 'Cardiology',
        admissionDate: new Date('2024-01-20'),
        status: 'active'
      },
      {
        patientId: 'PAT-003',
        firstName: 'Emily',
        lastName: 'Davis',
        dateOfBirth: new Date('1992-11-08'),
        gender: 'female',
        phone: '(555) 777-8888',
        email: 'emily.davis@email.com',
        address: {
          street: '789 Pine St',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
          country: 'USA'
        },
        medicalInfo: {
          bloodType: 'B+',
          allergies: ['Latex'],
          medications: ['Albuterol'],
          medicalHistory: 'Asthma',
          emergencyContact: {
            name: 'David Davis',
            relationship: 'Father',
            phone: '(555) 777-9999'
          }
        },
        currentHospital: 'Regional Hospital',
        currentDepartment: 'Pulmonology',
        admissionDate: new Date('2024-01-25'),
        status: 'active'
      }
    ];

    const createdPatients = await Patient.insertMany(patients);

    // Create sample transfer requests
    const transfers = [
      {
        transferId: 'TRF-001',
        patientId: 'PAT-001',
        patient: createdPatients[0]._id,
        fromHospital: 'City General Hospital',
        fromDepartment: 'Emergency',
        toHospital: 'Metro Medical Center',
        toDepartment: 'Internal Medicine',
        requestedBy: manager._id,
        reason: 'Patient requires specialized care for diabetes management',
        priority: 'high',
        status: 'pending',
        requestedDate: new Date('2024-01-26'),
        scheduledDate: new Date('2024-01-28'),
        notes: 'Patient has been stable but needs better diabetes management'
      },
      {
        transferId: 'TRF-002',
        patientId: 'PAT-002',
        patient: createdPatients[1]._id,
        fromHospital: 'Metro Medical Center',
        fromDepartment: 'Cardiology',
        toHospital: 'City General Hospital',
        toDepartment: 'Cardiac Surgery',
        requestedBy: manager._id,
        reason: 'Patient requires cardiac surgery consultation',
        priority: 'urgent',
        status: 'pending',
        requestedDate: new Date('2024-01-27'),
        notes: 'Urgent transfer needed for surgical evaluation'
      },
      {
        transferId: 'TRF-003',
        patientId: 'PAT-003',
        patient: createdPatients[2]._id,
        fromHospital: 'Regional Hospital',
        fromDepartment: 'Pulmonology',
        toHospital: 'City General Hospital',
        toDepartment: 'Respiratory Therapy',
        requestedBy: manager._id,
        reason: 'Patient needs advanced respiratory therapy',
        priority: 'medium',
        status: 'accepted',
        requestedDate: new Date('2024-01-25'),
        scheduledDate: new Date('2024-01-29'),
        assignedTo: employee._id,
        notes: 'Transfer accepted and scheduled'
      }
    ];

    const createdTransfers = await Transfer.insertMany(transfers);

    return NextResponse.json({
      success: true,
      message: 'Sample data created successfully',
      data: {
        users: 2,
        patients: createdPatients.length,
        transfers: createdTransfers.length
      }
    });

  } catch (error) {
    console.error('Error seeding data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create sample data' },
      { status: 500 }
    );
  }
}
