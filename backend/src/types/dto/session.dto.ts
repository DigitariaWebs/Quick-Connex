/**
 * Session DTOs
 * 
 * Data Transfer Objects for Session-related API responses.
 */

import { SessionType } from '../auth/session.types';
import { DeviceInfo, LocationInfo } from '../auth/security.types';

export interface SessionDTO {
  sessionId: string;
  expiresAt: Date;
  lastAccessedAt: Date;
  securityRisk: 'low' | 'medium' | 'high';
  isNewDevice: boolean;
  isNewLocation: boolean;
  sessionAge: number;
  remainingTime: number;
  isPrimary: boolean;
  deviceInfo: DeviceInfo;
  location?: LocationInfo;
  sessionType: SessionType;
}

export interface SessionListDTO {
  sessions: SessionDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SessionStatsDTO {
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
