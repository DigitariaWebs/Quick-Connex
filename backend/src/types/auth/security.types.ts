/**
 * Security Types
 * 
 * Security, device, location, and audit-related types.
 */

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
  riskScore: number;
  isNewDevice: boolean;
  isNewLocation: boolean;
  suspiciousActivity: boolean;
  lastSecurityCheck: Date;
  securityFlags: string[];
}

export interface ILoginHistory {
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  location?: string;
}

export interface IDocumentReference {
  fileId: string;
  documentType: 'cv' | 'opiqPermit' | 'rcr';
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  uploadedAt: Date;
}

export interface SecurityCheck {
  suspicious: boolean;
  flags: string[];
  riskScore: number;
  recommendations: string[];
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
  remaining?: number;
}

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  flags: string[];
  recommendations: string[];
}

export interface RequestInfo {
  ipAddress: string;
  userAgent: string;
  method?: string;
  endpoint?: string;
  requestId?: string;
  sessionId?: string;
  deviceFingerprint?: string;
}

export interface AuthAuditContext {
  actorId: string;
  actorType: 'admin' | 'user' | 'system' | 'api' | 'batch';
  actorEmail?: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  description: string;
  targetResourceId?: string;
  targetResourceType?: string;
  metadata?: Record<string, any>;
  requestInfo?: RequestInfo;
  success?: boolean;
  errorMessage?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  isSensitive?: boolean;
  requiresReview?: boolean;
}

export interface AuthConfig {
  // Rate limiting
  maxLoginAttempts: number;
  loginWindowMs: number;
  maxSessionsPerUser: number;
  
  // Session security
  sessionTimeoutMinutes: number;
  requireIpBinding: boolean;
  suspiciousActivityThreshold: number;
  
  // Device security
  requireDeviceVerification: boolean;
  maxNewDevicesPerDay: number;
  
  // JWT settings
  tokenExpirationHours: number;
  refreshTokenExpirationDays: number;
  
  // Security thresholds
  highRiskThreshold: number;
  mediumRiskThreshold: number;
}

export interface AuthMetrics {
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  activeSessions: number;
  revokedSessions: number;
  averageSessionAge: number;
  securityIncidents: number;
  rateLimitHits: number;
}

export interface AuthPerformanceMetrics { 
  averageAuthTime: number;
  averageSessionValidationTime: number;
  cacheHitRate: number;
  databaseQueryTime: number;
  totalRequests: number;
}

export interface SessionCacheEntry {
  session: any; // SessionDTO
  user: any; // UserDTO
  lastAccessed: Date;
  expiresAt: Date;
}

export interface AuthCacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  missRate: number;
  evictions: number;
}
