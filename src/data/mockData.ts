import { IUser, IPatient, ITransfer } from '@/models';

// Mock Users
export const mockUsers: IUser[] = [
  {
    _id: 'user1',
    userType: 'manager',
    firstName: 'Dr. Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@hospital.com',
    phone: '(555) 123-4567',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', // password123
    post: 'Head of Emergency Department',
    class: 'A',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    _id: 'user2',
    userType: 'manager',
    firstName: 'Dr. Michael',
    lastName: 'Chen',
    email: 'michael.chen@hospital.com',
    phone: '(555) 234-5678',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', // password123
    post: 'Chief of Cardiology',
    class: 'A',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    _id: 'user3',
    userType: 'employee',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@hospital.com',
    phone: '(555) 987-6543',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', // password123
    opiqPermit: 'OPIQ-2024-001',
    rcr: 'RCR-2024-001',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    _id: 'user4',
    userType: 'employee',
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@hospital.com',
    phone: '(555) 876-5432',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', // password123
    opiqPermit: 'OPIQ-2024-002',
    rcr: 'RCR-2024-002',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

// Mock Patients - DEPRECATED: No longer needed with embedded patient info
// export const mockPatients: IPatient[] = [
  {
    _id: 'patient1',
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
      allergies: ['Penicillin', 'Shellfish'],
      medications: ['Metformin', 'Lisinopril'],
      medicalHistory: 'Type 2 Diabetes, Hypertension',
      emergencyContact: {
        name: 'Bob Williams',
        relationship: 'Husband',
        phone: '(555) 111-3333'
      }
    },
    currentHospital: 'City General Hospital',
    currentDepartment: 'Emergency',
    admissionDate: new Date('2024-01-15'),
    status: 'active',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    _id: 'patient2',
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
      allergies: ['Latex'],
      medications: ['Warfarin'],
      medicalHistory: 'Atrial Fibrillation, Previous MI',
      emergencyContact: {
        name: 'Lisa Brown',
        relationship: 'Wife',
        phone: '(555) 444-6666'
      }
    },
    currentHospital: 'Metro Medical Center',
    currentDepartment: 'Cardiology',
    admissionDate: new Date('2024-01-20'),
    status: 'active',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  },
  {
    _id: 'patient3',
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
      allergies: ['Pollen', 'Dust'],
      medications: ['Albuterol', 'Fluticasone'],
      medicalHistory: 'Asthma, Seasonal Allergies',
      emergencyContact: {
        name: 'David Davis',
        relationship: 'Father',
        phone: '(555) 777-9999'
      }
    },
    currentHospital: 'Regional Hospital',
    currentDepartment: 'Pulmonology',
    admissionDate: new Date('2024-01-25'),
    status: 'active',
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25')
  },
  {
    _id: 'patient4',
    patientId: 'PAT-004',
    firstName: 'Robert',
    lastName: 'Garcia',
    dateOfBirth: new Date('1965-12-03'),
    gender: 'male',
    phone: '(555) 333-4444',
    email: 'robert.garcia@email.com',
    address: {
      street: '321 Elm St',
      city: 'Houston',
      state: 'TX',
      zipCode: '77001',
      country: 'USA'
    },
    medicalInfo: {
      bloodType: 'AB+',
      allergies: ['Contrast Dye'],
      medications: ['Insulin', 'Metformin'],
      medicalHistory: 'Type 1 Diabetes, Diabetic Nephropathy',
      emergencyContact: {
        name: 'Maria Garcia',
        relationship: 'Wife',
        phone: '(555) 333-5555'
      }
    },
    currentHospital: 'Memorial Hospital',
    currentDepartment: 'Endocrinology',
    admissionDate: new Date('2024-01-28'),
    status: 'active',
    createdAt: new Date('2024-01-28'),
    updatedAt: new Date('2024-01-28')
  },
  {
    _id: 'patient5',
    patientId: 'PAT-005',
    firstName: 'Jennifer',
    lastName: 'Wilson',
    dateOfBirth: new Date('1988-05-17'),
    gender: 'female',
    phone: '(555) 666-7777',
    email: 'jennifer.wilson@email.com',
    address: {
      street: '654 Maple Dr',
      city: 'Phoenix',
      state: 'AZ',
      zipCode: '85001',
      country: 'USA'
    },
    medicalInfo: {
      bloodType: 'O-',
      allergies: ['Aspirin'],
      medications: ['Levothyroxine'],
      medicalHistory: 'Hypothyroidism, Depression',
      emergencyContact: {
        name: 'James Wilson',
        relationship: 'Husband',
        phone: '(555) 666-8888'
      }
    },
    currentHospital: 'Desert Medical Center',
    currentDepartment: 'Internal Medicine',
    admissionDate: new Date('2024-02-01'),
    status: 'active',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  },
  {
    _id: 'patient6',
    patientId: 'PAT-006',
    firstName: 'David',
    lastName: 'Martinez',
    dateOfBirth: new Date('1972-09-25'),
    gender: 'male',
    phone: '(555) 999-0000',
    email: 'david.martinez@email.com',
    address: {
      street: '987 Cedar Ln',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      country: 'USA'
    },
    medicalInfo: {
      bloodType: 'A+',
      allergies: ['Peanuts', 'Tree Nuts'],
      medications: ['Prednisone', 'Methotrexate'],
      medicalHistory: 'Rheumatoid Arthritis, Osteoporosis',
      emergencyContact: {
        name: 'Carmen Martinez',
        relationship: 'Sister',
        phone: '(555) 999-1111'
      }
    },
    currentHospital: 'Sunshine Hospital',
    currentDepartment: 'Rheumatology',
    admissionDate: new Date('2024-02-05'),
    status: 'active',
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-05')
  }
