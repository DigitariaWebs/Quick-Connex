/**
 * Transfer System Constants and Configuration
 * 
 * This file contains all the constants, enums, and configuration values
 * used throughout the transfer system to ensure consistency and maintainability.
 */

// Transfer Status Enum
export enum TransferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Transfer Priority Enum
export enum TransferPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Transfer Type Enum
export enum TransferType {
  STAT = 'stat',
  SCHEDULED = 'scheduled'
}

// Note: Transport Type and Recurrence Pattern enums removed as they are not needed

// Note: Conflict types removed as hospitals handle their own logistics

// User Role Enum
export enum UserRole {
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
  ADMIN = 'admin'
}

// Transfer System Configuration
export const TRANSFER_CONFIG = {
  // ID Generation
  ID_PREFIXES: {
    TRANSFER: 'TRF',
    PATIENT: 'PAT',
    NOTIFICATION: 'NOT'
  },
  
  // Validation Rules
  VALIDATION: {
    MIN_REASON_LENGTH: 10,
    MAX_REASON_LENGTH: 1000,
    MIN_AGE: 0,
    MAX_AGE: 120,
    MAX_FUTURE_DAYS: 30,
    MIN_SCHEDULE_ADVANCE_HOURS: 1
  },
  
  // Status Transitions
  STATUS_TRANSITIONS: {
    [TransferStatus.PENDING]: [TransferStatus.ACCEPTED, TransferStatus.CANCELLED],
    [TransferStatus.ACCEPTED]: [TransferStatus.IN_PROGRESS, TransferStatus.CANCELLED],
    [TransferStatus.IN_PROGRESS]: [TransferStatus.COMPLETED, TransferStatus.CANCELLED],
    [TransferStatus.COMPLETED]: [],
    [TransferStatus.CANCELLED]: []
  },
  
  // Priority Weights (for sorting and calculations)
  PRIORITY_WEIGHTS: {
    [TransferPriority.LOW]: 1,
    [TransferPriority.MEDIUM]: 2,
    [TransferPriority.HIGH]: 3,
    [TransferPriority.URGENT]: 4
  },
  
  // Default Values
  DEFAULTS: {
    PRIORITY: TransferPriority.MEDIUM,
    STATUS: TransferStatus.PENDING,
    DURATION_MINUTES: 60
  },
  
  // Timeouts and Limits
  TIMEOUTS: {
    ACCEPT_TIMEOUT_HOURS: 24,
    COMPLETION_TIMEOUT_HOURS: 48,
    NOTIFICATION_EXPIRY_DAYS: 7
  },
  
  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100
  },
  
  // File Upload
  FILE_UPLOAD: {
    MAX_FILE_SIZE_MB: 10,
    ALLOWED_TYPES: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
    MAX_FILES_PER_TRANSFER: 5
  }
} as const;

// Status Display Information
export const STATUS_DISPLAY_INFO = {
  [TransferStatus.PENDING]: {
    label: 'Pending',
    color: 'amber',
    icon: 'clock',
    description: 'Waiting for employee to accept',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200'
  },
  [TransferStatus.ACCEPTED]: {
    label: 'Accepted',
    color: 'green',
    icon: 'check-circle',
    description: 'Accepted by employee, ready to start',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200'
  },
  [TransferStatus.IN_PROGRESS]: {
    label: 'In Progress',
    color: 'blue',
    icon: 'arrow-right',
    description: 'Transfer is currently in progress',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200'
  },
  [TransferStatus.COMPLETED]: {
    label: 'Completed',
    color: 'purple',
    icon: 'check-circle-2',
    description: 'Transfer completed successfully',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-200'
  },
  [TransferStatus.CANCELLED]: {
    label: 'Cancelled',
    color: 'red',
    icon: 'x-circle',
    description: 'Transfer was cancelled',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200'
  }
} as const;

// Priority Display Information
export const PRIORITY_DISPLAY_INFO = {
  [TransferPriority.LOW]: {
    label: 'Low',
    color: 'green',
    icon: 'arrow-down',
    description: 'Non-urgent transfer',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    gradient: 'from-green-500 to-emerald-500'
  },
  [TransferPriority.MEDIUM]: {
    label: 'Medium',
    color: 'yellow',
    icon: 'minus',
    description: 'Standard priority transfer',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200',
    gradient: 'from-amber-500 to-yellow-500'
  },
  [TransferPriority.HIGH]: {
    label: 'High',
    color: 'orange',
    icon: 'arrow-up',
    description: 'High priority transfer',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-200',
    gradient: 'from-orange-500 to-amber-500'
  },
  [TransferPriority.URGENT]: {
    label: 'Urgent',
    color: 'red',
    icon: 'alert-triangle',
    description: 'Urgent transfer - immediate attention required',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    gradient: 'from-red-500 to-pink-500'
  }
} as const;

