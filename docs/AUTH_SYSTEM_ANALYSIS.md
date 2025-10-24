# Authentication System Comprehensive Analysis

## Overview

This document provides a complete analysis of the authentication system, documenting all variables, models, data structures, types, and interfaces to establish coherent communication patterns with database and audit services.

## Table of Contents

1. [Type System Overview](#1-type-system-overview)
2. [Data Models](#2-data-models)
3. [Authentication Flow](#3-authentication-flow)
4. [Security Context](#4-security-context)
5. [Database Communication](#5-database-communication)
6. [Audit Integration](#6-audit-integration)
7. [Data Transformers](#7-data-transformers)
8. [Configuration](#8-configuration)
9. [Error Handling](#9-error-handling)
10. [API Contracts](#10-api-contracts)

---

## 1. Type System Overview

### Core Authentication Types

#### User Types
```typescript
export type UserRole = 'employee' | 'manager' | 'admin' | 'super_admin';

export interface AuthUser {
  _id: string;
  email: string;
  userType: UserRole;
  firstName: string;
  lastName: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
}
```

#### Session Types
```typescript
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
```

#### Authentication Context Types
```typescript
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
```

#### Login Types
```typescript
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult extends AuthResult {
  session?: SessionInfo;
  securityFlags?: string[];
  riskScore?: number;
}
```

#### Session Validation Types
```typescript
export interface SessionValidation {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
  errorCode?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  userType: UserRole;
  sessionId?: string;
  iat?: number;
  exp?: number;
}
```

#### Security Types
```typescript
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
  riskLevel: RiskLevel;
  riskScore: number;
  flags: string[];
  recommendations: string[];
}
```

#### Device and Location Types
```typescript
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
```

#### Request Information Types
```typescript
export interface RequestInfo {
  ipAddress: string;
  userAgent: string;
  method?: string;
  endpoint?: string;
  requestId?: string;
  sessionId?: string;
  deviceFingerprint?: string;
}
```

#### Audit Context Types
```typescript
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
  riskLevel?: RiskLevel;
  isSensitive?: boolean;
  requiresReview?: boolean;
}
```

#### Configuration Types
```typescript
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
```

#### Error Types
```typescript
export interface AuthError {
  code: string;
  message: string;
  status: number;
  details?: any;
}

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_NOT_APPROVED = 'ACCOUNT_NOT_APPROVED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_REVOKED = 'SESSION_REVOKED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  RATE_LIMITED = 'RATE_LIMITED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  IP_MISMATCH = 'IP_MISMATCH',
  DEVICE_NOT_TRUSTED = 'DEVICE_NOT_TRUSTED',
  TOO_MANY_SESSIONS = 'TOO_MANY_SESSIONS',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}
```

#### Response Types
```typescript
export interface AuthResponse {
  success: boolean;
  data?: any;
  error?: string;
  errorCode?: string;
  message?: string;
}
```

#### Cache Types
```typescript
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
```

#### Metrics Types
```typescript
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
```

#### Utility Types
```typescript
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
```

### Zod Validation Schemas

```typescript
// Email validation
export const emailSchema = z.string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(255, 'Email too long');

// Password validation
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

// UUID validation
export const uuidSchema = z.string()
  .uuid('Invalid UUID format');

// IP address validation
export const ipAddressSchema = z.string()
  .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^127\.0\.0\.1$/, 'Invalid IP address format');

// User role validation
export const userRoleSchema = z.enum(['employee', 'manager', 'admin', 'super_admin']);

// Login credentials validation
export const loginCredentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

// Session validation
export const sessionValidationSchema = z.object({
  sessionId: uuidSchema,
  ipAddress: ipAddressSchema.optional()
});

// Auth options validation
export const authOptionsSchema = z.object({
  requireSession: z.boolean().optional(),
  roles: z.array(userRoleSchema).optional(),
  requireActiveStatus: z.boolean().optional()
});

// Device info validation
export const deviceInfoSchema = z.object({
  userAgent: z.string().min(1, 'User agent is required'),
  platform: z.string().optional(),
  browser: z.string().optional(),
  browserVersion: z.string().optional(),
  os: z.string().optional(),
  osVersion: z.string().optional(),
  deviceType: z.enum(['desktop', 'mobile', 'tablet']).optional(),
  screenResolution: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional()
});

// Request info validation
export const requestInfoSchema = z.object({
  ipAddress: ipAddressSchema,
  userAgent: z.string().min(1, 'User agent is required'),
  referer: z.string().optional(),
  origin: z.string().optional(),
  timestamp: z.date().optional()
});

// Session creation validation
export const sessionCreationSchema = z.object({
  userId: uuidSchema,
  deviceInfo: deviceInfoSchema,
  ipAddress: ipAddressSchema,
  screenResolution: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional()
});
```

---

## 2. Data Models

### User Model Structure

#### User Interface
```typescript
export interface IUser extends Document {
  userType: 'employee' | 'manager' | 'admin' | 'super_admin';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  post?: string;
  ciusss?: mongoose.Types.ObjectId;
  hospital?: mongoose.Types.ObjectId;
  documents?: IDocumentReference[];
  
  // Admin-specific fields
  permissions?: Permission[];
  
  // Security & Activity tracking
  loginHistory?: ILoginHistory[];
  accountLockedUntil?: Date;
  
  // Approval system fields
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  suspendedBy?: string;
  suspendedAt?: Date;
  suspensionReason?: string;
  
  // Password reset fields
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  hasPermission(permission: Permission): boolean;
  hasAnyPermission(permissions: Permission[]): boolean;
  isAdmin(): boolean;
  recordLogin(ipAddress: string, userAgent: string, success?: boolean): Promise<IUser>;
  isAccountLocked(): boolean;
}
```

#### Document Reference Interface
```typescript
export interface IDocumentReference {
  fileId: string;
  documentType: 'cv' | 'opiqPermit' | 'rcr';
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  uploadedAt: Date;
}
```

#### Login History Interface
```typescript
export interface ILoginHistory {
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  location?: string;
}
```

#### Permission Enum
```typescript
export enum Permission {
  // User management
  VIEW_ALL_USERS = 'view_all_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  APPROVE_USERS = 'approve_users',
  SUSPEND_USERS = 'suspend_users',
  
  // Transfer management
  VIEW_ALL_TRANSFERS = 'view_all_transfers',
  CANCEL_ANY_TRANSFER = 'cancel_any_transfer',
  EDIT_ANY_TRANSFER = 'edit_any_transfer',
  FORCE_COMPLETE_TRANSFER = 'force_complete_transfer',
  REASSIGN_TRANSFERS = 'reassign_transfers',
  
  // System management
  VIEW_SYSTEM_METRICS = 'view_system_metrics',
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings',
  ACCESS_AUDIT_LOGS = 'access_audit_logs',
  MANAGE_NOTIFICATIONS = 'manage_notifications',
  VIEW_ERROR_LOGS = 'view_error_logs',
  
  // Data management
  EXPORT_DATA = 'export_data',
  DELETE_DATA = 'delete_data',
  BACKUP_DATABASE = 'backup_database',
  
  // Super admin only
  MANAGE_ADMINS = 'manage_admins',
  ACCESS_SYSTEM_LOGS = 'access_system_logs',
  EXECUTE_QUERIES = 'execute_queries',
}
```

### Session Model Structure

#### Session Interface
```typescript
export interface ISession extends Document {
  sessionId: string; // UUID v4
  userId: mongoose.Types.ObjectId;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  location?: LocationInfo;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  revoked: boolean;
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
  revokedReason?: string;
  securityContext: SecurityContext;
  refreshToken: string; // Hashed refresh token
  sessionType: SessionType;
  concurrentSessions: number;
  isPrimary: boolean; // Primary session for the user
  
  // Instance methods
  isExpired(): boolean;
  isRevoked(): boolean;
  isValid(): boolean;
  updateLastAccessed(): Promise<ISession>;
  revokeSession(revokedBy?: mongoose.Types.ObjectId, reason?: string): Promise<ISession>;
  extendSession(additionalHours?: number): Promise<ISession>;
  getSecurityRisk(): 'low' | 'medium' | 'high';
  getSessionAge(): number; // in minutes
  getRemainingTime(): number; // in minutes
}
```

#### Security Context Interface
```typescript
export interface SecurityContext {
  fingerprint: string;
  riskScore: number; // 0-100, higher = more risky
  isNewDevice: boolean;
  isNewLocation: boolean;
  suspiciousActivity: boolean;
  lastSecurityCheck: Date;
  securityFlags: string[];
}
```

#### Session Type
```typescript
export type SessionType = 'web' | 'mobile' | 'api';
```

### Audit Log Model Structure

#### Audit Log Interface
```typescript
export interface IAuditLog extends Document {
  // Actor information (who performed the action)
  actorId: string;
  actorType: ActorType;
  actorEmail?: string;
  actorName?: string;
  actorRole?: string;
  
  // Action details (what was done)
  action: AuditAction;
  category: AuditCategory;
  description: string;
  
  // Target resource (what was affected)
  targetResource?: {
    type: TargetResourceType;
    id: string;
    name?: string;
    metadata?: Record<string, any>;
  };
  
  // Change tracking (for modifications)
  changes?: {
    before?: any;
    after?: any;
    fields?: string[];
    changeSummary?: string;
  };
  
  // Context and metadata
  context?: {
    reason?: string;
    affectedUsers?: number;
    bulkOperationDetails?: any;
    workflowStep?: string;
    businessJustification?: string;
    [key: string]: any;
  };
  
  // Request information
  requestInfo: {
    ipAddress: string;
    userAgent: string;
    method?: string;
    endpoint?: string;
    requestId?: string;
    sessionId?: string;
    deviceFingerprint?: string;
  };
  
  // Security and risk assessment
  securityContext: {
    riskLevel: RiskLevel;
    isSensitive: boolean;
    requiresReview: boolean;
    securityFlags?: string[];
    riskScore?: number;
    complianceFlags?: string[];
  };
  
  // Outcome and results
  outcome: 'success' | 'failure' | 'partial';
  errorMessage?: string;
  errorCode?: string;
  
  // Timing information
  timestamp: Date;
  duration?: number;
  timezone?: string;
  
  // Additional flags
  isAutomated: boolean;
  isBulkOperation: boolean;
  parentAuditId?: string;
  
  // Resolution tracking (for security events)
  resolution?: {
    resolved: boolean;
    resolvedAt?: Date;
    resolvedBy?: string;
    resolution?: string;
  };
  
  // Data retention
  retentionPolicy?: {
    expiresAt?: Date;
    retentionReason?: string;
  };
}
```

#### Audit Enums
```typescript
export enum ActorType {
  ADMIN = 'admin',
  USER = 'user',
  SYSTEM = 'system',
  API = 'api',
  BATCH = 'batch'
}

export enum AuditCategory {
  USER_MANAGEMENT = 'user_management',
  TRANSFER_MANAGEMENT = 'transfer_management',
  PATIENT_MANAGEMENT = 'patient_management',
  AUTHENTICATION = 'authentication',
  SECURITY = 'security',
  DATA_ACCESS = 'data_access',
  SYSTEM_CONFIGURATION = 'system_configuration',
  NOTIFICATION = 'notification',
  COMMUNICATION = 'communication',
  FILE_OPERATION = 'file_operation',
  API_ACCESS = 'api_access'
}

export enum AuditAction {
  // User Management
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_SUSPENDED = 'user_suspended',
  USER_ACTIVATED = 'user_activated',
  USER_APPROVED = 'user_approved',
  USER_REJECTED = 'user_rejected',
  USER_PROFILE_VIEWED = 'user_profile_viewed',
  USER_DATA_EXPORTED = 'user_data_exported',
  
  // Transfer Management
  TRANSFER_CREATED = 'transfer_created',
  TRANSFER_UPDATED = 'transfer_updated',
  TRANSFER_DELETED = 'transfer_deleted',
  TRANSFER_CANCELLED = 'transfer_cancelled',
  TRANSFER_APPROVED = 'transfer_approved',
  TRANSFER_REJECTED = 'transfer_rejected',
  TRANSFER_COMPLETED = 'transfer_completed',
  TRANSFER_REASSIGNED = 'transfer_reassigned',
  BULK_TRANSFER_OPERATION = 'bulk_transfer_operation',
  
  // Authentication & Security
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  PERMISSION_CHANGED = 'permission_changed',
  SESSION_CREATED = 'session_created',
  SESSION_REVOKED = 'session_revoked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  
  // Data Access
  DATA_VIEWED = 'data_viewed',
  DATA_EXPORTED = 'data_exported',
  DATA_IMPORTED = 'data_imported',
  REPORT_GENERATED = 'report_generated',
  BULK_DATA_ACCESS = 'bulk_data_access',
  
  // System Operations
  SETTINGS_UPDATED = 'settings_updated',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  BACKUP_CREATED = 'backup_created',
  BACKUP_RESTORED = 'backup_restored',
  SYSTEM_ALERT = 'system_alert',
  
  // Patient Management
  PATIENT_CREATED = 'patient_created',
  PATIENT_UPDATED = 'patient_updated',
  PATIENT_DELETED = 'patient_deleted',
  PATIENT_VIEWED = 'patient_viewed',
  PATIENT_MERGED = 'patient_merged',
  
  // Notifications
  NOTIFICATION_SENT = 'notification_sent',
  NOTIFICATION_BROADCAST = 'notification_broadcast',
  EMAIL_SENT = 'email_sent',
  EMAIL_FAILED = 'email_failed',
  SMS_SENT = 'sms_sent',
  SMS_FAILED = 'sms_failed',
  
  // File Operations
  FILE_UPLOADED = 'file_uploaded',
  FILE_DOWNLOADED = 'file_downloaded',
  FILE_DELETED = 'file_deleted',
  
  // API Access
  API_ENDPOINT_ACCESSED = 'api_endpoint_accessed',
  API_RATE_LIMITED = 'api_rate_limited',
  API_ERROR = 'api_error'
}

export enum TargetResourceType {
  USER = 'user',
  TRANSFER = 'transfer',
  PATIENT = 'patient',
  NOTIFICATION = 'notification',
  SYSTEM = 'system',
  SETTING = 'setting',
  REPORT = 'report',
  FILE = 'file',
  API = 'api',
  SESSION = 'session'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}
```

---

## 3. Authentication Flow

### Login Process Variables

#### Input Variables
```typescript
// Login credentials from request
const credentials: LoginCredentials = {
  email: string; // sanitized and lowercased
  password: string; // plain text for verification
};

// Request context
const request: NextRequest; // Next.js request object
const ipAddress: string; // extracted from request headers
const userAgent: string; // from request headers
```

#### Processing Variables
```typescript
// Rate limiting
const rateLimitKey: string = `login:${email}`;
const rateLimitResult: RateLimitResult;

// User lookup
const user: IUser; // from database
const isPasswordValid: boolean; // bcrypt comparison result

// Session creation
const deviceInfo: DeviceInfo; // parsed from user agent
const fingerprint: string; // device fingerprint
const sessionId: string; // UUID v4
const refreshToken: string; // UUID v4, hashed
const session: ISession; // new session document

// Security assessment
const securityCheck: SecurityCheck;
const riskAssessment: RiskAssessment;
const suspiciousFlags: string[];
const riskScore: number;
```

#### Output Variables
```typescript
// Login result
const loginResult: LoginResult = {
  success: boolean;
  token?: string; // JWT token
  user?: AuthUser; // transformed user data
  session?: SessionInfo; // session information
  securityFlags?: string[];
  riskScore?: number;
  error?: string;
  errorCode?: string;
};
```

### Session Creation Variables

#### Session Creation Input
```typescript
const userId: string; // user ID
const deviceInfo: DeviceInfo; // parsed device information
const ipAddress: string; // client IP
const request?: NextRequest; // optional request object
```

#### Session Processing Variables
```typescript
// Existing sessions check
const existingSessions: ISession[]; // current active sessions
const sessionCount: number; // count of active sessions

// Device fingerprinting
const fingerprint: string; // generated device fingerprint
const isNewDevice: boolean; // device recognition
const isNewLocation: boolean; // location recognition

// Security assessment
const suspiciousCheck: SecurityCheck;
const riskScore: number; // calculated risk score
const securityFlags: string[]; // security flags

// Session document creation
const sessionId: string; // UUID v4
const refreshToken: string; // UUID v4
const hashedRefreshToken: string; // bcrypt hashed
const expiresAt: Date; // calculated expiration
const securityContext: SecurityContext; // security context object
```

#### Session Output
```typescript
const sessionResult: LoginResult = {
  success: boolean;
  token: string; // JWT token
  user: AuthUser; // transformed user
  session: SessionInfo; // session information
  securityFlags: string[];
  riskScore: number;
};
```

### Session Validation Variables

#### Validation Input
```typescript
const sessionId: string; // session identifier
const ipAddress?: string; // optional IP for binding check
```

#### Validation Processing
```typescript
// Session lookup
const session: ISession; // from database
const user: IUser; // associated user

// Validation checks
const isExpired: boolean; // session expiration check
const isRevoked: boolean; // session revocation check
const ipMatch: boolean; // IP binding validation
const userActive: boolean; // user status check
```

#### Validation Output
```typescript
const validationResult: SessionValidation = {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
  errorCode?: string;
};
```

### Token Generation Variables

#### JWT Token Creation
```typescript
const tokenPayload: TokenPayload = {
  userId: string;
  email: string;
  userType: UserRole;
  sessionId: string;
  iat: number; // issued at
  exp: number; // expiration
};

const jwtToken: string; // signed JWT token
const tokenExpiration: string = '24h'; // token lifetime
```

---

## 4. Security Context

### Risk Assessment Variables

#### Risk Calculation
```typescript
const baseRiskScore: number = 10; // base risk score
const newDeviceRisk: number = 20; // new device penalty
const newLocationRisk: number = 15; // new location penalty
const suspiciousFlagRisk: number = 10; // per flag penalty
const adminRisk: number = 10; // admin user penalty
const concurrentSessionRisk: number = 10; // multiple sessions penalty

const totalRiskScore: number; // calculated total
const riskLevel: RiskLevel; // LOW | MEDIUM | HIGH | CRITICAL
```

#### Security Flags
```typescript
const securityFlags: string[] = [
  'multiple_failed_logins',
  'unusual_ip_address',
  'new_device',
  'new_location',
  'suspicious_activity',
  'high_risk_session'
];
```

### Device Fingerprinting Variables

#### Device Information Extraction
```typescript
const userAgent: string; // raw user agent string
const sanitizedUA: string; // sanitized user agent
const platform: string; // Windows | macOS | Linux | Unknown
const browser: string; // Chrome | Firefox | Safari | Unknown
const browserVersion: string; // browser version
const os: string; // operating system
const osVersion: string; // OS version
const deviceType: 'desktop' | 'mobile' | 'tablet';
const screenResolution?: string; // screen resolution
const timezone: string; // timezone
const language: string; // language
```

#### Fingerprint Generation
```typescript
const fingerprintComponents: string[] = [
  userAgent,
  ipAddress,
  screenResolution || 'unknown',
  timezoneOffset.toString()
];

const deviceFingerprint: string; // joined components
```

### Rate Limiting Variables

#### Rate Limit Storage
```typescript
const rateLimitStore: Map<string, { count: number; resetTime: number }>;
const failedAttempts: Map<string, { count: number; lastAttempt: number }>;
```

#### Rate Limit Configuration
```typescript
const rateLimitConfig = {
  maxLoginAttempts: 5,
  loginWindowMs: 15 * 60 * 1000, // 15 minutes
  maxSessionsPerUser: 3,
  suspiciousActivityThreshold: 3
};
```

#### Rate Limit Check Variables
```typescript
const rateLimitKey: string; // identifier for rate limiting
const currentAttempts: number; // current attempt count
const resetTime: number; // when counter resets
const isAllowed: boolean; // rate limit result
const remainingAttempts: number; // remaining attempts
const retryAfter: number; // seconds until retry allowed
```

### Suspicious Activity Detection

#### Activity Check Variables
```typescript
const userId: string; // user identifier
const ipAddress: string; // request IP
const userAgent: string; // user agent string
const recentSessions: ISession[]; // recent session history
const hasRecentIp: boolean; // IP recognition
const suspiciousFlags: string[]; // detected flags
const riskScore: number; // calculated risk
```

#### Security Recommendations
```typescript
const recommendations: string[] = [
  'Enable 2FA',
  'Review login history',
  'Monitor account activity',
  'Contact administrator'
];
```

---

## 5. Database Communication

### DatabaseService Method Signatures

#### Connection Management
```typescript
class DatabaseService {
  static async connect(): Promise<Connection>;
  static async disconnect(): Promise<void>;
  static async reconnect(): Promise<Connection>;
  static isConnected(): boolean;
  static getConnection(): Connection | null;
}
```

#### CRUD Operations
```typescript
// Create operations
static async create<T>(model: Model<T>, data: any): Promise<T>;
static async createMany<T>(model: Model<T>, data: any[]): Promise<T[]>;

// Read operations
static async findById<T>(model: Model<T>, id: string): Promise<T | null>;
static async findOne<T>(model: Model<T>, query: any): Promise<T | null>;
static async findMany<T>(model: Model<T>, query: any, options?: QueryOptions): Promise<T[]>;
static async count<T>(model: Model<T>, query: any): Promise<number>;

// Update operations
static async updateOne<T>(model: Model<T>, query: any, update: any): Promise<UpdateResult>;
static async updateMany<T>(model: Model<T>, query: any, update: any): Promise<UpdateResult>;
static async findByIdAndUpdate<T>(model: Model<T>, id: string, update: any): Promise<T | null>;

// Delete operations
static async deleteOne<T>(model: Model<T>, query: any): Promise<DeleteResult>;
static async deleteMany<T>(model: Model<T>, query: any): Promise<DeleteResult>;
static async findByIdAndDelete<T>(model: Model<T>, id: string): Promise<T | null>;
```

#### Aggregation Operations
```typescript
static async aggregate<T>(model: Model<T>, pipeline: any[]): Promise<any[]>;
static async aggregateWithOptions<T>(model: Model<T>, pipeline: any[], options: AggregationOptions): Promise<any[]>;
```

#### Transaction Operations
```typescript
static async withTransaction<T>(callback: TransactionCallback<T>): Promise<T>;
static async startTransaction(): Promise<ClientSession>;
static async commitTransaction(session: ClientSession): Promise<void>;
static async abortTransaction(session: ClientSession): Promise<void>;
```

### Query Structures and Filters

#### User Queries
```typescript
// Find user by email
const userQuery = { email: email.toLowerCase() };

// Find users by role
const roleQuery = { userType: 'admin' };

// Find users by status
const statusQuery = { status: 'approved' };

// Find users with permissions
const permissionQuery = { permissions: { $in: ['view_all_users'] } };

// Complex user query
const complexUserQuery = {
  userType: { $in: ['admin', 'super_admin'] },
  status: 'approved',
  createdAt: { $gte: startDate, $lte: endDate }
};
```

#### Session Queries
```typescript
// Find active sessions
const activeSessionQuery = {
  isActive: true,
  revoked: false,
  expiresAt: { $gt: new Date() }
};

// Find sessions by user
const userSessionQuery = {
  userId: userId,
  isActive: true,
  revoked: false
};

// Find sessions by IP
const ipSessionQuery = {
  ipAddress: ipAddress,
  createdAt: { $gte: recentDate }
};

// Find expired sessions
const expiredSessionQuery = {
  expiresAt: { $lte: new Date() }
};
```

#### Audit Log Queries
```typescript
// Find audit logs by actor
const actorQuery = { actorId: userId };

// Find audit logs by action
const actionQuery = { action: 'LOGIN_SUCCESS' };

// Find audit logs by category
const categoryQuery = { category: 'AUTHENTICATION' };

// Find high-risk activities
const highRiskQuery = {
  'securityContext.riskLevel': { $in: ['HIGH', 'CRITICAL'] }
};

// Find recent activity
const recentActivityQuery = {
  timestamp: { $gte: recentDate },
  actorId: userId
};
```

### Transaction Patterns

#### User Creation Transaction
```typescript
const userCreationTransaction = async (userData: any) => {
  return await DatabaseService.withTransaction(async (session) => {
    // Create user
    const user = await DatabaseService.create(User, userData, { session });
    
    // Log user creation
    await AuditService.logUserAction({
      actorId: 'system',
      actorType: ActorType.SYSTEM,
      action: AuditAction.USER_CREATED,
      description: `User created: ${user.email}`,
      targetResourceId: user._id.toString(),
      targetResourceType: TargetResourceType.USER,
      success: true
    });
    
    return user;
  });
};
```

#### Session Management Transaction
```typescript
const sessionManagementTransaction = async (sessionData: any) => {
  return await DatabaseService.withTransaction(async (session) => {
    // Create session
    const newSession = await DatabaseService.create(Session, sessionData, { session });
    
    // Update user login history
    await DatabaseService.updateOne(
      User,
      { _id: sessionData.userId },
      { $push: { loginHistory: loginEntry } },
      { session }
    );
    
    // Log session creation
    await AuditService.logAuthAction({
      actorId: sessionData.userId,
      actorType: ActorType.USER,
      action: AuditAction.SESSION_CREATED,
      description: `Session created: ${newSession.sessionId}`,
      targetResourceId: newSession.sessionId,
      targetResourceType: TargetResourceType.SESSION,
      success: true
    });
    
    return newSession;
  });
};
```

---

## 6. Audit Integration

### AuditService Method Signatures

#### Core Audit Logging
```typescript
class AuditService {
  // Core audit logging method
  private static async logAudit(data: AuditLogData): Promise<void>;
  
  // User management actions
  static async logUserAction(context: UserAuditContext): Promise<void>;
  
  // Transfer management actions
  static async logTransferAction(context: TransferAuditContext): Promise<void>;
  
  // Patient management actions
  static async logPatientAction(context: PatientAuditContext): Promise<void>;
  
  // Authentication actions
  static async logAuthAction(context: AuthAuditContext): Promise<void>;
  
  // Communication actions
  static async logCommunication(context: CommunicationAuditContext): Promise<void>;
  
  // File operations
  static async logFileOperation(context: FileAuditContext): Promise<void>;
  
  // Data access actions
  static async logDataAccess(context: DataAccessAuditContext): Promise<void>;
  
  // System events
  static async logSystemEvent(context: SystemAuditContext): Promise<void>;
}
```

#### Utility Methods
```typescript
// Extract request information
static extractRequestInfo(request: NextRequest): RequestInfo;

// Assess risk level
static assessRiskLevel(action: AuditAction, metadata?: any): RiskLevel;

// Determine audit category
static determineCategory(action: AuditAction): AuditCategory;
```

### Audit Context Types

#### Base Audit Context
```typescript
export interface BaseAuditContext {
  actorId: string;
  actorType: ActorType;
  actorEmail?: string;
  actorName?: string;
  actorRole?: string;
  action: AuditAction;
  description: string;
  targetResourceId?: string;
  targetResourceType?: TargetResourceType;
  targetResourceName?: string;
  metadata?: Record<string, any>;
  reason?: string;
  details?: Record<string, any>;
  riskLevel?: RiskLevel;
  isSensitive?: boolean;
  requiresReview?: boolean;
  requestInfo?: RequestInfo;
  success?: boolean;
  errorMessage?: string;
  errorCode?: string;
}
```

#### User Audit Context
```typescript
export interface UserAuditContext extends BaseAuditContext {
  action: 
    | AuditAction.USER_CREATED
    | AuditAction.USER_UPDATED
    | AuditAction.USER_DELETED
    | AuditAction.USER_SUSPENDED
    | AuditAction.USER_ACTIVATED
    | AuditAction.USER_APPROVED
    | AuditAction.USER_REJECTED
    | AuditAction.USER_PROFILE_VIEWED
    | AuditAction.USER_DATA_EXPORTED;
  
  targetResourceType: TargetResourceType.USER;
  targetResourceId: string;
  targetResourceName?: string;
  
  metadata?: {
    userType?: string;
    status?: string;
    permissions?: string[];
    userEmail?: string;
    changes?: {
      before?: any;
      after?: any;
      fields?: string[];
    };
  };
}
```

#### Auth Audit Context
```typescript
export interface AuthAuditContext extends BaseAuditContext {
  action:
    | AuditAction.LOGIN_SUCCESS
    | AuditAction.LOGIN_FAILED
    | AuditAction.LOGOUT
    | AuditAction.PASSWORD_CHANGED
    | AuditAction.PASSWORD_RESET
    | AuditAction.ACCOUNT_LOCKED
    | AuditAction.ACCOUNT_UNLOCKED
    | AuditAction.PERMISSION_CHANGED
    | AuditAction.SESSION_CREATED
    | AuditAction.SESSION_REVOKED
    | AuditAction.SUSPICIOUS_ACTIVITY;
  
  targetResourceType?: TargetResourceType.USER | TargetResourceType.SESSION;
  targetResourceId?: string;
  
  metadata?: {
    loginAttempts?: number;
    lockoutReason?: string;
    sessionDuration?: number;
    suspiciousActivityType?: string;
    deviceInfo?: string;
    sessionId?: string;
    lastLogin?: any;
  };
}
```

### Event Logging Patterns

#### Login Success Logging
```typescript
await AuditService.logAuthAction({
  actorId: user._id.toString(),
  actorType: ActorType.USER,
  actorEmail: maskEmail(user.email),
  actorName: `${user.firstName} ${user.lastName}`,
  actorRole: user.userType,
  action: AuditAction.LOGIN_SUCCESS,
  description: `Successful login for ${maskEmail(user.email)}`,
  targetResourceId: user._id.toString(),
  requestInfo: {
    ipAddress: ipAddress,
    userAgent: userAgent,
    method: 'POST',
    endpoint: '/api/auth/login'
  },
  success: true
});
```

#### Login Failure Logging
```typescript
await AuditService.logAuthAction({
  actorId: user._id.toString(),
  actorType: ActorType.USER,
  actorEmail: maskEmail(user.email),
  actorName: `${user.firstName} ${user.lastName}`,
  actorRole: user.userType,
  action: AuditAction.LOGIN_FAILED,
  description: `Failed login attempt for ${maskEmail(user.email)}`,
  targetResourceId: user._id.toString(),
  requestInfo: {
    ipAddress: ipAddress,
    userAgent: userAgent,
    method: 'POST',
    endpoint: '/api/auth/login'
  },
  success: false,
  errorMessage: 'Invalid password',
  riskLevel: RiskLevel.MEDIUM,
  isSensitive: true,
  requiresReview: false
});
```

#### Session Creation Logging
```typescript
await AuditService.logAuthAction({
  actorId: userId,
  actorType: ActorType.USER,
  action: AuditAction.SESSION_CREATED,
  description: `Session created: ${sessionId}`,
  targetResourceId: sessionId,
  targetResourceType: TargetResourceType.SESSION,
  metadata: {
    sessionId: sessionId,
    deviceInfo: deviceInfo.userAgent,
    ipAddress: ipAddress,
    riskScore: riskScore,
    securityFlags: securityFlags
  },
  success: true
});
```

#### Suspicious Activity Logging
```typescript
await AuditService.logAuthAction({
  actorId: userId,
  actorType: ActorType.SYSTEM,
  action: AuditAction.SUSPICIOUS_ACTIVITY,
  description: `Suspicious activity detected: ${activityType}`,
  targetResourceId: userId,
  targetResourceType: TargetResourceType.USER,
  metadata: {
    suspiciousActivityType: activityType,
    riskScore: riskScore,
    securityFlags: securityFlags,
    deviceInfo: deviceInfo.userAgent,
    ipAddress: ipAddress
  },
  success: false,
  riskLevel: RiskLevel.HIGH,
  isSensitive: true,
  requiresReview: true
});
```

---

## 7. Data Transformers

### User Transformation Functions

#### Basic User Transformation
```typescript
export function transformUser(user: any, options: TransformOptions = {}): any {
  const {
    includePrivate = false,
    excludeFields = ['password', 'refreshToken', 'loginAttempts']
  } = options;

  const userObj = user.toObject ? user.toObject() : user;

  if (!includePrivate) {
    excludeFields.forEach(field => {
      delete userObj[field];
    });
  }

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

  return userObj;
}
```

#### Public User Transformation
```typescript
export function transformUserPublic(user: any): any {
  return transformUser(user, {
    includePrivate: false,
    fields: ['id', 'email', 'firstName', 'lastName', 'userType', 'status', 'createdAt']
  });
}
```

#### Auth-Specific User Transformation
```typescript
export function transformUserForAuth(user: any): any {
  return pickFields(user, [
    '_id', 'email', 'userType', 'firstName', 
    'lastName', 'status', 'permissions'
  ]);
}
```

#### User Sanitization for Logging
```typescript
export function sanitizeUserForLogging(user: any): any {
  return omitFields(user, [
    'password', 'loginHistory', 'failedAttempts', 
    'lastLoginAttempt', 'passwordResetToken', 'emailVerificationToken'
  ]);
}
```

### Session Transformation Functions

#### Basic Session Transformation
```typescript
export function transformSession(session: any, options: TransformOptions = {}): any {
  const sessionObj = session.toObject ? session.toObject() : session;

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

  if (!options.includePrivate) {
    delete sessionObj.sessionToken;
    delete sessionObj.refreshToken;
  }

  return sessionObj;
}
```

#### Auth-Specific Session Transformation
```typescript
export function transformSessionForAuth(session: any): any {
  return {
    ...pickFields(session, [
      'sessionId', 'userId', 'deviceInfo', 
      'ipAddress', 'createdAt', 'lastActivity'
    ]),
    isPrimary: session.isPrimary || false
  };
}
```

#### Session for Dashboard
```typescript
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
```

#### Session for Audit
```typescript
export function transformSessionForAudit(session: any): any {
  return pickFields(session, [
    'sessionId', 'userId', 'deviceInfo.deviceType', 
    'deviceInfo.browser', 'ipAddress', 'createdAt', 
    'lastActivity', 'isActive'
  ]);
}
```

### Sanitization Utilities

#### General Data Sanitization
```typescript
export function sanitizeForPublicAPI(data: any, sensitiveFields: string[] = []): any {
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

    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = sanitizeForPublicAPI(sanitized[key], sensitiveFields);
      }
    });

    return sanitized;
  }

  return data;
}
```

#### Field Selection Utilities
```typescript
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
```

### Object ID Helpers

```typescript
export function objectIdToString(id: any): string {
  if (!id) return '';
  
  if (typeof id === 'string') return id;
  if (id.toString) return id.toString();
  
  return String(id);
}

export function stringToObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}
```

### Date Helpers

```typescript
export function dateToISOString(date: any): string | null {
  if (!date) return null;
  
  if (typeof date === 'string') return date;
  if (date instanceof Date) return date.toISOString();
  if (date.toISOString) return date.toISOString();
  
  return null;
}

export function convertDatesToISO(obj: any, dateFields: string[] = []): any {
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
    if (obj[field]) {
      obj[field] = dateToISOString(obj[field]);
    }
  });

  return obj;
}
```

---

## 8. Configuration

### Environment Variables

#### Required Environment Variables
```typescript
// Database
MONGODB_URI: string; // MongoDB connection string
DATABASE_POOL_SIZE: string; // Connection pool size (default: '10')
DATABASE_MONITORING: string; // Enable monitoring ('true' | 'false')
DATABASE_SLOW_QUERY_THRESHOLD: string; // Slow query threshold in ms (default: '1000')

// JWT
JWT_SECRET_KEY: string; // JWT signing secret

// Application
NODE_ENV: 'development' | 'production'; // Environment mode
```

#### Optional Environment Variables
```typescript
// Database monitoring
DATABASE_MONITORING: 'true' | 'false'; // Enable query monitoring
DATABASE_SLOW_QUERY_THRESHOLD: string; // Slow query threshold (default: '1000')

// Security
AUTH_SESSION_TIMEOUT: string; // Session timeout in minutes
AUTH_MAX_SESSIONS: string; // Maximum sessions per user
AUTH_RATE_LIMIT_WINDOW: string; // Rate limit window in minutes
```

### Auth Configuration Constants

#### Default Configuration
```typescript
const AUTH_CONFIG: AuthConfig = {
  // Rate limiting
  maxLoginAttempts: 5,
  loginWindowMs: 15 * 60 * 1000, // 15 minutes
  maxSessionsPerUser: 3,
  
  // Session security
  sessionTimeoutMinutes: 8 * 60, // 8 hours
  requireIpBinding: true,
  suspiciousActivityThreshold: 3,
  
  // Device security
  requireDeviceVerification: true,
  maxNewDevicesPerDay: 2,
  
  // JWT settings
  tokenExpirationHours: 24,
  refreshTokenExpirationDays: 7,
  
  // Security thresholds
  highRiskThreshold: 70,
  mediumRiskThreshold: 40
};
```

#### Database Configuration
```typescript
const DEFAULT_CONFIG: DatabaseConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/patients-management',
  options: {
    bufferCommands: false,
    maxPoolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    retryReads: true,
    readPreference: 'primary'
  },
  monitoring: {
    enabled: process.env.DATABASE_MONITORING === 'true',
    slowQueryThreshold: parseInt(process.env.DATABASE_SLOW_QUERY_THRESHOLD || '1000'),
    maxQueryHistory: 1000,
    trackConnectionPool: true,
    trackMemoryUsage: true,
    logLevel: 'info'
  }
};
```

### Security Thresholds

#### Risk Level Thresholds
```typescript
const RISK_THRESHOLDS = {
  LOW: 0,
  MEDIUM: 40,
  HIGH: 70,
  CRITICAL: 90
};

const SECURITY_FLAGS = {
  MULTIPLE_FAILED_LOGINS: 'multiple_failed_logins',
  UNUSUAL_IP: 'unusual_ip_address',
  NEW_DEVICE: 'new_device',
  NEW_LOCATION: 'new_location',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  HIGH_RISK_SESSION: 'high_risk_session'
};
```

#### Rate Limiting Configuration
```typescript
const RATE_LIMIT_CONFIG = {
  LOGIN_ATTEMPTS: {
    max: 5,
    window: 15 * 60 * 1000, // 15 minutes
    lockout: 15 * 60 * 1000 // 15 minutes
  },
  SESSIONS: {
    maxPerUser: 3,
    cleanupInterval: 60 * 60 * 1000 // 1 hour
  },
  API_REQUESTS: {
    max: 100,
    window: 60 * 1000 // 1 minute
  }
};
```

---

## 9. Error Handling

### Error Types and Codes

#### Auth Error Codes
```typescript
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_NOT_APPROVED = 'ACCOUNT_NOT_APPROVED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_REVOKED = 'SESSION_REVOKED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  RATE_LIMITED = 'RATE_LIMITED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  IP_MISMATCH = 'IP_MISMATCH',
  DEVICE_NOT_TRUSTED = 'DEVICE_NOT_TRUSTED',
  TOO_MANY_SESSIONS = 'TOO_MANY_SESSIONS',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}
```

#### Error Interface
```typescript
export interface AuthError {
  code: string;
  message: string;
  status: number;
  details?: any;
}
```

#### Custom Error Classes
```typescript
class AppError extends Error {
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

class AuthError extends AppError {
  constructor(message: string, status: number, code: AuthErrorCode) {
    super(message, status, code);
  }
}

class RateLimitError extends AppError {
  constructor(message: string) {
    super(message, 429, 'RATE_LIMITED');
  }
}

class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}
```

### Error Transformation Patterns

#### Database Error Transformation
```typescript
export function transformDatabaseError(error: any): AppError {
  if (error.name === 'ValidationError') {
    return new ValidationError('Validation failed', error.errors);
  }
  
  if (error.name === 'CastError') {
    return new ValidationError('Invalid data format');
  }
  
  if (error.code === 11000) {
    return new ValidationError('Duplicate entry', { field: error.keyPattern });
  }
  
  if (error.name === 'MongoNetworkError') {
    return new AppError('Database connection failed', 503, 'DATABASE_ERROR');
  }
  
  return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
}
```

#### Auth Error Transformation
```typescript
export function transformAuthError(error: any): AppError {
  if (error instanceof AuthError) {
    return error;
  }
  
  if (error.message.includes('Invalid credentials')) {
    return new AuthError('Invalid credentials', 401, AuthErrorCode.INVALID_CREDENTIALS);
  }
  
  if (error.message.includes('Account locked')) {
    return new AuthError('Account temporarily locked', 423, AuthErrorCode.ACCOUNT_LOCKED);
  }
  
  if (error.message.includes('Session expired')) {
    return new AuthError('Session expired', 401, AuthErrorCode.SESSION_EXPIRED);
  }
  
  if (error.message.includes('Rate limit')) {
    return new RateLimitError('Too many requests');
  }
  
  return new AppError('Authentication failed', 500, AuthErrorCode.INTERNAL_ERROR);
}
```

### Client-Facing Error Formats

#### Standard Error Response
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}
```

#### Error Response Examples
```typescript
// Login failure
{
  "success": false,
  "error": "Invalid credentials",
  "code": "INVALID_CREDENTIALS",
  "message": "Email or password is incorrect",
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// Account locked
{
  "success": false,
  "error": "Account locked",
  "code": "ACCOUNT_LOCKED",
  "message": "Account temporarily locked due to multiple failed attempts",
  "details": {
    "retryAfter": 900,
    "attempts": 5
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// Session expired
{
  "success": false,
  "error": "Session expired",
  "code": "SESSION_EXPIRED",
  "message": "Your session has expired. Please log in again.",
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// Rate limited
{
  "success": false,
  "error": "Rate limited",
  "code": "RATE_LIMITED",
  "message": "Too many requests. Please try again later.",
  "details": {
    "retryAfter": 60,
    "remaining": 0
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Error Logging Context
```typescript
interface ErrorLogContext {
  operation: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  error: Error;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}
```

---

## 10. API Contracts

### Request/Response Structures

#### Login Request
```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

#### Login Response
```typescript
interface LoginResponse {
  success: boolean;
  message: string;
  user?: {
    _id: string;
    email: string;
    userType: UserRole;
    firstName: string;
    lastName: string;
    status: string;
  };
  session?: {
    sessionId: string;
    expiresAt: string;
    lastAccessedAt: string;
    securityRisk: 'low' | 'medium' | 'high';
    isNewDevice: boolean;
    isNewLocation: boolean;
    sessionAge: number;
    remainingTime: number;
    isPrimary: boolean;
  };
  securityFlags?: string[];
  riskScore?: number;
  error?: string;
  errorCode?: string;
}
```

#### Logout Request
```typescript
// No request body required
```

#### Logout Response
```typescript
interface LogoutResponse {
  success: boolean;
  message: string;
}
```

#### Verify Request
```typescript
// No request body required
// Uses cookie-based authentication
```

#### Verify Response
```typescript
interface VerifyResponse {
  success: boolean;
  user?: {
    _id: string;
    email: string;
    userType: UserRole;
    firstName: string;
    lastName: string;
    status: string;
  };
  session?: {
    sessionId: string;
    expiresAt: string;
    lastAccessedAt: string;
    securityRisk: 'low' | 'medium' | 'high';
    isNewDevice: boolean;
    isNewLocation: boolean;
    sessionAge: number;
    remainingTime: number;
    isPrimary: boolean;
  };
  error?: string;
  code?: string;
}
```

### Cookie Management

#### Authentication Cookie
```typescript
interface AuthCookie {
  name: 'auth-token';
  value: string; // JWT token
  options: {
    httpOnly: true;
    secure: boolean; // true in production
    sameSite: 'lax';
    maxAge: number; // 24 hours in seconds
    path: '/';
    domain?: string; // undefined in production
  };
}
```

#### Cookie Setting
```typescript
response.cookies.set('auth-token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60, // 24 hours
  path: '/',
  domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
});
```

#### Cookie Clearing
```typescript
response.cookies.delete('auth-token');
```

### Header Requirements

#### Request Headers
```typescript
interface AuthHeaders {
  'user-agent': string; // Required for device fingerprinting
  'x-forwarded-for'?: string; // For IP extraction
  'x-real-ip'?: string; // Alternative IP header
  'x-remote-addr'?: string; // Alternative IP header
  'x-request-id'?: string; // Optional request correlation
  'x-session-id'?: string; // Optional session correlation
  'x-device-fingerprint'?: string; // Optional device fingerprint
}
```

#### Response Headers
```typescript
interface AuthResponseHeaders {
  'set-cookie': string; // Authentication cookie
  'content-type': 'application/json';
  'cache-control': 'no-cache, no-store, must-revalidate';
}
```

### Middleware Integration

#### Middleware Request Processing
```typescript
interface MiddlewareRequest {
  pathname: string;
  cookies: {
    'auth-token'?: string;
  };
  headers: {
    'user-agent'?: string;
    'x-forwarded-for'?: string;
    'x-real-ip'?: string;
  };
}
```

#### Middleware Response
```typescript
interface MiddlewareResponse {
  type: 'redirect' | 'next' | 'response';
  url?: string; // For redirects
  status?: number; // For responses
  headers?: Record<string, string>;
}
```

### API Route Patterns

#### Protected Route Pattern
```typescript
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const authContext = await AuthService.requireAuth(request, {
      requireSession: true,
      roles: ['admin', 'super_admin'] // Optional role requirement
    });
    
    // Route logic here
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    // Error handling
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        code: error.code
      },
      { status: error.status || 500 }
    );
  }
}
```

#### Public Route Pattern
```typescript
export async function POST(request: NextRequest) {
  try {
    // No authentication required
    const body = await request.json();
    
    // Route logic here
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
```

---

## Summary

This comprehensive analysis documents all variables, models, data structures, types, and interfaces used in the authentication system. The document serves as a single source of truth for understanding how the auth system communicates with database and audit services, ensuring coherent data flow and maintaining system consistency.

### Key Integration Points

1. **Database Service**: All CRUD operations, transactions, and query patterns
2. **Audit Service**: Comprehensive logging for all authentication events
3. **Data Transformers**: Consistent data formatting and sanitization
4. **Error Handling**: Standardized error codes and client responses
5. **Security Context**: Risk assessment and device fingerprinting
6. **Session Management**: Complete session lifecycle with security monitoring

### Communication Patterns

- **AuthService ↔ DatabaseService**: User and session CRUD operations
- **AuthService ↔ AuditService**: Authentication event logging
- **AuthService ↔ Transformers**: Data sanitization and formatting
- **Middleware ↔ AuthService**: Request authentication and authorization
- **API Routes ↔ AuthService**: Authentication flow implementation

This analysis enables developers to understand the complete authentication system architecture and implement consistent communication patterns across all services.
