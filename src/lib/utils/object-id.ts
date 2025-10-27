/**
 * ObjectId Helper Utilities
 * 
 * Provides type-safe conversion functions between MongoDB ObjectId and string types.
 * Used throughout the application to handle flexible ID types.
 */

import { Types } from 'mongoose';

// ===== TYPE GUARDS =====

/**
 * Type guard to check if a value is a MongoDB ObjectId
 */
export function isObjectId(value: any): value is Types.ObjectId {
  return value instanceof Types.ObjectId;
}

/**
 * Type guard to check if a value is a string ID
 */
export function isStringId(value: any): value is string {
  return typeof value === 'string';
}

// ===== CONVERSION HELPERS =====

/**
 * Convert a flexible ID to string, handling undefined
 */
export function toStringId(id: string | Types.ObjectId | undefined): string | undefined {
  if (!id) return undefined;
  return typeof id === 'string' ? id : id.toString();
}

/**
 * Convert a flexible ID to string, throwing if undefined
 */
export function toStringIdRequired(id: string | Types.ObjectId | undefined): string {
  if (!id) throw new Error('ID is required but was undefined');
  return typeof id === 'string' ? id : id.toString();
}

/**
 * Convert an array of flexible IDs to string array
 */
export function toStringIds(ids: (string | Types.ObjectId)[]): string[] {
  return ids.map(id => typeof id === 'string' ? id : id.toString());
}

/**
 * Convert a flexible ID to ObjectId
 */
export function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  return typeof id === 'string' ? new Types.ObjectId(id) : id;
}

/**
 * Convert an array of flexible IDs to ObjectId array
 */
export function toObjectIds(ids: (string | Types.ObjectId)[]): Types.ObjectId[] {
  return ids.map(id => typeof id === 'string' ? new Types.ObjectId(id) : id);
}

// ===== SAFE ACCESSORS =====

/**
 * Safely extract ID string from objects that might have _id or id property
 */
export function getIdString(obj: { _id: Types.ObjectId } | { id: string } | { _id?: Types.ObjectId; id?: string }): string {
  if ('_id' in obj && obj._id) {
    return obj._id.toString();
  }
  if ('id' in obj && obj.id) {
    return typeof obj.id === 'string' ? obj.id : (obj.id as any).toString();
  }
  throw new Error('Object does not have a valid ID property');
}

/**
 * Safely extract ID as ObjectId from objects that might have _id or id property
 */
export function getIdObjectId(obj: { _id: Types.ObjectId } | { id: string } | { _id?: Types.ObjectId; id?: string }): Types.ObjectId {
  if ('_id' in obj && obj._id) {
    return obj._id;
  }
  if ('id' in obj && obj.id) {
    return typeof obj.id === 'string' ? new Types.ObjectId(obj.id) : obj.id;
  }
  throw new Error('Object does not have a valid ID property');
}

// ===== VALIDATION HELPERS =====

/**
 * Check if a string is a valid ObjectId format
 */
export function isValidObjectIdString(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

/**
 * Validate and convert string to ObjectId, throwing if invalid
 */
export function validateAndToObjectId(id: string): Types.ObjectId {
  if (!isValidObjectIdString(id)) {
    throw new Error(`Invalid ObjectId format: ${id}`);
  }
  return new Types.ObjectId(id);
}

// ===== UTILITY TYPES =====

/**
 * Flexible ID type that can be either string or ObjectId
 */
export type FlexibleId = string | Types.ObjectId;

/**
 * Flexible ID array type
 */
export type FlexibleIdArray = (string | Types.ObjectId)[];
