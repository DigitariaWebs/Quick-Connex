import { Types } from 'mongoose';
import { calculateDateDiff } from './date-time';

/**
 * Data Transformers
 * 
 * Transform database models to API responses with consistent formatting.
 * Handles sensitive data removal, field selection, and pagination.
 */

// ===== TYPES =====

export interface TransformOptions {
  includePrivate?: boolean;
  populate?: string[];
  fields?: string[];
  excludeFields?: string[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ===== USER TRANSFORMERS =====

/**
 * Transform user document to API response
 */
export function transformUser(user: any, options: TransformOptions = {}): any {
  if (!user) return null;

  const {
    includePrivate = false,
    excludeFields = ['password', 'refreshToken', 'loginAttempts']
  } = options;

  // Convert to plain object if it's a Mongoose document
  const userObj = user.toObject ? user.toObject() : user;

  // Remove sensitive fields unless explicitly requested
  if (!includePrivate) {
    excludeFields.forEach(field => {
      delete userObj[field];
    });
  }

  // Transform ObjectId to string
  if (userObj._id) {
    userObj.id = userObj._id.toString();
    delete userObj._id;
  }

  // Transform dates to ISO strings
  if (userObj.createdAt) {
    userObj.createdAt = userObj.createdAt.toISOString();
  }
  if (userObj.updatedAt) {
    userObj.updatedAt = userObj.updatedAt.toISOString();
  }
  if (userObj.lastLoginAt) {
    userObj.lastLoginAt = userObj.lastLoginAt.toISOString();
  }

  // Select only requested fields
  if (options.fields && options.fields.length > 0) {
    const filtered: any = {};
    options.fields.forEach(field => {
      if (userObj.hasOwnProperty(field)) {
        filtered[field] = userObj[field];
      }
    });
    return filtered;
  }

  return userObj;
}

/**
 * Transform user for public API (no sensitive data)
 */
export function transformUserPublic(user: any): any {
  return transformUser(user, {
    includePrivate: false,
    fields: ['id', 'email', 'firstName', 'lastName', 'userType', 'status', 'createdAt']
  });
}

// ===== SESSION TRANSFORMERS =====

/**
 * Transform session document to API response
 */
export function transformSession(session: any, options: TransformOptions = {}): any {
  if (!session) return null;

  const sessionObj = session.toObject ? session.toObject() : session;

  // Transform ObjectId to string
  if (sessionObj._id) {
    sessionObj.id = sessionObj._id.toString();
    delete sessionObj._id;
  }

  if (sessionObj.userId) {
    sessionObj.userId = sessionObj.userId.toString();
  }

  // Transform dates
  if (sessionObj.createdAt) {
    sessionObj.createdAt = sessionObj.createdAt.toISOString();
  }
  if (sessionObj.lastAccessedAt) {
    sessionObj.lastAccessedAt = sessionObj.lastAccessedAt.toISOString();
  }
  if (sessionObj.expiresAt) {
    sessionObj.expiresAt = sessionObj.expiresAt.toISOString();
  }

  // Remove sensitive fields
  if (!options.includePrivate) {
    delete sessionObj.sessionToken;
    delete sessionObj.refreshToken;
  }

  return sessionObj;
}

// ===== PATIENT TRANSFORMERS =====

/**
 * Transform patient document to API response
 */
export function transformPatient(patient: any, options: TransformOptions = {}): any {
  if (!patient) return null;

  const patientObj = patient.toObject ? patient.toObject() : patient;

  // Transform ObjectId to string
  if (patientObj._id) {
    patientObj.id = patientObj._id.toString();
    delete patientObj._id;
  }

  // Transform related ObjectIds
  if (patientObj.createdBy) {
    patientObj.createdBy = patientObj.createdBy.toString();
  }
  if (patientObj.updatedBy) {
    patientObj.updatedBy = patientObj.updatedBy.toString();
  }

  // Transform dates
  if (patientObj.createdAt) {
    patientObj.createdAt = patientObj.createdAt.toISOString();
  }
  if (patientObj.updatedAt) {
    patientObj.updatedAt = patientObj.updatedAt.toISOString();
  }
  if (patientObj.dateOfBirth) {
    patientObj.dateOfBirth = patientObj.dateOfBirth.toISOString();
  }

  return patientObj;
}

// ===== TRANSFER TRANSFORMERS =====

/**
 * Transform transfer document to API response
 */
export function transformTransfer(transfer: any, options: TransformOptions = {}): any {
  if (!transfer) return null;

  const transferObj = transfer.toObject ? transfer.toObject() : transfer;

  // Transform ObjectId to string
  if (transferObj._id) {
    transferObj.id = transferObj._id.toString();
    delete transferObj._id;
  }

  // Transform related ObjectIds
  if (transferObj.patientId) {
    transferObj.patientId = transferObj.patientId.toString();
  }
  if (transferObj.fromHospitalId) {
    transferObj.fromHospitalId = transferObj.fromHospitalId.toString();
  }
  if (transferObj.toHospitalId) {
    transferObj.toHospitalId = transferObj.toHospitalId.toString();
  }
  if (transferObj.requestedBy) {
    transferObj.requestedBy = transferObj.requestedBy.toString();
  }
  if (transferObj.approvedBy) {
    transferObj.approvedBy = transferObj.approvedBy.toString();
  }

  // Transform dates
  if (transferObj.createdAt) {
    transferObj.createdAt = transferObj.createdAt.toISOString();
  }
  if (transferObj.updatedAt) {
    transferObj.updatedAt = transferObj.updatedAt.toISOString();
  }
  if (transferObj.requestedAt) {
    transferObj.requestedAt = transferObj.requestedAt.toISOString();
  }
  if (transferObj.approvedAt) {
    transferObj.approvedAt = transferObj.approvedAt.toISOString();
  }
  if (transferObj.scheduledAt) {
    transferObj.scheduledAt = transferObj.scheduledAt.toISOString();
  }

  return transferObj;
}

// ===== AUDIT LOG TRANSFORMERS =====

/**
 * Transform audit log document to API response
 */
export function transformAuditLog(log: any, options: TransformOptions = {}): any {
  if (!log) return null;

  const logObj = log.toObject ? log.toObject() : log;

  // Transform ObjectId to string
  if (logObj._id) {
    logObj.id = logObj._id.toString();
    delete logObj._id;
  }

  // Transform related ObjectIds
  if (logObj.actorId) {
    logObj.actorId = logObj.actorId.toString();
  }
  if (logObj.targetResourceId) {
    logObj.targetResourceId = logObj.targetResourceId.toString();
  }

  // Transform dates
  if (logObj.createdAt) {
    logObj.createdAt = logObj.createdAt.toISOString();
  }

  return logObj;
}

// ===== PAGINATION HELPERS =====

/**
 * Add pagination metadata to results
 */
export function paginateResults<T>(
  results: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data: results,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

// ===== DATA SANITIZATION =====

/**
 * Remove sensitive fields from any object
 */
export function sanitizeForPublicAPI(data: any, sensitiveFields: string[] = []): any {
  if (!data) return data;

  const defaultSensitiveFields = [
    'password',
    'refreshToken',
    'sessionToken',
    'apiKey',
    'secret',
    'privateKey',
    'internalNotes',
    'adminNotes'
  ];

  const fieldsToRemove = [...defaultSensitiveFields, ...sensitiveFields];
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForPublicAPI(item, sensitiveFields));
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };
    
    fieldsToRemove.forEach(field => {
      delete sanitized[field];
    });

    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = sanitizeForPublicAPI(sanitized[key], sensitiveFields);
      }
    });

    return sanitized;
  }

  return data;
}

