/**
 * Session Types
 * 
 * Session-related types for authentication.
 */

export interface SessionInfo {
  sessionId: string;
  expiresAt: Date;
  lastAccessedAt: Date;
  securityRisk: 'low' | 'medium' | 'high';
  isNewDevice: boolean;
  isNewLocation: boolean;
  sessionAge: number;
  remainingTime: number;
  isPrimary?: boolean;
}

export interface AuthSession {
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

export type SessionType = 'web' | 'mobile' | 'api';

