/**
 * Core Real-time Components
 * 
 * Exports all core real-time service components including
 * the main service, types, constants, and configuration.
 */

// Main Service
export { RealtimeService } from './RealtimeService';
export { NotificationService } from './NotificationService';

// Types
export type {
  RealtimeNotification,
  SocketEvent,
  SocketEventType,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  UserRole,
  NotificationData,
  NotificationDelivery,
  DeliveryMethod,
  NotificationSettings,
  NotificationEventPayload,
  TransferEventPayload,
  DashboardEventPayload,
  UserPresencePayload,
  RealtimeContextType,
  NotificationToast,
  NotificationPreferences,
  SocketConnection,
  RoomInfo,
  RealtimeServiceConfig,
  DeliveryResult,
  RealtimeAnalytics,
  RealtimeError,
  RealtimeErrorCode,
  RealtimeApiResponse,
  NotificationListResponse,
  WebPushSubscription,
  EventHandler,
  EventSubscription,
  ConnectionOptions
} from './types';

// Constants
export {
  SOCKET_EVENTS,
  ROOM_PREFIXES,
  ROOM_TYPES,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUSES,
  DELIVERY_METHODS,
  USER_ROLES,
  ERROR_CODES,
  TIMING,
  RETRY_POLICIES,
  VALIDATION,
  WEB_PUSH,
  ANALYTICS,
  SECURITY,
  FEATURES,
  DEFAULTS
} from './constants';

// Configuration
export {
  getRealtimeConfig,
  validateRealtimeConfig,
  getEnvironmentConfig,
  getPlatformConfig,
  mergeConfigurations,
  REALTIME_CONFIG
} from './config';

// Notification Service Types
export type {
  CreateNotificationData,
  GetNotificationsOptions
} from './NotificationService';
