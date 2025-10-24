/**
 * Services Index
 * 
 * Centralized exports for all services to provide convenient access patterns.
 */

// Core services
export { AuditService } from './audit-service';
export { LogService, logService, log } from './log-service';

// Re-export types for convenience
export type { LogLevel, LogCategory, LogContext, LogEntry, LogConfig } from './log-types';