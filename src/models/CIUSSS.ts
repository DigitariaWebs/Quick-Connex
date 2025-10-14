import mongoose, { Document, Schema } from 'mongoose';

export interface ICIUSSS extends Document {
  code: string; // Short code like "05", "06-1"
  name: string; // Full name like "CIUSSS de l'Estrie – Centre hospitalier universitaire de Sherbrooke"
  region?: string; // Optional region information
  isActive: boolean; // For future use if some CIUSSS become inactive
  createdAt: Date;
  updatedAt: Date;
}

const CIUSSSSchema = new Schema<ICIUSSS>({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  region: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'ciusss'
});

// Index for efficient queries
CIUSSSSchema.index({ code: 1 });
CIUSSSSchema.index({ isActive: 1 });

export const CIUSSS = mongoose.models.CIUSSS || mongoose.model<ICIUSSS>('CIUSSS', CIUSSSSchema);
