/**
 * Real-time Notifications System Types
 * 
 * Comprehensive type definitions for the real-time notification system.
 * Includes Socket.io events, notification data structures, and client interfaces.
 */

import { Types } from 'mongoose';
import { FlexibleId } from '@/lib/utils/object-id';

// ===== CORE NOTIFICATION TYPES =====

export interface RealtimeNotification {
  id: FlexibleId;                    // Was: string
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  
  // Targeting
  targetUsers: FlexibleId[];         // Was: string[]
  targetRoles: UserRole[];
  excludeUsers: FlexibleId[];        // Was: string[]
  
  // Related data
  transferId?: string;
  data?: NotificationData;
  
  // Delivery tracking
  deliveries: NotificationDelivery[];
  
  // Settings
  settings: NotificationSettings;
  
  // Status
  status: NotificationStatus;
  deliveryAttempts: number;
  lastDeliveryAttempt?: Date;
  
  // Audit
  createdBy?: FlexibleId;            // Was: string
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationType = 
  | 'transfer_status_change' 
  | 'new_transfer' 
  | 'urgent_transfer' 
  | 'transfer_reminder' 
  | 'system' 
  | 'scheduling'
  | 'user_approval'
  | 'dashboard_update';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationStatus = 'pending' | 'delivered' | 'failed' | 'expired';

export type UserRole = 'employee' | 'manager' | 'admin' | 'super_admin';

export interface NotificationData {
  transfer?: {
    id: string;
    transferId: string;
    patient?: {
      firstName: string;
      lastName: string;
      patientId: string;
    };
    fromHospital?: string;
    toHospital?: string;
    status?: string;
    oldStatus?: string;
    priority?: string;
    scheduledDate?: Date;
  };
  changedBy?: {
    id: string;
    name: string;
    userType: string;
  };
  requestedBy?: {
    id: string;
    name: string;
    userType: string;
  };
  dashboard?: {
    stats?: any;
    activity?: any;
  };
  [key: string]: any;
}

export interface NotificationDelivery {
  userId: FlexibleId;              // Was: string
  deliveredAt: Date;
  readAt?: Date;
  dismissedAt?: Date;
  deliveryMethod: DeliveryMethod;
}

export type DeliveryMethod = 'realtime' | 'email' | 'sms' | 'push';

export interface NotificationSettings {
  persistent: boolean;
  expiresAt?: Date;
  maxDeliveries?: number;
  retryInterval?: number;
}

// ===== SOCKET.IO EVENT TYPES =====

export interface SocketEvent {
  type: SocketEventType;
  payload: any;
  timestamp: Date;
  userId?: string;
  room?: string;
}

export type SocketEventType = 
  // Notification events
  | 'notification:new'
  | 'notification:read'
  | 'notification:deleted'
  | 'notification:dismissed'
  
  // Transfer events
  | 'transfer:created'
  | 'transfer:updated'
  | 'transfer:assigned'
  | 'transfer:completed'
  | 'transfer:cancelled'
  | 'transfer:status_changed'
  
  // Dashboard events
  | 'dashboard:stats:update'
  | 'dashboard:activity:new'
  | 'dashboard:urgent:alert'
  | 'dashboard:subscribe'
  | 'dashboard:unsubscribe'
  
  // System events
  | 'system:announcement'
  | 'user:presence'
  | 'user:online'
  | 'user:offline'
  
  // Test events
  | 'test:broadcast'
  | 'test:notification'
  | 'test:socket_event'
  
  // Connection events
  | 'connection:established'
  | 'connection:reconnected'
  | 'connection:error';

export interface NotificationEventPayload {
  notification: RealtimeNotification;
  userId?: string;
  room?: string;
}

export interface TransferEventPayload {
  transfer: {
    id: string;
    transferId: string;
    status: string;
    oldStatus?: string;
    assignedTo?: string;
    createdBy: string;
    patient?: {
      firstName: string;
      lastName: string;
    };
    fromHospital?: string;
    toHospital?: string;
    priority?: string;
  };
  changedBy?: {
    id: string;
    name: string;
    userType: string;
  };
}

export interface DashboardEventPayload {
  stats?: {
    totalPending: number;
    totalAccepted: number;
    totalInProgress: number;
    totalCompleted: number;
    totalUrgent: number;
    scheduledToday: number;
  };
  activity?: {
    id: string;
    type: string;
    description: string;
    timestamp: Date;
    userId?: string;
  };
}

export interface UserPresencePayload {
  userId: string;
  status: 'online' | 'offline';
  lastSeen?: Date;
  userType: UserRole;
}

// ===== CLIENT-SIDE TYPES =====

export interface RealtimeContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Notifications
  notifications: RealtimeNotification[];
  unreadCount: number;
  
