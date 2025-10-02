import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Define the interface for Transfer document
export interface ITransfer extends Document {
  transferId: string;
  transferCategory: 'patient' | 'envelope' | 'patient_file' | 'medical_equipment';
  
  // Patient-specific data (for backward compatibility and patient transfers)
  patientInfo?: {
    firstName: string;
    lastName: string;
    age: number;
    dossierNumber?: string;
  };
  
  // Generic transfer data (for all transfer types)
  transferData: {
    // For patient transfers
    patientInfo?: {
      firstName: string;
      lastName: string;
      age: number;
      dossierNumber?: string;
    };
    
    // For envelope/box transfers
    envelopeInfo?: {
      envelopeNumber?: string;
      senderName: string;
      recipientName: string;
      contents: string;
      weight?: number;
      dimensions?: {
        length: number;
        width: number;
        height: number;
      };
    };
    
    // For patient file transfers
    fileInfo?: {
      patientName: string;
      dossierNumber: string;
      fileType: string;
      fileCount: number;
      urgency: 'low' | 'medium' | 'high' | 'urgent';
    };
    
    // For medical equipment transfers
    equipmentInfo?: {
      equipmentName: string;
      serialNumber?: string;
      model: string;
      condition: 'excellent' | 'good' | 'fair' | 'poor';
      maintenanceRequired: boolean;
      specialInstructions?: string;
    };
  };
  fromHospital: Types.ObjectId; // Reference to Hospital
  toHospital: Types.ObjectId; // Reference to Hospital
  fromHospitalName: string; // Keep name for backward compatibility and display
  toHospitalName: string; // Keep name for backward compatibility and display
  requestedBy: Types.ObjectId; // Reference to User (manager)
  assignedTo?: Types.ObjectId; // Reference to User (employee)
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  requestedDate: Date;
  scheduledDate?: Date;
  acceptedAt?: Date; // Track when transfer was accepted by employee
  completedDate?: Date;
  notes?: string;
  medicalDocuments?: string[]; // Array of file paths
  
  // Simplified scheduling fields
  scheduling: {
    transferTime: string; // HH:MM format
  };
  
  // Status tracking (legacy)
  statusHistory: Array<{
    status: string;
    changedBy: Types.ObjectId;
    changedAt: Date;
    reason?: string;
  }>;
  
  // Enhanced timeline tracking
  timeline: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: Date;
    actor: {
      id: Types.ObjectId;
      name: string;
      email: string;
      userType: string;
    };
    metadata?: {
      oldValue?: any;
      newValue?: any;
      reason?: string;
      details?: string;
      [key: string]: any;
    };
    isSystemEvent?: boolean;
    isVisible?: boolean;
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
  transferCategory: {
    type: String,
    required: true,
    enum: ['patient', 'envelope', 'patient_file', 'medical_equipment'],
    default: 'patient'
  },
  
  // Legacy patientInfo for backward compatibility
  patientInfo: {
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    age: {
      type: Number,
      min: 0,
      max: 120
    },
    dossierNumber: {
      type: String,
      trim: true
    }
  },
  
  // New polymorphic transfer data
  transferData: {
    // Patient transfer data
    patientInfo: {
      firstName: {
        type: String,
        trim: true
      },
      lastName: {
        type: String,
        trim: true
      },
      age: {
        type: Number,
        min: 0,
        max: 120
      },
      dossierNumber: {
        type: String,
        trim: true
      }
    },
    
    // Envelope/box transfer data
    envelopeInfo: {
      envelopeNumber: {
        type: String,
        trim: true
      },
      senderName: {
        type: String,
        trim: true
      },
      recipientName: {
        type: String,
        trim: true
      },
      contents: {
        type: String,
        trim: true
      },
      weight: {
        type: Number,
        min: 0
      },
      dimensions: {
        length: {
          type: Number,
          min: 0
        },
        width: {
          type: Number,
          min: 0
        },
        height: {
          type: Number,
          min: 0
        }
      }
    },
    
    // Patient file transfer data
    fileInfo: {
      patientName: {
        type: String,
        trim: true
      },
      dossierNumber: {
        type: String,
        trim: true
      },
      fileType: {
        type: String,
        trim: true
      },
      fileCount: {
        type: Number,
        min: 1
      },
      urgency: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
      }
    },
    
    // Medical equipment transfer data
    equipmentInfo: {
      equipmentName: {
        type: String,
        trim: true
      },
      serialNumber: {
        type: String,
        trim: true
      },
      model: {
        type: String,
        trim: true
      },
      condition: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
        default: 'good'
      },
      maintenanceRequired: {
        type: Boolean,
        default: false
      },
      specialInstructions: {
        type: String,
        trim: true
      }
    }
  },
  fromHospital: { 
    type: Schema.Types.ObjectId, 
    ref: 'Hospital', 
    required: true 
  },
  toHospital: { 
    type: Schema.Types.ObjectId, 
    ref: 'Hospital', 
    required: true 
  },
  fromHospitalName: { 
    type: String, 
    required: true,
    trim: true
  },
  toHospitalName: { 
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
    ref: 'User',
    required: false
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
  acceptedAt: { 
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
  
  // Simplified scheduling fields
  scheduling: {
    transferTime: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    }
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
  
  // Enhanced timeline tracking
  timeline: [{
    id: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: [
        'created', 'status_changed', 'assigned', 'unassigned', 'patient_updated',
        'hospital_updated', 'scheduled', 'rescheduled', 'document_uploaded',
        'document_removed', 'notes_updated', 'priority_changed', 'reason_updated',
        'approved', 'rejected', 'accepted', 'started', 'completed', 'cancelled',
        'communication', 'system', 'admin_action', 'manager_action', 'employee_action'
      ]
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    actor: {
      id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      name: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      },
      userType: {
        type: String,
        required: true,
        enum: ['manager', 'employee', 'admin']
      }
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    isSystemEvent: {
      type: Boolean,
      default: false
    },
    isVisible: {
      type: Boolean,
      default: true
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
// Note: transferId index is already created by unique: true constraint
TransferSchema.index({ 'patientInfo.firstName': 1, 'patientInfo.lastName': 1 });
TransferSchema.index({ 'patientInfo.dossierNumber': 1 });
TransferSchema.index({ status: 1 });
TransferSchema.index({ priority: 1 });
TransferSchema.index({ requestedBy: 1 });
TransferSchema.index({ requestedDate: -1 });
TransferSchema.index({ scheduledDate: 1 });
TransferSchema.index({ lastModifiedBy: 1 });
TransferSchema.index({ 'statusHistory.changedAt': -1 });
TransferSchema.index({ 'timeline.timestamp': -1 });
TransferSchema.index({ 'timeline.type': 1 });

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
