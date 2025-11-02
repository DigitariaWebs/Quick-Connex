/**
 * Transfer Configuration
 * 
 * Configuration settings for transfer operations.
 * Merged from TRANSFER_CONSTANTS for better organization.
 * Status transitions are defined in core/constants.ts and referenced here.
 */

import { TransferStatus, TransferPriority, TRANSFER_CONSTANTS } from './constants';

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
    MIN_SCHEDULE_ADVANCE_HOURS: 1,
    MIN_DOSSIER_LENGTH: 3,
    MAX_DOSSIER_LENGTH: 50
  },
  
  // Status Transitions - Imported from TRANSFER_CONSTANTS (single source of truth)
  STATUS_TRANSITIONS: TRANSFER_CONSTANTS.STATUS_TRANSITIONS,
  
  // Priority Weights (for sorting and calculations)
  PRIORITY_WEIGHTS: TRANSFER_CONSTANTS.PRIORITY_WEIGHTS,
  
  // Default Values
  DEFAULTS: TRANSFER_CONSTANTS.DEFAULTS,
  
  // Timeouts and Limits
  TIMEOUTS: TRANSFER_CONSTANTS.TIMEOUTS,
  
  // Pagination
  PAGINATION: TRANSFER_CONSTANTS.PAGINATION,
  
  // File Upload
  FILE_UPLOAD: TRANSFER_CONSTANTS.FILE_UPLOAD
} as const;

export type TransferConfig = typeof TRANSFER_CONFIG;

