/**
 * Main Library Export
 * 
 * This file provides a centralized export point for all library modules,
 * making imports cleaner and more organized throughout the application.
 */

// Authentication & Authorization
export * from './auth';

// Database
export * from './database';

// Communication
export * from './communication';

// Audit
export * from './audit';

// Logging
export * from './logging';

// Transfers - export specific items to avoid naming conflicts
export {
  TransferService,
  TimelineService,
  TransferStatus,
  TransferPriority,
  TransferType,
  TransferCategory,
  // Note: UserRole from transfers conflicts with auth UserRole, so we don't export it here
  // Import directly from @/lib/transfers if you need the transfer UserRole
} from './transfers';

// Services - moved to individual modules

// Utils
export * from './utils';
