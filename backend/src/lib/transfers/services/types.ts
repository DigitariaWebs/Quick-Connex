/**
 * Transfer Event Service Types
 * 
 * TypeScript interfaces for the transfer event system.
 */

import { TransferStatus } from '../core/constants';
import { TransferResponse, UserInfo } from '../../../types/transfers/transfer.types';

/**
 * Transfer Event Types
 */
export enum TransferEventType {
  TRANSFER_CREATED = 'transfer_created',
  TRANSFER_ACCEPTED = 'transfer_accepted',
  TRANSFER_STARTED = 'transfer_started',
  TRANSFER_COMPLETED = 'transfer_completed',
  TRANSFER_CANCELLED = 'transfer_cancelled',
  TRANSFER_STATUS_CHANGED = 'transfer_status_changed',
  TRANSFER_ASSIGNED = 'transfer_assigned',
  TRANSFER_REMINDER = 'transfer_reminder',
  TRANSFER_TIMEOUT = 'transfer_timeout',
  TRANSFER_URGENT_ALERT = 'transfer_urgent_alert'
}

/**
 * Transfer Event Data Interface
 */
export interface TransferEventData {
  transferId: string;
  transfer: TransferResponse;
  oldStatus?: TransferStatus;
  newStatus?: TransferStatus;
  changedBy: UserInfo;
  timestamp: string;
  metadata?: {
    reason?: string;
    notes?: string;
    urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Transfer Event Handler Interface
 */
export interface TransferEventHandler {
  eventType: TransferEventType;
  handle(eventType: TransferEventType, eventData: TransferEventData): Promise<void>;
}

/**
 * Transfer Notification Data Interface
 */
export interface TransferNotificationData {
  id: string;
  type: string;
  priority: 'low' | 'urgent';
  title: string;
  message: string;
  transferId: string;
  transfer: {
    id: string;
    transferId: string;
    patientInfo: any;
    fromHospital: string;
    toHospital: string;
    priority: string;
    status: string;
    scheduledDate?: Date;
  };
  requestedBy: {
    id: string;
    name: string;
    userType: string;
  };
  timestamp: string;
  read: boolean;
}
