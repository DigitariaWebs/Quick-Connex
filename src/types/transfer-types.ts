/**
 * Transfer System Types and Interfaces
 * 
 * This file contains all TypeScript types and interfaces used throughout
 * the transfer system to ensure type safety and consistency.
 */

import { Types } from 'mongoose';
import {
  TransferStatus,
  TransferPriority,
  TransferType,
  UserRole
} from '@/constants/transfer-constants';

// Note: Conflict types removed as hospitals handle their own logistics

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

// User Information
export interface UserInfo {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  userType: UserRole;
  isActive: boolean;
  phone?: string;
}

// Note: ConflictInfo interface removed as hospitals handle their own logistics

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
  patientInfo: PatientInfo;
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

// Transfer Request Data (for creating new transfers)
export interface TransferRequestData {
  patientFirstName: string;
  patientLastName: string;
  patientAge: number;
  patientDossierNumber: string;
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

// Transfer Response (for API responses)
export interface TransferResponse {
  _id: string;
  transferId: string;
  patientInfo: PatientInfo;
  fromHospital: string;
  toHospital: string;
  requestedBy: UserInfo;
  assignedTo?: UserInfo;
  reason: string;
  priority: TransferPriority;
  status: TransferStatus;
  requestedDate: string;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
  medicalDocuments?: string[];
  scheduling: SchedulingConfig;
  statusHistory: StatusHistoryEntry[];
  lastModifiedBy: UserInfo;
  estimatedDuration?: number;
  actualDuration?: number;
  createdAt: string;
  updatedAt: string;
}

// Transfer List Response
export interface TransferListResponse {
  transfers: TransferResponse[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Transfer Action Request
export interface TransferActionRequest {
  transferId: string;
  action: 'accept' | 'start' | 'complete' | 'cancel';
  assignedTo?: string;
  notes?: string;
  reason?: string;
}

// Transfer Action Response
export interface TransferActionResponse {
  success: boolean;
  message: string;
  transfer?: TransferResponse;
  error?: string;
  errorCode?: string;
}

// Transfer Validation Result
export interface TransferValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

// Transfer Action Permissions
export interface TransferActionPermissions {
  canAccept: boolean;
  canStart: boolean;
  canComplete: boolean;
  canCancel: boolean;
  canEdit: boolean;
  canView: boolean;
  canCreate: boolean;
  reason?: string;
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
  high: number;
  medium: number;
  low: number;
  averageCompletionTime?: number; // in minutes
  completionRate?: number; // percentage
}

// Transfer Filter Options
export interface TransferFilterOptions {
  status?: TransferStatus[];
  priority?: TransferPriority[];
  requestedBy?: string[];
  assignedTo?: string[];
  fromHospital?: string[];
  toHospital?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
  isRecurring?: boolean;
}

// Transfer Sort Options
export interface TransferSortOptions {
  field: 'requestedDate' | 'scheduledDate' | 'priority' | 'status' | 'patientName';
  direction: 'asc' | 'desc';
}

// Transfer Query Options
export interface TransferQueryOptions {
  filter?: TransferFilterOptions;
  sort?: TransferSortOptions;
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
}

// Notification Data
export interface TransferNotificationData {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
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
    userType: UserRole;
  };
  timestamp: string;
  read: boolean;
  expiresAt?: string;
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

// Note: ConflictDetectionResult interface removed as hospitals handle their own logistics

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

// Export utility types
export type TransferStatusType = keyof typeof TransferStatus;
export type TransferPriorityType = keyof typeof TransferPriority;
export type TransferTypeType = keyof typeof TransferType;
export type UserRoleType = keyof typeof UserRole;

// Generic API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errorCode?: string;
  timestamp: string;
}

// Pagination Info
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Generic List Response
export interface ListResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}
