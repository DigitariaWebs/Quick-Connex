/**
 * Realtime Notification System Types
 * 
 * Comprehensive type definitions with zero duplication.
 * All types imported from their source modules.
 */

// ===== EXTERNAL TYPE IMPORTS =====

// Auth Module
import { 
  UserRole, 
  TokenPayload, 
  AuthUser,
  RequestInfo 
} from '@/lib/auth/core/types';

// Audit Module
import { 
  ActorType, 
  AuditAction, 
  AuditCategory,
  TargetResourceType,
  RiskLevel 
} from '@/models/AuditLog';

// Database Module
import { Types, Document } from 'mongoose';

// Communication Module
import { 
  CommunicationChannel,
  CommunicationPriority,
  CommunicationStatus 
} from '@/lib/communication/core/types';

// Socket.io
import { Socket } from 'socket.io';

// ===== SOCKET.IO TYPES =====

/**
 * Socket.io transport types from engine.io-client
 */
export type SocketTransport = 'polling' | 'websocket' | 'webtransport';

/**
 * Authenticated Socket Interface
 * Extends Socket.io Socket with authentication data from JWT
 * 
 * IMPORTANT: Fields match TokenPayload exactly - no additions
 */
export interface AuthenticatedSocket extends Socket {
  // From JWT TokenPayload
  userId: string;
  userType: UserRole;
  userEmail: string;
  sessionId?: string;
  
  // Connection metadata (not from JWT)
  connectedAt: Date;
  lastActivityAt: Date;
  ipAddress: string;
  userAgent: string;
}

// ===== NOTIFICATION TYPES =====

/**
 * Notification types aligned with system events
 */
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

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

/**
 * Notification priorities aligned with communication module
 */
export type NotificationPriority = CommunicationPriority;

/**
 * Notification status tracking
 */
export const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  READ: 'read',
  DISMISSED: 'dismissed',
  FAILED: 'failed',
} as const;

export type NotificationStatus = typeof NOTIFICATION_STATUS[keyof typeof NOTIFICATION_STATUS];

/**
 * Delivery methods aligned with communication channels
 */
export type DeliveryMethod = CommunicationChannel;

// ===== MONGODB DOCUMENT TYPES =====

/**
 * Notification Document (as stored in MongoDB)
 * Uses native Types.ObjectId throughout
 * 
 * This is what the database returns and what services work with
 */
export interface NotificationDocument extends Document {
  _id: Types.ObjectId;
  
  // Content
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  
  // Targeting
  targetUsers: Types.ObjectId[];
  targetRoles: UserRole[];
  excludeUsers: Types.ObjectId[];
  
  // References
  transferId?: Types.ObjectId;
  relatedResourceId?: Types.ObjectId;
  relatedResourceType?: TargetResourceType;
  
  // Delivery tracking
  deliveries: NotificationDeliveryDocument[];
  
  // Status
  status: NotificationStatus;
  deliveryAttempts: number;
  lastDeliveryAttempt?: Date;
  
  // Settings
  settings: {
    persistent: boolean;
    expiresAt?: Date;
    requireAcknowledgment: boolean;
    channels: DeliveryMethod[];
  };
  
  // Audit fields
  createdBy: Types.ObjectId;
  createdByType: ActorType;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification Delivery Document
 * Tracks delivery to individual users
 */
export interface NotificationDeliveryDocument {
  userId: Types.ObjectId;
  deliveryMethod: DeliveryMethod;
  deliveredAt: Date;
  readAt?: Date;
  dismissedAt?: Date;
  acknowledgedAt?: Date;
  failureReason?: string;
}

// ===== API RESPONSE TYPES =====

/**
 * Notification API Response (for client consumption)
 * All ObjectIds converted to strings
 * 
 * This is what gets sent to the frontend
 */
export interface NotificationAPI {
  id: string;                           // Converted from _id
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  
  targetUsers: string[];                // Converted
  targetRoles: UserRole[];
  excludeUsers: string[];               // Converted
  
  transferId?: string;                  // Converted
  relatedResourceId?: string;           // Converted
  relatedResourceType?: TargetResourceType;
  
  deliveries: NotificationDeliveryAPI[];
  status: NotificationStatus;
  deliveryAttempts: number;
  lastDeliveryAttempt?: Date;
  
