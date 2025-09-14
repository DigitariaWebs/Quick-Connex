import mongoose, { Schema, Document, Model } from 'mongoose';

// Define the interface for Patient document
export interface IPatient extends Document {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  phone: string;
  email?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  medicalInfo: {
    bloodType?: string;
    allergies?: string[];
    medications?: string[];
    medicalHistory?: string;
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  currentHospital?: string;
  currentDepartment?: string;
  admissionDate?: Date;
  status: 'active' | 'discharged' | 'transferred';
  createdAt: Date;
  updatedAt: Date;
}

// Patient schema
const PatientSchema = new Schema<IPatient>({
  patientId: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  firstName: { 
    type: String, 
    required: true,
    trim: true
  },
  lastName: { 
    type: String, 
    required: true,
    trim: true
  },
  dateOfBirth: { 
    type: Date, 
    required: true
  },
  gender: { 
    type: String, 
    required: true,
    enum: ['male', 'female', 'other']
  },
  phone: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  address: {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zipCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true }
  },
  medicalInfo: {
    bloodType: { type: String, trim: true },
    allergies: [{ type: String, trim: true }],
    medications: [{ type: String, trim: true }],
    medicalHistory: { type: String, trim: true },
    emergencyContact: {
      name: { type: String, required: true, trim: true },
      relationship: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true }
    }
  },
  currentHospital: { 
    type: String,
    trim: true
  },
  currentDepartment: { 
    type: String,
    trim: true
  },
  admissionDate: { 
    type: Date
  },
  status: { 
    type: String, 
    required: true,
    enum: ['active', 'discharged', 'transferred'],
    default: 'active'
  }
}, {
  timestamps: true,
  versionKey: false
});

// Add indexes for faster queries
PatientSchema.index({ patientId: 1 });
PatientSchema.index({ firstName: 1, lastName: 1 });
PatientSchema.index({ status: 1 });
PatientSchema.index({ currentHospital: 1 });

// Create or get the Patient model
const Patient: Model<IPatient> = mongoose.models.Patient as Model<IPatient> || 
  mongoose.model<IPatient>('Patient', PatientSchema);

// Log when Patient model is created/accessed
if (!mongoose.models.Patient) {
  console.log('📋 Models: Patient model created successfully');
} else {
  console.log('📋 Models: Using existing Patient model');
}

export default Patient;
