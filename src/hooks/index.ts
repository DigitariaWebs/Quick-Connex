/**
 * Hooks Module
 * 
 * Clean exports for all refactored hooks following Clean Architecture principles.
 * All hooks are now thin adapters that delegate business logic to client services.
 * 
 * Architecture:
 * - Hooks: React state + lifecycle management only
 * - Client Services: Business logic + API calls
 * - Clean separation of concerns
 */

// Authentication hooks - Thin adapters for authentication
export * from './auth';

// Dashboard hooks - Thin adapters for dashboard data
export * from './dashboard';

// Notification hooks - Thin adapters for notifications
export * from './notifications';
