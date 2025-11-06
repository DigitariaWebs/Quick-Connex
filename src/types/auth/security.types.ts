/**
 * Security Types
 * 
 * Security-related types including device info, location, and risk assessment.
 */

import { RiskLevel } from '@/models/AuditLog';

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  screenResolution?: string;
  timezone: string;
  language: string;
}

export interface LocationInfo {
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface SecurityContext {
  fingerprint: string;
  riskScore: number; // 0-100, higher = more risky
  isNewDevice: boolean;
  isNewLocation: boolean;
  suspiciousActivity: boolean;
  lastSecurityCheck: Date;
  securityFlags: string[];
}

export interface SecurityCheck {
  suspicious: boolean;
  flags: string[];
  riskScore: number;
  recommendations: string[];
}

export interface RiskAssessment {
  riskLevel: RiskLevel;
  riskScore: number;
  flags: string[];
  recommendations: string[];
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
  remaining?: number;
}

