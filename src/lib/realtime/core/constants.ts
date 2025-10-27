/**
 * Realtime Notification System Constants
 * 
 * All constants used throughout the real-time notification system.
 * Organized by category for easy maintenance.
 */

import { SocketTransport } from './types';

// ===== SOCKET EVENTS =====

export const SOCKET_EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  
  // Authentication
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  
  // Notifications
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_DISMISSED: 'notification:dismissed',
  NOTIFICATION_BULK_UPDATE: 'notification:bulk_update',
  
  // Transfers
  TRANSFER_CREATED: 'transfer:created',
  TRANSFER_UPDATED: 'transfer:updated',
  TRANSFER_STATUS_CHANGED: 'transfer:status_changed',
  
  // Dashboard
  DASHBOARD_STATS_UPDATE: 'dashboard:stats',
  DASHBOARD_ACTIVITY_NEW: 'dashboard:activity',
  DASHBOARD_SUBSCRIBE: 'dashboard:subscribe',
  DASHBOARD_UNSUBSCRIBE: 'dashboard:unsubscribe',
  
  // System
  USER_PRESENCE: 'user:presence',
  SYSTEM_ANNOUNCEMENT: 'system:announcement',
} as const;

// ===== NOTIFICATION TYPES =====

export const NOTIFICATION_TYPES = {
  // Transfer events
  TRANSFER_CREATED: 'transfer_created',
  TRANSFER_UPDATED: 'transfer_updated',
  TRANSFER_ASSIGNED: 'transfer_assigned',
  TRANSFER_COMPLETED: 'transfer_completed',
  TRANSFER_CANCELLED: 'transfer_cancelled',
  TRANSFER_URGENT: 'transfer_urgent',
  
  // User events
  USER_APPROVED: 'user_approved',
  USER_REJECTED: 'user_rejected',
  USER_SUSPENDED: 'user_suspended',
  
  // System events
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  SYSTEM_MAINTENANCE: 'system_maintenance',
  SYSTEM_ALERT: 'system_alert',
} as const;

// ===== NOTIFICATION PRIORITIES =====

export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

// ===== NOTIFICATION STATUSES =====

export const NOTIFICATION_STATUSES = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  READ: 'read',
  DISMISSED: 'dismissed',
  FAILED: 'failed',
} as const;

// ===== DELIVERY METHODS =====

export const DELIVERY_METHODS = {
  REALTIME: 'realtime',
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
} as const;

// ===== ROOM PREFIXES =====

export const ROOM_PREFIXES = {
  USER: 'user',
  ROLE: 'role',
  TRANSFER: 'transfer',
  DASHBOARD: 'dashboard',
  BROADCAST: 'broadcast',
} as const;

// ===== ERROR CODES =====

export const ERROR_CODES = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  NOTIFICATION_CREATE_FAILED: 'NOTIFICATION_CREATE_FAILED',
  NOTIFICATION_DELIVERY_FAILED: 'NOTIFICATION_DELIVERY_FAILED',
  PUSH_SUBSCRIPTION_FAILED: 'PUSH_SUBSCRIPTION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// ===== TIMING CONSTANTS =====

export const TIMING = {
  // Connection
  CONNECTION_TIMEOUT: 10000,           // 10 seconds
  RECONNECT_DELAY: 1000,               // 1 second
  RECONNECT_MAX_ATTEMPTS: 5,
  
  // Notifications
  NOTIFICATION_TIMEOUT: 30000,         // 30 seconds
  NOTIFICATION_MAX_RETRIES: 3,
  NOTIFICATION_RETRY_DELAY: 5000,      // 5 seconds
  
  // Cleanup
  CLEANUP_INTERVAL: 300000,            // 5 minutes
  NOTIFICATION_EXPIRY: 604800000,      // 7 days
  
  // Rate limiting
  RATE_LIMIT_WINDOW: 60000,            // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Socket timing
  SOCKET_PING_INTERVAL: 25000,         // 25 seconds
  SOCKET_PING_TIMEOUT: 60000,          // 60 seconds
} as const;

// ===== DEFAULT VALUES =====

export const DEFAULTS = {
  NOTIFICATION_PRIORITY: 'medium',
  NOTIFICATION_STATUS: 'pending',
  DELIVERY_METHOD: 'realtime',
  MAX_NOTIFICATIONS_PER_USER: 100,
  NOTIFICATION_BATCH_SIZE: 50,
  SOCKET_PING_INTERVAL: 25000,         // 25 seconds
  SOCKET_PING_TIMEOUT: 60000,          // 60 seconds
} as const;

// ===== RETRY POLICIES =====

export const RETRY_POLICIES = {
  LINEAR_BACKOFF: 'linear',
  EXPONENTIAL_BACKOFF: 'exponential',
  FIXED_DELAY: 'fixed',
} as const;

// ===== CONFIGURATION DEFAULTS =====

export const DEFAULT_CONFIG = {
  SOCKET_PATH: '/socket.io',
  SOCKET_TRANSPORTS: ['websocket', 'polling'] as SocketTransport[],
  SOCKET_PING_INTERVAL: TIMING.SOCKET_PING_INTERVAL,
  SOCKET_PING_TIMEOUT: TIMING.SOCKET_PING_TIMEOUT,
  SOCKET_MAX_BUFFER_SIZE: 1e6,         // 1MB
  
  NOTIFICATION_MAX_RETRIES: TIMING.NOTIFICATION_MAX_RETRIES,
  NOTIFICATION_RETRY_DELAY: TIMING.NOTIFICATION_RETRY_DELAY,
  NOTIFICATION_BATCH_SIZE: DEFAULTS.NOTIFICATION_BATCH_SIZE,
  NOTIFICATION_CLEANUP_INTERVAL: TIMING.CLEANUP_INTERVAL,
  
  RATE_LIMIT_WINDOW: TIMING.RATE_LIMIT_WINDOW,
  RATE_LIMIT_MAX_REQUESTS: TIMING.RATE_LIMIT_MAX_REQUESTS,
  RETRY_POLICY: RETRY_POLICIES.EXPONENTIAL_BACKOFF,
  CONNECTION_TIMEOUT: TIMING.CONNECTION_TIMEOUT,
  MAX_RETRIES: TIMING.NOTIFICATION_MAX_RETRIES
} as const;