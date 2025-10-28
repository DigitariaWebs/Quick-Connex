/**
 * Frontend API System Exports
 * 
 * Centralized exports for all frontend API types, core functionality, and utilities.
 * Provides a clean interface for importing API system components.
 */

// Types
export * from './types/response.types';
export * from './types/error.types';

// Core
export * from './core/api-client';
export * from './core/error-handler';

// Default client instance
export { apiClient } from './core/api-client';
