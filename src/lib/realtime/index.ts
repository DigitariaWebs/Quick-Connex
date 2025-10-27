/**
 * Real-time Notifications System
 * 
 * Main entry point for the real-time notification system.
 * Exports all components for easy importing.
 */

// Core components
export * from './core';

// Server components
export * from './server';

// Providers
export * from './providers';

// Utils
export * from './utils';

// Integrations
export * from './integrations';

// Export both flexible and strict types
export type { 
  RealtimeNotification,     // Flexible (internal use)
  NotificationAPIResponse   // Strict (API boundaries)
} from './core/types';

// Export helper utilities
export { 
  toStringId, 
  toStringIds, 
  toObjectId, 
  toObjectIds,
  getIdString,
  toStringIdRequired
} from '@/lib/utils/object-id';

// Export FlexibleId type
export type { FlexibleId } from '@/lib/utils/object-id';