/**
 * Select specific fields from object
 */
export function pickFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): Partial<T> {
  const result: Partial<T> = {};
  
  fields.forEach(field => {
    if (obj.hasOwnProperty(field)) {
      result[field] = obj[field];
    }
  });

  return result;
}

/**
 * Exclude specific fields from object
 */
export function omitFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): Partial<T> {
  const result = { ...obj };
  
  fields.forEach(field => {
    delete result[field];
  });

  return result;
}

// ===== OBJECT ID HELPERS =====

/**
 * Convert ObjectId to string
 */
export function objectIdToString(id: any): string {
  if (!id) return '';
  
  if (typeof id === 'string') return id;
  if (id.toString) return id.toString();
  
  return String(id);
}

/**
 * Convert string to ObjectId
 */
export function stringToObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

/**
 * Check if string is valid ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

// ===== DATE HELPERS =====

/**
 * Convert date to ISO string
 */
export function dateToISOString(date: any): string | null {
  if (!date) return null;
  
  if (typeof date === 'string') return date;
  if (date instanceof Date) return date.toISOString();
  if (date.toISOString) return date.toISOString();
  
  return null;
}

/**
 * Convert dates in object to ISO strings
 */
export function convertDatesToISO(obj: any, dateFields: string[] = []): any {
  if (!obj || typeof obj !== 'object') return obj;

  const result = { ...obj };
  
  const defaultDateFields = [
    'createdAt',
    'updatedAt',
    'deletedAt',
    'lastLoginAt',
    'expiresAt',
    'scheduledAt',
    'dateOfBirth'
  ];

  const fieldsToConvert = [...defaultDateFields, ...dateFields];
  
  fieldsToConvert.forEach(field => {
    if (result[field]) {
      result[field] = dateToISOString(result[field]);
    }
  });

  return result;
}

