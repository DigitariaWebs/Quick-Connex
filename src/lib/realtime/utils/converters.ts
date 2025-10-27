/**
 * Type Conversion Utilities
 * 
 * THE ONLY PLACE where ObjectId ↔ string conversion happens
 * All conversions are explicit and type-safe
 */

import { Types } from 'mongoose';
import {
  NotificationDocument,
  NotificationAPI,
  NotificationDeliveryDocument,
  NotificationDeliveryAPI
} from '../core/types';

/**
 * Convert MongoDB document to API response
 * Use this when sending data to the client
 */
export function toNotificationAPI(doc: NotificationDocument): NotificationAPI {
  return {
    id: doc._id.toString(),
    type: doc.type,
    priority: doc.priority,
    title: doc.title,
    message: doc.message,
    data: doc.data,
    targetUsers: doc.targetUsers.map(id => id.toString()),
    targetRoles: doc.targetRoles,
    excludeUsers: doc.excludeUsers.map(id => id.toString()),
    transferId: doc.transferId?.toString(),
    relatedResourceId: doc.relatedResourceId?.toString(),
    relatedResourceType: doc.relatedResourceType,
    deliveries: doc.deliveries.map(toDeliveryAPI),
    status: doc.status,
    deliveryAttempts: doc.deliveryAttempts,
    lastDeliveryAttempt: doc.lastDeliveryAttempt,
    settings: doc.settings,
    createdBy: doc.createdBy.toString(),
    createdByType: doc.createdByType,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function toDeliveryAPI(delivery: NotificationDeliveryDocument): NotificationDeliveryAPI {
  return {
    userId: delivery.userId.toString(),
    deliveryMethod: delivery.deliveryMethod,
    deliveredAt: delivery.deliveredAt,
    readAt: delivery.readAt,
    dismissedAt: delivery.dismissedAt,
    acknowledgedAt: delivery.acknowledgedAt,
    failureReason: delivery.failureReason,
  };
}

/**
 * Convert string or string array to ObjectId
 * Use this at API entry points
 */
export function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  return typeof id === 'string' ? new Types.ObjectId(id) : id;
}

export function toObjectIds(ids: (string | Types.ObjectId)[]): Types.ObjectId[] {
  return ids.map(toObjectId);
}

/**
 * Convert ObjectId or ObjectId array to string
 * Use this at API exit points (if not using toNotificationAPI)
 */
export function toStringId(id: Types.ObjectId | string): string {
  return typeof id === 'string' ? id : id.toString();
}

export function toStringIds(ids: (Types.ObjectId | string)[]): string[] {
  return ids.map(toStringId);
}

/**
 * Batch conversion for array of documents
 */
export function toNotificationAPIBatch(docs: NotificationDocument[]): NotificationAPI[] {
  return docs.map(toNotificationAPI);
}

/**
 * Get string ID from flexible ID (ObjectId or string)
 * Used for backward compatibility
 */
export function getIdString(id: Types.ObjectId | string): string {
  return typeof id === 'string' ? id : id.toString();
}

/**
 * Convert flexible ID to string (required)
 * Throws if id is null/undefined
 */
export function toStringIdRequired(id: Types.ObjectId | string | null | undefined): string {
  if (!id) {
    throw new Error('ID is required but was null or undefined');
  }
  return typeof id === 'string' ? id : id.toString();
}