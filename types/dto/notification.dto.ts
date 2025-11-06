/**
 * Notification DTOs
 * 
 * Data Transfer Objects for Notification-related API responses.
 */

export interface NotificationDTO {
  _id: string;
  userId: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  transferId?: string;
  data?: any;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationListDTO {
  notifications: NotificationDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface NotificationStatsDTO {
  total: number;
  unread: number;
  read: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  byType: {
    [type: string]: number;
  };
}