// ===== ARRAY HELPERS =====

/**
 * Transform array of documents
 */
export function transformArray<T>(
  items: T[],
  transformer: (item: T) => any,
  options: TransformOptions = {}
): any[] {
  if (!Array.isArray(items)) return [];

  return items
    .filter(item => item !== null && item !== undefined)
    .map(item => transformer(item))
    .filter(item => item !== null);
}

/**
 * Transform array with pagination
 */
export function transformArrayWithPagination<T>(
  items: T[],
  transformer: (item: T) => any,
  page: number,
  limit: number,
  total: number,
  options: TransformOptions = {}
): PaginatedResult<any> {
  const transformedItems = transformArray(items, transformer, options);
  
  return paginateResults(transformedItems, page, limit, total);
}

// ===== UTILITY FUNCTIONS =====

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const cloned: any = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone((obj as any)[key]);
    });
    return cloned;
  }
  return obj;
}

/**
 * Check if value is empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Remove null/undefined values from object
 */
export function removeNullValues<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== null && value !== undefined) {
      result[key as keyof T] = value;
    }
  });

  return result;
}

// ===== AUTH-SPECIFIC TRANSFORMERS =====

/**
 * Transform user object for authentication context
 */
export function transformUserForAuth(user: any): any {
  return pickFields(user, [
    '_id', 'email', 'userType', 'firstName', 
    'lastName', 'status', 'permissions'
  ]);
}

/**
 * Transform session object for authentication context
 */
export function transformSessionForAuth(session: any): any {
  return {
    ...pickFields(session, [
      'sessionId', 'userId', 'deviceInfo', 
      'ipAddress', 'createdAt', 'lastActivity'
    ]),
    isPrimary: session.isPrimary || false
  };
}

/**
 * Sanitize user object for logging (remove sensitive fields)
 */
export function sanitizeUserForLogging(user: any): any {
  return omitFields(user, [
    'password', 'failedAttempts', 
    'lastLoginAttempt', 'passwordResetToken', 'emailVerificationToken'
  ]);
}

/**
 * Transform session for audit logging
 */
export function transformSessionForAudit(session: any): any {
  return pickFields(session, [
    'sessionId', 'userId', 'deviceInfo.deviceType', 
    'deviceInfo.browser', 'ipAddress', 'createdAt', 
    'lastActivity', 'isActive'
  ]);
}

/**
 * Transform user for public API responses
 */
export function transformUserForPublic(user: any): any {
  return pickFields(user, [
    '_id', 'email', 'firstName', 'lastName', 
    'userType', 'status', 'createdAt'
  ]);
}

/**
 * Transform session for user dashboard
 */
export function transformSessionForDashboard(session: any): any {
  return {
    ...pickFields(session, [
      'sessionId', 'deviceInfo', 'ipAddress', 
      'createdAt', 'lastActivity', 'isActive'
    ]),
    isPrimary: session.isPrimary || false,
    duration: session.lastActivity ? 
      Math.floor(calculateDateDiff(session.lastActivity, new Date(), 'minutes')) : 0
  };
}
