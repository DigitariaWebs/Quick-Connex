/**
 * Transfer Types
 * 
 * Core transfer domain types and interfaces.
 */

import { Types } from 'mongoose';
import {
  TransferStatus,
  TransferPriority,
  TransferType,
  TransferCategory,
} from '@/lib/transfers/core/constants';
import type { UserRole } from '@/types/auth/user.types';

// Base Entity Interfaces
export interface BaseEntity {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Patient Information (embedded in transfer)
export interface PatientInfo {
  firstName: string;
  lastName: string;
  age: number;
  dossierNumber: string;
}

// Transfer-specific data interfaces
export interface EnvelopeInfo {
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
  measurementUnit?: 'cm' | 'inch';
  weightUnit?: 'kg' | 'pound';
}

export interface FileInfo {
  patientName: string;
  dossierNumber: string;
  fileType: string;
  fileCount: number;
  urgency: 'low' | 'urgent';
}

export interface EquipmentInfo {
  equipmentName: string;
  serialNumber?: string;
  model: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  maintenanceRequired: boolean;
  specialInstructions?: string;
}

// Polymorphic transfer data
export interface TransferData {
  patientInfo?: PatientInfo;
  envelopeInfo?: EnvelopeInfo;
  fileInfo?: FileInfo;
  equipmentInfo?: EquipmentInfo;
}

// User Information
export interface UserInfo {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  isActive: boolean;
  phone?: string;
}

// Scheduling Configuration
export interface SchedulingConfig {
  transferTime: string; // HH:MM format
}

// Timeline Event Types
export type TimelineEventType = 
  | 'created'           // Transfer was created
  | 'status_changed'    // Status was changed
  | 'assigned'          // Assigned to employee
  | 'unassigned'        // Unassigned from employee
  | 'patient_updated'   // Patient information updated
  | 'hospital_updated'  // Hospital information updated
  | 'scheduled'         // Transfer was scheduled
  | 'rescheduled'       // Transfer was rescheduled
  | 'document_uploaded' // Medical document uploaded
  | 'document_removed'  // Medical document removed
  | 'notes_updated'     // Notes were updated
  | 'priority_changed'  // Priority was changed
  | 'reason_updated'    // Transfer reason updated
  | 'approved'          // Transfer was approved
  | 'rejected'          // Transfer was rejected
  | 'accepted'          // Transfer was accepted by employee
  | 'started'           // Transfer was started
  | 'completed'         // Transfer was completed
  | 'cancelled'         // Transfer was cancelled
  | 'communication'     // Communication event (email, SMS)
  | 'system'            // System-generated event
  | 'admin_action'      // Admin action
  | 'manager_action'    // Manager action
  | 'employee_action';  // Employee action

// Enhanced Timeline Event Entry
export interface TimelineEvent {
  id: string;                    // Unique event ID
  type: TimelineEventType;       // Event type
  title: string;                 // Human-readable title
  description: string;           // Detailed description
  timestamp: Date;               // When the event occurred
  actor: {
    id: Types.ObjectId;          // User who performed the action
    name: string;                // User's display name
    email: string;               // User's email
    userType: 'manager' | 'employee' | 'admin';
  };
  metadata?: {                   // Additional event-specific data
    oldValue?: any;              // Previous value (for updates)
    newValue?: any;              // New value (for updates)
    reason?: string;             // Reason for the change
    details?: string;            // Additional details
    [key: string]: any;          // Flexible metadata
  };
  isSystemEvent?: boolean;       // Whether this is a system-generated event
  isVisible?: boolean;           // Whether to show in timeline (default: true)
}

// Legacy Status History Entry (kept for backward compatibility)
export interface StatusHistoryEntry {
  status: TransferStatus;
  changedBy: Types.ObjectId;
  changedAt: Date;
  reason?: string;
  notes?: string;
}

// Transfer Document Interface (matches MongoDB schema)
export interface ITransfer extends BaseEntity {
  transferId: string;
  transferCategory: TransferCategory;
  
  // Legacy patientInfo for backward compatibility
  patientInfo?: PatientInfo;
  
  // New polymorphic transfer data
  transferData: TransferData;
  
