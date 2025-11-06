/**
 * Notification System Types
 * 
 * TypeScript interfaces and types for the in-app notification system.
 * Note: This is separate from the communication module's email/SMS notification system.
 */

/**
 * Notification Priority
 */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Notification Status
 */
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Notification Type
 */
export type NotificationType = 
  | 'transfer_created'
  | 'transfer_accepted'
  | 'transfer_started'
  | 'transfer_completed'
  | 'transfer_cancelled'
  | 'transfer_status_changed'
  | 'transfer_assigned'
  | 'transfer_timeout'
  | 'transfer_urgent_alert'
  | 'test_notification'
  | 'urgent_transfer'
  | 'notification_count_update';

/**
 * Notification Data Interface
 */
export interface NotificationData {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  transferId?: string;
  data?: any;
  timestamp: string;
  read: boolean;
}

/**
 * Notification Summary Interface
 */
export interface NotificationSummary {
  total: number;
  unread: number;
  high: number;
  medium: number;
  low: number;
}

/**
 * Activity Item Interface
 */
export interface ActivityItem {
  id: string;
  type: 'transfer_requested' | 'transfer_accepted' | 'transfer_completed';
  transferId: string;
  patientName: string;
  description: string;
  timestamp: string;
  user: string;
}

/**
 * Urgent Transfer Interface
 */
export interface UrgentTransfer {
  id: string;
  transferId: string;
  patientName: string;
  fromHospital: string;
  toHospital: string;
  priority: 'urgent';
  timestamp: string;
}

