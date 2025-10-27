/**
 * Real-time Notifications System Constants
 * 
 * Event names, room names, error codes, and other constants used throughout
 * the real-time notification system.
 */

// ===== SOCKET EVENT NAMES =====

export const SOCKET_EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
  RECONNECT_ERROR: 'reconnect_error',
  
  // Authentication events
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  AUTHENTICATION_FAILED: 'authentication_failed',
  
  // Room management
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  ROOM_JOINED: 'room_joined',
  ROOM_LEFT: 'room_left',
  
  // Notification events
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_DISMISSED: 'notification:dismissed',
  NOTIFICATION_DELETED: 'notification:deleted',
  
  // Transfer events
  TRANSFER_CREATED: 'transfer:created',
  TRANSFER_UPDATED: 'transfer:updated',
  TRANSFER_ASSIGNED: 'transfer:assigned',
  TRANSFER_COMPLETED: 'transfer:completed',
  TRANSFER_CANCELLED: 'transfer:cancelled',
  TRANSFER_STATUS_CHANGED: 'transfer:status_changed',
  
  // Dashboard events
  DASHBOARD_STATS_UPDATE: 'dashboard:stats:update',
  DASHBOARD_ACTIVITY_NEW: 'dashboard:activity:new',
  DASHBOARD_URGENT_ALERT: 'dashboard:urgent:alert',
  
  // System events
  SYSTEM_ANNOUNCEMENT: 'system:announcement',
  USER_PRESENCE: 'user:presence',
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  
  // Error events
  ERROR: 'error',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  VALIDATION_ERROR: 'validation_error'
} as const;

// ===== ROOM NAMES =====

export const ROOM_PREFIXES = {
  USER: 'user',
  ROLE: 'role',
  TRANSFER: 'transfer',
  BROADCAST: 'broadcast',
  ADMIN: 'admin'
} as const;

export const ROOM_TYPES = {
  USER_ROOM: (userId: string) => `${ROOM_PREFIXES.USER}:${userId}`,
  ROLE_ROOM: (userType: string) => `${ROOM_PREFIXES.ROLE}:${userType}`,
  TRANSFER_ROOM: (transferId: string) => `${ROOM_PREFIXES.TRANSFER}:${transferId}`,
  BROADCAST_ROOM: () => `${ROOM_PREFIXES.BROADCAST}:all`,
  ADMIN_ROOM: () => `${ROOM_PREFIXES.ADMIN}:all`
} as const;

// ===== NOTIFICATION TYPES =====

export const NOTIFICATION_TYPES = {
  TRANSFER_STATUS_CHANGE: 'transfer_status_change',
  NEW_TRANSFER: 'new_transfer',
  URGENT_TRANSFER: 'urgent_transfer',
  TRANSFER_REMINDER: 'transfer_reminder',
  SYSTEM: 'system',
  SCHEDULING: 'scheduling',
  USER_APPROVAL: 'user_approval',
  DASHBOARD_UPDATE: 'dashboard_update'
} as const;

export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
} as const;

export const NOTIFICATION_STATUSES = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  EXPIRED: 'expired'
} as const;

// ===== DELIVERY METHODS =====

export const DELIVERY_METHODS = {
  REALTIME: 'realtime',
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push'
} as const;

// ===== USER ROLES =====

export const USER_ROLES = {
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
} as const;

// ===== ERROR CODES =====

export const ERROR_CODES = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  ROOM_JOIN_FAILED: 'ROOM_JOIN_FAILED',
  NOTIFICATION_SEND_FAILED: 'NOTIFICATION_SEND_FAILED',
  PUSH_SUBSCRIPTION_FAILED: 'PUSH_SUBSCRIPTION_FAILED',
  INVALID_EVENT_TYPE: 'INVALID_EVENT_TYPE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  TRANSFER_NOT_FOUND: 'TRANSFER_NOT_FOUND',
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND'
} as const;

// ===== TIMING CONSTANTS =====

