/**
 * Session Service Types
 * 
 * Type definitions for the SessionService to provide clean separation
 * of session-related types from authentication types.
 */

import { Types } from 'mongoose';
import { DeviceInfo } from '@/lib/auth/auth-types';

export interface SessionCreationData {
  userId: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  userAgent: string;
}

export interface SessionValidationResult {
  valid: boolean;
  session?: any; // SessionDocument - will be typed properly when Session model is imported
  user?: any; // UserDocument - will be typed properly when User model is imported
  error?: string;
  errorCode?: string;
  securityRisk?: string;
}

export interface SessionRefreshResult {
  success: boolean;
  session: any; // SessionDocument
  newToken: string;
  expiresAt: Date;
}

export interface SessionStats {
  totalActiveSessions: number;
  totalUsers: number;
  averageSessionsPerUser: number;
  highRiskSessions: number;
  newDeviceSessions: number;
  expiringSoon: number;
  oldestSession: Date | null;
  newestSession: Date | null;
}

export interface CleanupResult {
  deletedCount: number;
  expiredSessionIds: string[];
}

export interface SecurityContext {
  fingerprint: string;
  riskScore: number;
  isNewDevice: boolean;
  isNewLocation: boolean;
  suspiciousActivity: boolean;
  lastSecurityCheck: Date;
  securityFlags: string[];
}

export interface RiskFactors {
  newDevice: boolean;
  newLocation: boolean;
  rapidLocationChange: boolean;
  unusualTime: boolean;
  tooManySessions: boolean;
  suspiciousIP: boolean;
}

export interface SuspiciousActivityCheck {
  suspicious: boolean;
  flags: string[];
}

export interface SessionLimitCheck {
  withinLimit: boolean;
  currentCount: number;
  maxAllowed: number;
  canCreateNew: boolean;
}
