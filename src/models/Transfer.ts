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
  scheduledEndDate?: Date; // End time for the transfer
  completedDate?: Date;
  notes?: string;
  medicalDocuments?: string[]; // Array of file paths
  
  // Advanced scheduling fields
  scheduling: {
    isRecurring: boolean;
    recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'custom';
    recurrenceInterval?: number; // Every X days/weeks/months
    recurrenceDays?: number[]; // Days of week (0-6) for weekly recurrence
    recurrenceEndDate?: Date;
    recurrenceExceptions?: Date[]; // Dates to skip
    timeSlot: {
      startTime: string; // HH:MM format
      endTime: string; // HH:MM format
      duration: number; // in minutes
    };
    location: {
      pickupLocation: string;
      dropoffLocation: string;
      transportType: 'ambulance' | 'helicopter' | 'ground_transport' | 'walking';
    };
    resources: {
      assignedDriver?: string;
      assignedVehicle?: string;
      requiredEquipment?: string[];
      specialInstructions?: string;
    };
    conflicts?: Array<{
      transferId: string;
      conflictType: 'time' | 'resource' | 'location';
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
  };
  
  // Enhanced fields for robustness
  statusHistory: Array<{
    status: string;
    changedBy: Types.ObjectId;
    changedAt: Date;
    reason?: string;
  }>;
  
  // Audit fields
  lastModifiedBy: Types.ObjectId;
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // in minutes
  
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
  scheduledEndDate: { 
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
  }],
  
  // Advanced scheduling fields
  scheduling: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurrencePattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom']
    },
    recurrenceInterval: {
      type: Number,
      min: 1
    },
    recurrenceDays: [{
      type: Number,
      min: 0,
      max: 6
    }],
    recurrenceEndDate: {
      type: Date
    },
    recurrenceExceptions: [{
      type: Date
    }],
    timeSlot: {
      startTime: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      endTime: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      duration: {
        type: Number,
        min: 0
      }
    },
    location: {
      pickupLocation: {
        type: String,
        required: true,
        trim: true
      },
      dropoffLocation: {
        type: String,
        required: true,
        trim: true
      },
      transportType: {
        type: String,
        enum: ['ambulance', 'helicopter', 'ground_transport', 'walking'],
        default: 'ambulance'
      }
    },
    resources: {
      assignedDriver: {
        type: String,
        trim: true
      },
      assignedVehicle: {
        type: String,
        trim: true
      },
      requiredEquipment: [{
        type: String,
        trim: true
      }],
      specialInstructions: {
        type: String,
        trim: true
      }
    },
    conflicts: [{
      transferId: {
        type: String,
        required: true
      },
      conflictType: {
        type: String,
        enum: ['time', 'resource', 'location'],
        required: true
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true
      },
      description: {
        type: String,
        required: true,
        trim: true
      }
    }]
  },
  
  // Enhanced fields for robustness
  statusHistory: [{
    status: {
      type: String,
      required: true,
      enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled']
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    reason: {
      type: String,
      trim: true
    }
  }],
  
  // Audit fields
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  estimatedDuration: {
    type: Number,
    min: 0
  },
  actualDuration: {
    type: Number,
    min: 0
  }
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
TransferSchema.index({ scheduledDate: 1 });
TransferSchema.index({ scheduledEndDate: 1 });
TransferSchema.index({ lastModifiedBy: 1 });
TransferSchema.index({ 'statusHistory.changedAt': -1 });
TransferSchema.index({ 'scheduling.isRecurring': 1 });
TransferSchema.index({ 'scheduling.recurrencePattern': 1 });

// Pre-save hook to track status changes
TransferSchema.pre('save', function(next) {
  // If status is being modified, add to status history
  if (this.isModified('status') && !this.isNew) {
    const statusEntry = {
      status: this.status,
      changedBy: this.lastModifiedBy,
      changedAt: new Date(),
      reason: 'Status updated'
    };
    
    if (!this.statusHistory) {
      this.statusHistory = [];
    }
    
    this.statusHistory.push(statusEntry);
  }
  
  next();
});

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
