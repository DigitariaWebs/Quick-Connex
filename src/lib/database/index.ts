/**
 * Centralized Database Module
 * 
 * Single source of truth for all database operations.
 * Provides clean, consistent API for database and file operations.
 */

// ===== MAIN SERVICES =====
export { DatabaseService } from './DatabaseService';
export { GridFSService } from './GridFSService';

// ===== TYPES =====
export * from './database-types';

// ===== UTILITIES =====
export * from './database-utils';
export { QueryMonitor } from './query-monitor';

// ===== MODELS (CONVENIENCE EXPORTS) =====
export { default as User } from '@/models/User';
export { default as Patient } from '@/models/Patient';
export { default as Transfer } from '@/models/Transfer';
export { default as Hospital } from '@/models/Hospital';
export { default as AuditLog } from '@/models/AuditLog';
export { default as Notification } from '@/models/Notification';
export { CIUSSS } from '@/models/CIUSSS';
export { default as Session } from '@/models/Session';
