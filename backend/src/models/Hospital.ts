import mongoose, { Schema, Document, Model } from 'mongoose';

// Define the interface for Hospital document
export interface IHospital extends Document {
  name: string;
  address: string;
  organization: {
    type: 'CIUSSS' | 'CISSS' | 'CUSM';
    name: string;
    region: string;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  specialties?: string[];
  capacity?: {
    totalBeds?: number;
    icuBeds?: number;
    emergencyBeds?: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Hospital schema
const HospitalSchema = new Schema<IHospital>({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  organization: {
    type: {
      type: String,
      required: true,
      enum: ['CIUSSS', 'CISSS', 'CUSM']
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    region: {
      type: String,
      required: true,
      trim: true
    }
  },
  coordinates: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  contact: {
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    website: {
      type: String,
      trim: true
    }
  },
  specialties: [{
    type: String,
    trim: true
  }],
  capacity: {
    totalBeds: {
      type: Number,
      min: 0
    },
    icuBeds: {
      type: Number,
      min: 0
    },
    emergencyBeds: {
      type: Number,
      min: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Create indexes for better performance
// Note: name index is already created by unique: true constraint
HospitalSchema.index({ 'organization.type': 1, 'organization.region': 1 });
HospitalSchema.index({ isActive: 1 });

// Create or get the Hospital model with defensive checks
let Hospital: Model<IHospital>;

try {
  // Check if mongoose.models exists and has Hospital
  if (mongoose.models && mongoose.models['Hospital']) {
    Hospital = mongoose.models['Hospital'] as Model<IHospital>;
    console.log('📋 Models: Using existing Hospital model');
  } else {
    Hospital = mongoose.model<IHospital>('Hospital', HospitalSchema);
    console.log('📋 Models: Hospital model created successfully');
  }
} catch (error) {
  // Fallback: always create new model
  console.log('📋 Models: Fallback - creating new Hospital model');
  Hospital = mongoose.model<IHospital>('Hospital', HospitalSchema);
}

export default Hospital;