export const TIMING = {
  // Connection timing
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  RECONNECTION_DELAY: 1000,  // 1 second
  RECONNECTION_MAX_DELAY: 30000, // 30 seconds
  RECONNECTION_MAX_ATTEMPTS: 5,
  
  // Notification timing
  NOTIFICATION_RETRY_DELAY: 5000, // 5 seconds
  NOTIFICATION_MAX_RETRIES: 3,
  NOTIFICATION_EXPIRATION_TIME: 24 * 60 * 60 * 1000, // 24 hours
  
  // Presence timing
  PRESENCE_UPDATE_INTERVAL: 30000, // 30 seconds
  PRESENCE_TIMEOUT: 60000, // 1 minute
  
  // Rate limiting
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_EVENTS: 100,
  RATE_LIMIT_MAX_NOTIFICATIONS: 50
} as const;

// ===== RETRY POLICIES =====

export const RETRY_POLICIES = {
  EXPONENTIAL_BACKOFF: {
    baseDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true
  },
  LINEAR_BACKOFF: {
    baseDelay: 5000,
    maxDelay: 30000,
    increment: 5000,
    jitter: false
  },
  FIXED_DELAY: {
    delay: 5000,
    jitter: false
  }
} as const;

// ===== VALIDATION CONSTANTS =====

export const VALIDATION = {
  MAX_NOTIFICATION_TITLE_LENGTH: 100,
  MAX_NOTIFICATION_MESSAGE_LENGTH: 500,
  MAX_NOTIFICATION_DATA_SIZE: 10000, // 10KB
  MAX_TARGET_USERS: 1000,
  MAX_TARGET_ROLES: 10,
  MAX_EXCLUDE_USERS: 100
} as const;

// ===== WEB PUSH CONSTANTS =====

export const WEB_PUSH = {
  VAPID_SUBJECT: 'mailto:admin@your-domain.com',
  TTL: 24 * 60 * 60, // 24 hours
  URGENCY: 'high',
  TOPIC_PREFIX: 'notification',
  MAX_PAYLOAD_SIZE: 4096 // 4KB
} as const;

// ===== ANALYTICS CONSTANTS =====

export const ANALYTICS = {
  METRICS_RETENTION_DAYS: 30,
  BATCH_SIZE: 100,
  FLUSH_INTERVAL: 60000, // 1 minute
  METRICS_PREFIX: 'realtime'
} as const;

// ===== SECURITY CONSTANTS =====

export const SECURITY = {
  MAX_CONNECTIONS_PER_USER: 5,
  MAX_CONNECTIONS_PER_IP: 20,
  MAX_EVENTS_PER_MINUTE: 100,
  MAX_NOTIFICATIONS_PER_MINUTE: 50,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000 // 5 minutes
} as const;

// ===== FEATURE FLAGS =====

export const FEATURES = {
  ENABLE_WEB_PUSH: process.env.ENABLE_WEB_PUSH !== 'false',
  ENABLE_PRESENCE: process.env.ENABLE_PRESENCE !== 'false',
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS !== 'false',
  ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING !== 'false',
  ENABLE_DEBUG_LOGGING: process.env.NODE_ENV === 'development'
} as const;

// ===== DEFAULT VALUES =====

export const DEFAULTS = {
  NOTIFICATION_PRIORITY: NOTIFICATION_PRIORITIES.MEDIUM,
  NOTIFICATION_STATUS: NOTIFICATION_STATUSES.PENDING,
  DELIVERY_METHOD: DELIVERY_METHODS.REALTIME,
  USER_ROLE: USER_ROLES.EMPLOYEE,
  RETRY_POLICY: RETRY_POLICIES.EXPONENTIAL_BACKOFF,
  CONNECTION_TIMEOUT: TIMING.CONNECTION_TIMEOUT,
  MAX_RETRIES: TIMING.NOTIFICATION_MAX_RETRIES
} as const;

// ===== EXPORTS =====

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
export type NotificationPriority = typeof NOTIFICATION_PRIORITIES[keyof typeof NOTIFICATION_PRIORITIES];
export type NotificationStatus = typeof NOTIFICATION_STATUSES[keyof typeof NOTIFICATION_STATUSES];
export type DeliveryMethod = typeof DELIVERY_METHODS[keyof typeof DELIVERY_METHODS];
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
