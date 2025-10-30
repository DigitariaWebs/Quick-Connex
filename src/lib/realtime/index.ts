/**
 * Real-time Notifications System
 * 
 * Main entry point for the real-time notification system.
 * Exports all components for easy importing.
 */

// Public API surface

// Core
export { APP_EVENTS_CHANNEL, MESSAGE_TYPES } from './core/constants';
export * from './events';

// Server: keep low-level providers internal; expose high-level service and token factory
export { RealtimeService } from './server/RealtimeService';
export { createRestrictedTokenRequest } from './server/TokenService';

// Client entry points
export { EventBus } from './client/EventBus';