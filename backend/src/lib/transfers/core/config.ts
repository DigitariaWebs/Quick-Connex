/**
 * Transfer Configuration
 * 
 * Configuration settings for transfer operations.
 * Merged from /src/constants/transfer.ts for better organization.
 */

import { TransferStatus, TransferPriority } from './constants';

export const TRANSFER_CONFIG = {
  // ID Generation
  ID_PREFIXES: {
    TRANSFER: 'TRF',
    PATIENT: 'PAT',
    NOTIFICATION: 'NOT',
    ENVELOPE: 'ENV'
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
    [TransferPriority.URGENT]: 2
  },
  
  // Default Values
  DEFAULTS: {
    PRIORITY: TransferPriority.LOW,
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

export type TransferConfig = typeof TRANSFER_CONFIG;

