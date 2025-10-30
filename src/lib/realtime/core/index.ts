/**
 * Realtime Core Module
 * 
 * Main exports for the realtime notification system core functionality.
 */

// Services
export { NotificationService } from './NotificationService';
export { RealtimeService } from './RealtimeService';

// Types
export type {
  AuthenticatedSocket,
  SocketTransport,
  NotificationDocument,
  NotificationAPI,
  NotificationDeliveryDocument,
  NotificationDeliveryAPI,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  DeliveryMethod,
  CreateNotificationInput,
  GetNotificationsOptions,
  SocketEventType,
  RoomType,
  RoomInfo,
  RealtimeServiceConfig,
  RealtimeContextType,
  NotificationToast,
  NotificationPreferences,
  SocketConnection,
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
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUSES,
  DELIVERY_METHODS,
  ROOM_PREFIXES,
  ERROR_CODES,
  TIMING,
  DEFAULTS,
  RETRY_POLICIES,
  DEFAULT_CONFIG
} from './constants';

// Configuration
export { REALTIME_CONFIG } from './config';