  fromHospital: Types.ObjectId; // Reference to Hospital
  toHospital: Types.ObjectId; // Reference to Hospital
  fromHospitalName: string; // Keep name for backward compatibility and display
  toHospitalName: string; // Keep name for backward compatibility and display
  requestedBy: Types.ObjectId; // Reference to User (manager)
  assignedTo?: Types.ObjectId; // Reference to User (employee)
  reason: string;
  priority: TransferPriority;
  status: TransferStatus;
  requestedDate: Date;
  scheduledDate?: Date;
  completedDate?: Date;
  notes?: string;
  medicalDocuments?: string[]; // Array of file paths
  
  // Advanced scheduling fields
  scheduling: SchedulingConfig;
  
  // Enhanced fields for robustness
  statusHistory: StatusHistoryEntry[];  // Legacy - kept for backward compatibility
  timeline: TimelineEvent[];            // New comprehensive timeline
  
  // Audit fields
  lastModifiedBy: Types.ObjectId;
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // in minutes
}

// Transfer Statistics
export interface TransferStats {
  total: number;
  pending: number;
  accepted: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  urgent: number;
  low: number;
  averageCompletionTime?: number; // in minutes
  completionRate?: number; // percentage
}

// Calendar Event Data
export interface TransferCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  transferId: string;
  patientInfo: {
    name: string;
    age: number;
  };
  fromHospital: string;
  toHospital: string;
  priority: TransferPriority;
  status: TransferStatus;
  assignedTo?: string;
  color: string;
}

// Transfer Analytics Data
export interface TransferAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  stats: TransferStats;
  trends: {
    daily: Array<{
      date: string;
      count: number;
      completed: number;
    }>;
    weekly: Array<{
      week: string;
      count: number;
      completed: number;
    }>;
    monthly: Array<{
      month: string;
      count: number;
      completed: number;
    }>;
  };
  performance: {
    averageAcceptanceTime: number; // in minutes
    averageCompletionTime: number; // in minutes
    onTimeRate: number; // percentage
    cancellationRate: number; // percentage
  };
  topHospitals: Array<{
    hospital: string;
    count: number;
    completionRate: number;
  }>;
  topEmployees: Array<{
    employee: string;
    count: number;
    completionRate: number;
    averageTime: number;
  }>;
}

// Transfer Notification Data (for notifications)
export interface TransferNotificationData {
  id: string;
  type: string;
  priority: 'low' | 'urgent';
  title: string;
  message: string;
  transferId: string;
  transfer: {
    id: string;
    transferId: string;
    patientInfo: PatientInfo;
    fromHospital: string;
    toHospital: string;
    priority: TransferPriority;
    status: TransferStatus;
    scheduledDate?: Date;
  };
  requestedBy: {
    id: string;
    name: string;
    userType: string;
  };
  timestamp: string;
  read: boolean;
  expiresAt?: string;
}

// Transfer Request Data (for creating new transfers)
export interface TransferRequestData {
  transferCategory: TransferCategory;
  
  // Patient transfer fields (legacy)
  patientFirstName?: string;
  patientLastName?: string;
  patientAge?: number;
  patientDossierNumber?: string;
  
  // Envelope transfer fields
  envelopeNumber?: string;
  senderName?: string;
  recipientName?: string;
  contents?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  
  // File transfer fields
  patientName?: string;
  fileType?: string;
  fileCount?: number;
  fileUrgency?: 'low' | 'urgent';
  
  // Medical instruments transfer fields
  equipmentName?: string;
  serialNumber?: string;
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  specialInstructions?: string;
  
  // Common fields
  fromHospital: string; // Hospital name for backward compatibility
  toHospital: string; // Hospital name for backward compatibility
  fromHospitalId?: string; // Hospital ID for new references
  toHospitalId?: string; // Hospital ID for new references
  transferDate: string;
  transferTime: string;
  transferType: TransferType;
  issuer: string;
  priority: TransferPriority;
  reason: string;
  notes?: string;
  medicalDocuments?: string[];
  scheduling?: Partial<SchedulingConfig>;
}

// Export utility types
export type TransferStatusType = keyof typeof TransferStatus;
export type TransferPriorityType = keyof typeof TransferPriority;
export type TransferTypeType = keyof typeof TransferType;
// Note: UserRole is a type alias, not an enum, so UserRoleType is just UserRole
export type { UserRole };
export type UserRoleType = UserRole;

// Re-export enums for convenience
export { TransferStatus, TransferPriority, TransferType, TransferCategory };

