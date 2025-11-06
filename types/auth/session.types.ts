/**
 * Session Types
 * 
 * Session management and security types.
 */

import { ObjectId, BaseEntity } from '../common';
import { DeviceInfo, LocationInfo, SecurityContext } from './security.types';

export interface ISession extends BaseEntity {
  sessionId: string;
  userId: ObjectId;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  location?: LocationInfo;
  lastAccessedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  revoked: boolean;
  revokedAt?: Date;
  revokedBy?: ObjectId;
  revokedReason?: string;
  securityContext: SecurityContext;
  refreshToken: string;
  sessionType: SessionType;
  concurrentSessions: number;
  isPrimary: boolean;
}

export enum SessionType {
  WEB = 'web',
  MOBILE = 'mobile',
  API = 'api'
}

// Note: SessionDTO moved to /types/dto/session.dto.ts to avoid conflicts

export interface SessionInfo {
  sessionId: string;
  expiresAt: Date;
  lastAccessedAt: Date;
  securityRisk: 'low' | 'medium' | 'high';
  isNewDevice: boolean;
  isNewLocation: boolean;
  sessionAge: number;
  remainingTime: number;
  isPrimary: boolean;
}

export interface CreateSessionDTO {
  userId: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  location?: LocationInfo;
  sessionType?: SessionType;
}

export interface SessionFilters {
  userId?: string;
  sessionType?: SessionType[];
  isActive?: boolean;
  revoked?: boolean;
  securityRisk?: ('low' | 'medium' | 'high')[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface SessionStats {
  total: number;
  active: number;
  revoked: number;
  expired: number;
  byType: {
    web: number;
    mobile: number;
    api: number;
  };
  byRisk: {
    low: number;
    medium: number;
    high: number;
  };
  averageAge: number;
  concurrentSessions: number;
}

export interface SessionCleanupResult {
  cleaned: number;
  performance: number;
  errors: number;
}
