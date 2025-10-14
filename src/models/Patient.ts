import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  _id: string;
  firstName: string;
  lastName: string;
  age: number;
  dossierNumber: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy: mongoose.Types.ObjectId;
  isActive: boolean;
}

const PatientSchema = new Schema<IPatient>({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [0, 'Age cannot be negative'],
    max: [120, 'Age cannot exceed 120']
  },
  dossierNumber: {
    type: String,
    required: [true, 'Dossier number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9\-_\/]+$/, 'Dossier number can only contain letters, numbers, hyphens, underscores, and forward slashes']
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required']
  },
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Last modified by user is required']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
// Note: unique:true on dossierNumber already creates a unique index
PatientSchema.index({ firstName: 1, lastName: 1 });
PatientSchema.index({ createdBy: 1 });
PatientSchema.index({ isActive: 1 });

// Virtual for full name
PatientSchema.virtual('fullName').get(function(this: IPatient) {
  return `${this.firstName} ${this.lastName}`;
});

// Static method to find patient by dossier number
PatientSchema.statics.findByDossierNumber = function(dossierNumber: string) {
  return this.findOne({ dossierNumber: dossierNumber.toUpperCase(), isActive: true });
};

// Static method to search patients
PatientSchema.statics.searchPatients = function(query: string, limit: number = 10) {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    isActive: true,
    $or: [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { dossierNumber: searchRegex }
    ]
  }).limit(limit);
};

export default mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema);
