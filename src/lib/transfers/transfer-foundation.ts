/**
 * Transfer Foundation Layer
 * 
 * This file exports all the foundational components of the transfer system
 * for easy importing and usage throughout the application.
 */

// Constants and Configuration
export * from '@/constants/transfer-constants';

// Types and Interfaces
export * from '@/types/transfer-types';

// Core Services
// TransferService is exported below in the re-export section

// Utilities and Helpers
export * from './transfer-utils';

// Error Handling
export * from './transfer-errors';

// Event System
export * from './transfer-events';

// Re-export commonly used items for convenience
export {
  TransferStatus,
  TransferPriority,
  TransferType,
  UserRole,
  TRANSFER_CONFIG,
  TRANSFER_ERRORS,
  TRANSFER_SUCCESS
} from '@/constants/transfer-constants';

export {
  DateUtils,
  TransferDisplayUtils,
  TransferCalculationUtils,
  TransferFilterUtils,
  TransferCalendarUtils,
  TransferValidationUtils
} from './transfer-utils';

export {
  TransferService
} from './transfer-service';

export {
  TransferError,
  TransferErrorFactory,
  TransferErrorResponse,
  TransferErrorHandler
} from './transfer-errors';

export {
  TransferEventManager,
  TransferEventFactory,
  initializeTransferEvents
} from './transfer-events';