  // Web Push
  isPushSupported: boolean;
  isPushSubscribed: boolean;
  pushPermission: NotificationPermission;
  
  // Methods
  connect: () => Promise<void>;
  disconnect: () => void;
  emitEvent: (event: SocketEventType, payload: any) => void;
  
  // Notification methods
  markAsRead: (notificationId: string) => Promise<void>;
  markAsDismissed: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  
  // Web Push methods
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<boolean>;
  
  // Utility methods
  clearError: () => void;
}

export interface NotificationToast {
  id: string;
  notification: RealtimeNotification;
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
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
}

// ===== SERVER-SIDE TYPES =====

export interface SocketConnection {
  id: string;
  userId: string;
  userType: UserRole;
  connectedAt: Date;
  lastActivity: Date;
  rooms: string[];
  ipAddress?: string;
  userAgent?: string;
}

export interface RoomInfo {
  name: string;
  type: 'user' | 'role' | 'transfer' | 'broadcast';
  members: string[];
  createdAt: Date;
}

export interface RealtimeServiceConfig {
  socket: {
    path: string;
    transports: string[];
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
    expirationTime: number;
    batchSize: number;
  };
  webPush: {
    vapidPublicKey: string;
    vapidPrivateKey: string;
    vapidEmail: string;
  };
}

export interface DeliveryResult {
  success: boolean;
  method: DeliveryMethod;
  userId: string;
  notificationId: FlexibleId;  // Was: string
  error?: string;
  timestamp: Date;
}

export interface RealtimeAnalytics {
  connections: {
    total: number;
    active: number;
    byRole: Record<UserRole, number>;
  };
  notifications: {
    sent: number;
    delivered: number;
    failed: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<NotificationPriority, number>;
  };
  performance: {
    averageDeliveryTime: number;
    socketLatency: number;
    errorRate: number;
  };
}

// ===== API RESPONSE TYPES =====

export interface RealtimeApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface NotificationListResponse {
  notifications: RealtimeNotification[];
  total: number;
  unread: number;
  hasMore: boolean;
}

export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ===== UTILITY TYPES =====

export type EventHandler<T = any> = (payload: T) => void | Promise<void>;

export interface EventSubscription {
  event: SocketEventType;
  handler: EventHandler;
  once?: boolean;
}

export interface ConnectionOptions {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  timeout?: number;
}

// ===== API BOUNDARY TYPES =====

/**
 * API response type with strict string IDs for client consumption
 */
export interface NotificationAPIResponse {
  id: string;                        // API always returns strings
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  targetUsers: string[];
  targetRoles: UserRole[];
  excludeUsers: string[];
  transferId?: string;
  data?: NotificationData;
  deliveries: Array<{
    userId: string;                  // API always returns strings
    deliveredAt: Date;
    readAt?: Date;
    dismissedAt?: Date;
    deliveryMethod: DeliveryMethod;
  }>;
  settings: NotificationSettings;
  status: NotificationStatus;
  deliveryAttempts: number;
  lastDeliveryAttempt?: Date;
  createdBy?: string;                // API always returns strings
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API request type for creating notifications
 */
export interface CreateNotificationAPIRequest {
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  targetUsers?: string[];            // API accepts strings
  targetRoles?: UserRole[];
  excludeUsers?: string[];           // API accepts strings
  transferId?: string;
  data?: NotificationData;
  settings?: Partial<NotificationSettings>;
}

// ===== ERROR TYPES =====

export interface RealtimeError extends Error {
  code: string;
  type: 'connection' | 'authentication' | 'delivery' | 'validation';
  details?: any;
}

export type RealtimeErrorCode = 
  | 'CONNECTION_FAILED'
  | 'AUTHENTICATION_FAILED'
  | 'ROOM_JOIN_FAILED'
  | 'NOTIFICATION_SEND_FAILED'
  | 'PUSH_SUBSCRIPTION_FAILED'
  | 'INVALID_EVENT_TYPE'
  | 'RATE_LIMIT_EXCEEDED';

// ===== EXPORTS =====

export type {
  Types
};