// ];

// Mock Transfer Requests
export const mockTransfers: ITransfer[] = [
  {
    _id: 'transfer1',
    transferId: 'TRF-001',
    patientInfo: {
      firstName: 'Alice',
      lastName: 'Williams',
      age: 39
    },
    fromHospital: 'City General Hospital',
    fromDepartment: 'Emergency',
    toHospital: 'Metro Medical Center',
    toDepartment: 'Internal Medicine',
    requestedBy: 'user1' as any,
    assignedTo: undefined,
    reason: 'Patient requires specialized care for diabetes management and blood sugar stabilization',
    priority: 'high',
    status: 'pending',
    requestedDate: new Date('2024-02-10T08:30:00Z'),
    scheduledDate: new Date('2024-02-12T10:00:00Z'),
    notes: 'Patient has been stable but needs better diabetes management. Blood sugar levels have been fluctuating.',
    medicalDocuments: ['diabetes_report.pdf', 'blood_work.pdf'],
    createdAt: new Date('2024-02-10T08:30:00Z'),
    updatedAt: new Date('2024-02-10T08:30:00Z')
  },
  {
    _id: 'transfer2',
    transferId: 'TRF-002',
    patientInfo: {
      firstName: 'Michael',
      lastName: 'Brown',
      age: 46
    },
    fromHospital: 'Metro Medical Center',
    fromDepartment: 'Cardiology',
    toHospital: 'City General Hospital',
    toDepartment: 'Cardiac Surgery',
    requestedBy: 'user2' as any,
    assignedTo: undefined,
    reason: 'Patient requires urgent cardiac surgery consultation for valve replacement',
    priority: 'urgent',
    status: 'pending',
    requestedDate: new Date('2024-02-11T14:15:00Z'),
    notes: 'Urgent transfer needed for surgical evaluation. Patient condition is deteriorating.',
    medicalDocuments: ['echo_report.pdf', 'cardiac_catheterization.pdf'],
    createdAt: new Date('2024-02-11T14:15:00Z'),
    updatedAt: new Date('2024-02-11T14:15:00Z')
  },
  {
    _id: 'transfer3',
    transferId: 'TRF-003',
    patientInfo: {
      firstName: 'Emily',
      lastName: 'Davis',
      age: 28
    },
    fromHospital: 'Regional Hospital',
    fromDepartment: 'Pulmonology',
    toHospital: 'City General Hospital',
    toDepartment: 'Respiratory Therapy',
    requestedBy: 'user1' as any,
    assignedTo: 'user3' as any,
    reason: 'Patient needs advanced respiratory therapy and pulmonary rehabilitation',
    priority: 'medium',
    status: 'accepted',
    requestedDate: new Date('2024-02-09T11:20:00Z'),
    scheduledDate: new Date('2024-02-13T09:00:00Z'),
    assignedTo: 'user3' as any,
    notes: 'Transfer accepted and scheduled. Patient will benefit from specialized respiratory care.',
    medicalDocuments: ['pulmonary_function_test.pdf', 'chest_xray.pdf'],
    createdAt: new Date('2024-02-09T11:20:00Z'),
    updatedAt: new Date('2024-02-09T11:20:00Z')
  },
  {
    _id: 'transfer4',
    transferId: 'TRF-004',
    patientInfo: {
      firstName: 'Robert',
      lastName: 'Johnson',
      age: 55
    },
    fromHospital: 'Memorial Hospital',
    fromDepartment: 'Endocrinology',
    toHospital: 'Metro Medical Center',
    toDepartment: 'Nephrology',
    requestedBy: 'user2' as any,
    assignedTo: 'user4' as any,
    reason: 'Patient requires specialized nephrology care for diabetic kidney complications',
    priority: 'high',
    status: 'in_progress',
    requestedDate: new Date('2024-02-08T16:45:00Z'),
    scheduledDate: new Date('2024-02-11T14:00:00Z'),
    notes: 'Transfer in progress. Patient being prepared for transport.',
    medicalDocuments: ['kidney_function_test.pdf', 'diabetes_management.pdf'],
    createdAt: new Date('2024-02-08T16:45:00Z'),
    updatedAt: new Date('2024-02-08T16:45:00Z')
  },
  {
    _id: 'transfer5',
    transferId: 'TRF-005',
    patientInfo: {
      firstName: 'Jennifer',
      lastName: 'Wilson',
      age: 36
    },
    fromHospital: 'Desert Medical Center',
    fromDepartment: 'Internal Medicine',
    toHospital: 'Regional Hospital',
    toDepartment: 'Psychiatry',
    requestedBy: 'user1' as any,
    assignedTo: 'user3' as any,
    reason: 'Patient requires psychiatric evaluation and mental health support',
    priority: 'medium',
    status: 'completed',
    requestedDate: new Date('2024-02-05T10:30:00Z'),
    scheduledDate: new Date('2024-02-07T13:00:00Z'),
    completedDate: new Date('2024-02-07T15:30:00Z'),
    notes: 'Transfer completed successfully. Patient is now receiving appropriate psychiatric care.',
    medicalDocuments: ['psychiatric_evaluation.pdf', 'medication_history.pdf'],
    createdAt: new Date('2024-02-05T10:30:00Z'),
    updatedAt: new Date('2024-02-07T15:30:00Z')
  },
  {
    _id: 'transfer6',
    transferId: 'TRF-006',
    patientInfo: {
      firstName: 'David',
      lastName: 'Martinez',
      age: 52
    },
    fromHospital: 'Sunshine Hospital',
    fromDepartment: 'Rheumatology',
    toHospital: 'Memorial Hospital',
    toDepartment: 'Orthopedics',
    requestedBy: 'user2' as any,
    assignedTo: undefined,
    reason: 'Patient needs orthopedic consultation for joint replacement surgery',
    priority: 'low',
    status: 'pending',
    requestedDate: new Date('2024-02-12T09:15:00Z'),
    scheduledDate: new Date('2024-02-15T11:00:00Z'),
    notes: 'Non-urgent transfer for elective surgery consultation.',
    medicalDocuments: ['joint_xray.pdf', 'rheumatology_notes.pdf'],
    createdAt: new Date('2024-02-12T09:15:00Z'),
    updatedAt: new Date('2024-02-12T09:15:00Z')
  },
  {
    _id: 'transfer7',
    transferId: 'TRF-007',
    patientId: 'PAT-001',
    patient: 'patient1' as any,
    fromHospital: 'Metro Medical Center',
    fromDepartment: 'Internal Medicine',
    toHospital: 'City General Hospital',
    toDepartment: 'Endocrinology',
    requestedBy: 'user1' as any,
    assignedTo: 'user4' as any,
    reason: 'Patient requires specialized endocrinology care for diabetes management',
    priority: 'high',
    status: 'in_progress',
    requestedDate: new Date('2024-02-13T07:00:00Z'),
    scheduledDate: new Date('2024-02-14T08:00:00Z'),
    notes: 'Transfer in progress. Patient being transported to endocrinology department.',
    medicalDocuments: ['diabetes_management.pdf', 'blood_glucose_log.pdf'],
    createdAt: new Date('2024-02-13T07:00:00Z'),
    updatedAt: new Date('2024-02-13T07:00:00Z')
  },
  {
    _id: 'transfer8',
    transferId: 'TRF-008',
    patientId: 'PAT-002',
    patient: 'patient2' as any,
    fromHospital: 'City General Hospital',
    fromDepartment: 'Cardiac Surgery',
    toHospital: 'Metro Medical Center',
    toDepartment: 'Cardiology',
    requestedBy: 'user2' as any,
    assignedTo: 'user3' as any,
    reason: 'Patient requires post-surgical cardiac monitoring and rehabilitation',
    priority: 'urgent',
    status: 'completed',
    requestedDate: new Date('2024-02-06T12:00:00Z'),
    scheduledDate: new Date('2024-02-08T10:00:00Z'),
    completedDate: new Date('2024-02-08T12:30:00Z'),
    notes: 'Transfer completed successfully. Patient is now receiving post-surgical care.',
    medicalDocuments: ['surgery_report.pdf', 'post_op_notes.pdf'],
    createdAt: new Date('2024-02-06T12:00:00Z'),
    updatedAt: new Date('2024-02-08T12:30:00Z')
  }
];