// Note: Transport Type Display Information removed as transport types are not needed

// Error Messages
export const TRANSFER_ERRORS = {
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_AGE: 'Age must be between 0 and 120',
    INVALID_DATE: 'Date cannot be in the past',
    SAME_HOSPITALS: 'From and to hospitals cannot be the same',
    SHORT_REASON: 'Transfer reason is too short',
    LONG_REASON: 'Transfer reason is too long',
    INVALID_PRIORITY: 'Invalid priority level',
    INVALID_STATUS: 'Invalid status',
    INVALID_TRANSITION: 'Invalid status transition'
  },
  PERMISSIONS: {
    UNAUTHORIZED: 'You are not authorized to perform this action',
    NOT_ASSIGNED: 'You are not assigned to this transfer',
    WRONG_ROLE: 'Your role does not allow this action',
    MANAGER_ONLY_CREATE: 'Only managers can create transfer requests',
    MANAGER_ONLY_EDIT: 'Only managers can edit transfer requests'
  },
  NOT_FOUND: {
    TRANSFER: 'Transfer not found',
    PATIENT: 'Patient not found',
    USER: 'User not found'
  },
  BUSINESS_LOGIC: {
    ALREADY_ACCEPTED: 'Transfer has already been accepted',
    ALREADY_COMPLETED: 'Transfer has already been completed',
    ALREADY_CANCELLED: 'Transfer has already been cancelled',
    CANNOT_CANCEL: 'Transfer cannot be cancelled in current status',
    TIMEOUT_EXCEEDED: 'Transfer acceptance timeout exceeded'
  }
} as const;

// Success Messages
export const TRANSFER_SUCCESS = {
  CREATED: 'Transfer request created successfully',
  ACCEPTED: 'Transfer accepted successfully',
  STARTED: 'Transfer started successfully',
  COMPLETED: 'Transfer completed successfully',
  CANCELLED: 'Transfer cancelled successfully',
  UPDATED: 'Transfer updated successfully'
} as const;

// API Endpoints
export const TRANSFER_ENDPOINTS = {
  BASE: '/api/transfers',
  CREATE: '/api/transfers',
  GET_ALL: '/api/transfers',
  GET_BY_ID: (id: string) => `/api/transfers/${id}`,
  ACCEPT: (id: string) => `/api/transfers/${id}/accept`,
  START: (id: string) => `/api/transfers/${id}/start`,
  COMPLETE: (id: string) => `/api/transfers/${id}/complete`,
  CANCEL: (id: string) => `/api/transfers/${id}/cancel`,
  CONFLICTS: '/api/calendar/conflicts'
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  NEW_TRANSFER: 'new_transfer',
  TRANSFER_ACCEPTED: 'transfer_accepted',
  TRANSFER_STARTED: 'transfer_started',
  TRANSFER_COMPLETED: 'transfer_completed',
  TRANSFER_CANCELLED: 'transfer_cancelled',
  TRANSFER_STATUS_CHANGE: 'transfer_status_change',
  URGENT_TRANSFER: 'urgent_transfer',
  TRANSFER_REMINDER: 'transfer_reminder',
  TRANSFER_TIMEOUT: 'transfer_timeout'
} as const;

// Cache Keys
export const CACHE_KEYS = {
  TRANSFERS: 'transfers',
  PATIENTS: 'patients',
  USERS: 'users',
  NOTIFICATIONS: 'notifications',
  STATS: 'stats'
} as const;

// Database Indexes
export const DB_INDEXES = {
  TRANSFER: [
    { transferId: 1 },
    { patientId: 1 },
    { status: 1 },
    { priority: 1 },
    { requestedBy: 1 },
    { assignedTo: 1 },
    { requestedDate: -1 },
    { scheduledDate: 1 },
    { scheduledEndDate: 1 },
    { lastModifiedBy: 1 },
    { 'statusHistory.changedAt': -1 },
    { 'scheduling.isRecurring': 1 }
  ]
} as const;

// Re-export enums for convenience (already exported above)
// export {
//   TransferStatus,
//   TransferPriority,
//   TransferType,
//   TransportType,
//   RecurrencePattern,
//   ConflictType,
//   ConflictSeverity,
//   UserRole
// };