  settings: {
    persistent: boolean;
    expiresAt?: Date;
    requireAcknowledgment: boolean;
    channels: DeliveryMethod[];
  };
  
  createdBy: string;                    // Converted
  createdByType: ActorType;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification Delivery API Response
 */
export interface NotificationDeliveryAPI {
  userId: string;                       // Converted
  deliveryMethod: DeliveryMethod;
  deliveredAt: Date;
  readAt?: Date;
  dismissedAt?: Date;
  acknowledgedAt?: Date;
  failureReason?: string;
}

// ===== SERVICE TYPES =====

/**
 * Create Notification Input
 * Used when creating new notifications
 * Accepts both string and ObjectId for flexibility
 */
export interface CreateNotificationInput {
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  
  // Can accept either format - service will normalize
  targetUsers?: (string | Types.ObjectId)[];
  targetRoles?: UserRole[];
  excludeUsers?: (string | Types.ObjectId)[];
  
  transferId?: string | Types.ObjectId;
  relatedResourceId?: string | Types.ObjectId;
  relatedResourceType?: TargetResourceType;
  
  settings?: Partial<NotificationDocument['settings']>;
  
  createdBy: string | Types.ObjectId;
  createdByType: ActorType;
}

/**
 * Get Notifications Query Options
 */
export interface GetNotificationsOptions {
  userId?: string | Types.ObjectId;
  userRoles?: UserRole[];
  type?: NotificationType;
  priority?: NotificationPriority;
  status?: NotificationStatus;
  unreadOnly?: boolean;
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
}

// ===== SOCKET EVENT TYPES =====

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

export type SocketEventType = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

// ===== ROOM TYPES =====

export enum RoomType {
  USER = 'user',
  ROLE = 'role',
  TRANSFER = 'transfer',
  DASHBOARD = 'dashboard',
  BROADCAST = 'broadcast',
}

export interface RoomInfo {
  name: string;
  type: RoomType;
  members: string[];                    // User IDs as strings
  createdAt: Date;
}

// ===== CONFIGURATION TYPES =====

export interface RealtimeServiceConfig {
  socket: {
    path: string;
    transports: SocketTransport[];
    pingInterval: number;
    pingTimeout: number;
    maxHttpBufferSize: number;
    cors: {
      origin: string | string[];
      credentials: boolean;
    };
  };
  notifications: {
    maxRetries: number;
    retryDelay: number;
    batchSize: number;
    cleanupInterval: number;
  };
  webPush: {
    vapidPublicKey: string;
    vapidPrivateKey: string;
    vapidEmail: string;
  };
}

// ===== CLIENT TYPES =====

export interface RealtimeContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Notifications
  notifications: NotificationAPI[];
  unreadCount: number;
  
  // Web Push
  isPushSupported: boolean;
  isPushSubscribed: boolean;
  pushPermission: NotificationPermission;
  
  // Methods
  connect: () => void;
  disconnect: () => void;
  markAsRead: (notificationId: string) => Promise<void>;
  dismissNotification: (notificationId: string) => Promise<void>;
  subscribeToPush: () => Promise<void>;
  unsubscribeFromPush: () => Promise<void>;
  
  // Utility methods
  clearError: () => void;
}

export interface NotificationToast {
  id: string;
  notification: NotificationAPI;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    realtime: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  types: {
    [key in NotificationType]: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface SocketConnection {
  id: string;
  userId: string;
  userType: UserRole;
  connectedAt: Date;
  lastActivityAt: Date;
  ipAddress: string;
  userAgent: string;
  rooms: string[];
}

// ===== ERROR TYPES =====

export interface RealtimeError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export const REALTIME_ERROR_CODES = {
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

export type RealtimeErrorCode = typeof REALTIME_ERROR_CODES[keyof typeof REALTIME_ERROR_CODES];

// ===== RESPONSE TYPES =====

export interface RealtimeApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface NotificationListResponse {
  notifications: NotificationAPI[];
  total: number;
  unread: number;
  hasMore: boolean;
}

// ===== WEB PUSH TYPES =====

export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ===== EVENT HANDLER TYPES =====

export type EventHandler<T = any> = (data: T) => void | Promise<void>;

export interface EventSubscription {
  event: SocketEventType;
  handler: EventHandler;
  once?: boolean;
}

// ===== CONNECTION OPTIONS =====

export interface ConnectionOptions {
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  timeout?: number;
}