// Helper function to get populated transfer data
export const getPopulatedTransfers = () => {
  return mockTransfers.map(transfer => ({
    ...transfer,
    patient: mockPatients.find(p => p._id === transfer.patient),
    requestedBy: mockUsers.find(u => u._id === transfer.requestedBy),
    assignedTo: transfer.assignedTo ? mockUsers.find(u => u._id === transfer.assignedTo) : undefined
  }));
};

// Helper function to get statistics
export const getMockStats = () => {
  const transfers = getPopulatedTransfers();
  return {
    totalPending: transfers.filter(t => t.status === 'pending').length,
    totalAccepted: transfers.filter(t => t.status === 'accepted').length,
    totalInProgress: transfers.filter(t => t.status === 'in_progress').length,
    totalCompleted: transfers.filter(t => t.status === 'completed').length
  };
};

// Helper function to get login credentials for mock users
export const getMockLoginCredentials = () => {
  return {
    manager1: {
      email: 'sarah.johnson@hospital.com',
      password: 'password123',
      userType: 'manager'
    },
    manager2: {
      email: 'michael.chen@hospital.com',
      password: 'password123',
      userType: 'manager'
    },
    employee1: {
      email: 'john.smith@hospital.com',
      password: 'password123',
      userType: 'employee'
    },
    employee2: {
      email: 'emily.davis@hospital.com',
      password: 'password123',
      userType: 'employee'
    }
  };
};
