/**
 * Types Module
 * 
 * Centralized exports for all TypeScript types across the application.
 * Single import point for all type definitions.
 */

// Common types
export * from './common';

// Auth types
export * from './auth';

// Transfer types
export * from './transfers';

// Database types
export * from './database';

// Communication types
export * from './communication';

// Logging types
export * from './logging';

// DTO types
export * from './dto';

// Dashboard types
export * from './dashboard/dashboard.types';

// API types
export * from './api.types';

// Error types
export * from './error.types';

// Request types
export * from './request.types';

// Validation types
export * from './validation.types';

// Audit types
export * from './audit';

// Re-export commonly used types for convenience
export type {
  ObjectId,
  Timestamp,
  UUID,
  BaseEntity,
  SoftDeleteEntity
} from './common';

export type {
  UserRole,
  Permission,
  User,
  AuthUser,
  SessionInfo,
  AuthSession,
  LoginCredentials,
  TokenPayload,
  DeviceInfo,
  LocationInfo,
  RequestInfo
} from './auth';

export type {
  BaseAuditContext,
  UserAuditContext,
  TransferAuditContext,
  AuthAuditContext,
  AuditAuthContext,
  AuditRequestInfo,
  AuditLogData
} from './audit';
