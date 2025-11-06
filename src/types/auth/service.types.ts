/**
 * Auth Service Types
 * 
 * Authentication service layer types (contexts, results, options).
 */

import { RiskLevel } from '@/models/AuditLog';
import { AuthUser, UserRole } from './user.types';
import { SessionInfo, AuthSession } from './session.types';

export type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading';

export interface AuthContext {
  user: AuthUser;
  session: AuthSession;
  isValid: boolean;
  securityRisk: RiskLevel;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
  errorCode?: string;
}

export interface AuthOptions {
  roles?: UserRole[];
  requireSession?: boolean;
  requireActiveStatus?: boolean;
  skipRateLimit?: boolean;
}

export interface LoginResult extends AuthResult {
  session?: AuthSession;
  securityFlags?: string[];
  riskScore?: number;
}

export interface SessionValidation {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
  errorCode?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: any;
  error?: string;
  errorCode?: string;
  message?: string;
}

// Cache Types
export interface SessionCacheEntry {
  session: AuthSession;
  user: AuthUser;
  lastAccessed: Date;
  expiresAt: Date;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  missRate: number;
  evictions: number;
}

// Metrics Types
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

export interface PerformanceMetrics {
  averageAuthTime: number;
  averageSessionValidationTime: number;
  cacheHitRate: number;
  databaseQueryTime: number;
  totalRequests: number;
}

// Utility Types
export type AuthMethod = 'password' | 'oauth' | 'saml' | 'ldap';

export interface AuthProvider {
  name: string;
  type: AuthMethod;
  enabled: boolean;
  config: Record<string, any>;
}

export interface SessionCleanupResult {
  cleaned: number;
  performance: number;
  errors: number;
}

// Legacy AuthContextType (for backward compatibility)
export interface AuthContextType {
  user: any | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (data: any) => Promise<void>;
  refreshUser: () => Promise<void>;
}

