import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Define the interface for Transfer document
export interface ITransfer extends Document {
  transferId: string;
  patientId: string;
  patient: Types.ObjectId; // Reference to Patient
  fromHospital: string;
  fromDepartment: string;
  toHospital: string;
  toDepartment: string;
  requestedBy: Types.ObjectId; // Reference to User (manager)
  assignedTo?: Types.ObjectId; // Reference to User (employee)
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  requestedDate: Date;
  scheduledDate?: Date;
  completedDate?: Date;
  notes?: string;
  medicalDocuments?: string[]; // Array of file paths
  createdAt: Date;
  updatedAt: Date;
}

// Transfer schema
const TransferSchema = new Schema<ITransfer>({
  transferId: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  patientId: { 
    type: String, 
    required: true,
    trim: true
  },
  patient: { 
    type: Schema.Types.ObjectId, 
    ref: 'Patient', 
    required: true 
  },
  fromHospital: { 
    type: String, 
    required: true,
    trim: true
  },
  fromDepartment: { 
    type: String, 
    required: true,
    trim: true
  },
  toHospital: { 
    type: String, 
    required: true,
    trim: true
  },
  toDepartment: { 
    type: String, 
    required: true,
    trim: true
  },
  requestedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  assignedTo: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  reason: { 
    type: String, 
    required: true,
    trim: true
  },
  priority: { 
    type: String, 
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  requestedDate: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  scheduledDate: { 
    type: Date
  },
  completedDate: { 
    type: Date
  },
  notes: { 
    type: String,
    trim: true
  },
  medicalDocuments: [{ 
    type: String, 
    trim: true 
  }]
}, {
  timestamps: true,
  versionKey: false
});

// Add indexes for faster queries
TransferSchema.index({ transferId: 1 });
TransferSchema.index({ patientId: 1 });
TransferSchema.index({ status: 1 });
TransferSchema.index({ priority: 1 });
TransferSchema.index({ requestedBy: 1 });
TransferSchema.index({ assignedTo: 1 });
TransferSchema.index({ requestedDate: -1 });

// Create or get the Transfer model
const Transfer: Model<ITransfer> = mongoose.models.Transfer as Model<ITransfer> || 
  mongoose.model<ITransfer>('Transfer', TransferSchema);

// Log when Transfer model is created/accessed
if (!mongoose.models.Transfer) {
  console.log('📋 Models: Transfer model created successfully');
} else {
  console.log('📋 Models: Using existing Transfer model');
}

export default Transfer;
