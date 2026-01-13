import mongoose, { Document, Schema, Model } from "mongoose";

export interface ICIUSSS extends Document {
  code: string; // Short code like "05", "06-1"
  name: string; // Full name like "CIUSSS de l'Estrie – Centre hospitalier universitaire de Sherbrooke"
  region?: string; // Optional region information
  isActive: boolean; // For future use if some CIUSSS become inactive
  createdAt: Date;
  updatedAt: Date;
}

const CIUSSSSchema = new Schema<ICIUSSS>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    region: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "ciusss",
  },
);

// Index for efficient queries
// Note: code index is already created by unique: true constraint
CIUSSSSchema.index({ isActive: 1 });

// Export the model using standard Mongoose pattern
// This prevents the "Schema hasn't been registered" error
const CIUSSS =
  mongoose.models.CIUSSS || mongoose.model<ICIUSSS>("CIUSSS", CIUSSSSchema);

export { CIUSSS };
