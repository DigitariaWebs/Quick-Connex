/**
 * Services Index
 * 
 * Centralized exports for all services to provide convenient access patterns.
 */

// Core services
export { AuditService } from './audit';
export { LogService, logService, log } from './log-service';
export { SessionService } from './session';
export { TimelineService } from './timeline-service';

// Re-export types for convenience
export type { LogLevel, LogCategory, LogContext, LogEntry, LogConfig } from './log-types';