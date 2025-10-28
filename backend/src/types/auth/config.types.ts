/**
 * Configuration Types
 * 
 * Configuration types for authentication system.
 */

import { TokenConfig } from './token.types';

// ===== AUTHENTICATION CONFIGURATION =====

/**
 * Authentication Configuration
 * Main configuration for the authentication system
 */
export interface AuthConfig {
  // Token settings - DUAL TOKEN SYSTEM
  accessTokenExpirationMinutes: number;        // 15 minutes
  refreshTokenExpirationDays: number;         // 7 days
  refreshTokenRotationEnabled: boolean;       // Rotate on every use
  
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
  
  // Security thresholds
  highRiskThreshold: number;
  mediumRiskThreshold: number;
  
  // Token configuration
  tokenConfig: TokenConfig;
  
  // Cleanup settings
  expiredSessionCleanupDays: number;
  revokedSessionCleanupDays: number;
  
  // Monitoring settings
  enableAuditLogging: boolean;
  enableSecurityMonitoring: boolean;
  enablePerformanceTracking: boolean;
}

// ===== ENVIRONMENT CONFIGURATION =====

/**
 * Environment Configuration
 * Environment-specific settings
 */
export interface EnvironmentConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  host: string;
  baseUrl: string;
  
  // Database
  mongodbUri: string;
  mongodbOptions: {
    maxPoolSize: number;
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
    bufferMaxEntries: number;
    bufferCommands: boolean;
  };
  
  // Security
  jwtSecret: string;
  jwtAlgorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  bcryptRounds: number;
  
  // CORS
  corsOrigin: string[];
  corsCredentials: boolean;
  
  // Rate limiting
  rateLimitEnabled: boolean;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  
  // Logging
  logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  logFormat: 'json' | 'text';
  enableConsoleLogging: boolean;
  enableFileLogging: boolean;
  logFilePath: string;
  
  // Monitoring
  enableMetrics: boolean;
  metricsPort: number;
  enableHealthChecks: boolean;
}

// ===== FEATURE CONFIGURATION =====

/**
 * Feature Configuration
 * Feature flags and toggles
 */
export interface FeatureConfig {
  // Authentication features
  enableSignup: boolean;
  enablePasswordReset: boolean;
  enableTwoFactor: boolean;
  enableSocialLogin: boolean;
  
  // Security features
  enableDeviceFingerprinting: boolean;
  enableLocationTracking: boolean;
  enableSuspiciousActivityDetection: boolean;
  enableAccountLockout: boolean;
  
  // Session features
  enableSessionManagement: boolean;
  enableConcurrentSessionLimit: boolean;
  enableSessionTimeout: boolean;
  enableSessionRevocation: boolean;
  
  // Token features
  enableTokenRotation: boolean;
  enableTokenFamilyTracking: boolean;
  enableTokenReuseDetection: boolean;
  enableTokenCleanup: boolean;
  
  // Monitoring features
  enableAuditLogging: boolean;
  enableSecurityMonitoring: boolean;
  enablePerformanceTracking: boolean;
  enableMetrics: boolean;
}

// ===== VALIDATION CONFIGURATION =====

/**
 * Validation Configuration
 * Validation rules and constraints
 */
export interface ValidationConfig {
  // Password validation
  passwordMinLength: number;
  passwordMaxLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  passwordForbiddenPatterns: string[];
  
  // Email validation
  emailMaxLength: number;
  emailAllowedDomains: string[];
  emailBlockedDomains: string[];
  
  // Phone validation
  phoneMinLength: number;
  phoneMaxLength: number;
  phoneAllowedCountries: string[];
  
  // Name validation
  nameMinLength: number;
  nameMaxLength: number;
  nameAllowedCharacters: string;
  
  // File validation
  maxFileSize: number;
  allowedFileTypes: string[];
  allowedMimeTypes: string[];
  
  // Rate limiting validation
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
}

// ===== SECURITY CONFIGURATION =====

/**
 * Security Configuration
 * Security-specific settings
 */
export interface SecurityConfig {
  // Password security
  passwordHashingAlgorithm: 'bcrypt' | 'scrypt' | 'argon2';
  passwordHashingRounds: number;
  passwordSaltLength: number;
  
  // Token security
  tokenSigningAlgorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  tokenSecretLength: number;
  tokenFamilyLength: number;
  
  // Session security
  sessionSecretLength: number;
  sessionCookieSecure: boolean;
  sessionCookieHttpOnly: boolean;
  sessionCookieSameSite: 'strict' | 'lax' | 'none';
  
  // Device security
  deviceFingerprintLength: number;
  deviceFingerprintAlgorithm: 'sha256' | 'sha384' | 'sha512';
  
  // IP security
  enableIpWhitelist: boolean;
  ipWhitelist: string[];
  enableIpBlacklist: boolean;
  ipBlacklist: string[];
  
  // Security headers
  enableSecurityHeaders: boolean;
  securityHeaders: Record<string, string>;
  
  // Encryption
  enableDataEncryption: boolean;
  encryptionAlgorithm: 'aes-256-gcm' | 'aes-256-cbc';
  encryptionKeyLength: number;
}

// ===== PERFORMANCE CONFIGURATION =====

/**
 * Performance Configuration
 * Performance-related settings
 */
export interface PerformanceConfig {
  // Caching
  enableCaching: boolean;
  cacheType: 'memory' | 'redis' | 'mongodb';
  cacheTtl: number;
  cacheMaxSize: number;
  
  // Database
  enableConnectionPooling: boolean;
  connectionPoolSize: number;
  connectionPoolMinSize: number;
  connectionPoolMaxSize: number;
  
  // Query optimization
  enableQueryOptimization: boolean;
  queryTimeout: number;
  maxQueryTime: number;
  
  // Response compression
  enableCompression: boolean;
  compressionLevel: number;
  compressionThreshold: number;
  
  // Request processing
  enableRequestBatching: boolean;
  batchSize: number;
  batchTimeout: number;
  
  // Monitoring
  enablePerformanceMonitoring: boolean;
  performanceThreshold: number;
  slowQueryThreshold: number;
}

// ===== CONFIGURATION VALIDATION =====

/**
 * Configuration Validation Result
 * Result of configuration validation
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
  warnings?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

/**
 * Configuration Loader
 * Interface for configuration loaders
 */
export interface ConfigLoader {
  load(): Promise<AuthConfig>;
  validate(config: AuthConfig): ConfigValidationResult;
  reload(): Promise<AuthConfig>;
}

// ===== CONFIGURATION UTILITIES =====

/**
 * Configuration Environment
 * Environment-specific configuration
 */
export type ConfigEnvironment = 'development' | 'production' | 'test' | 'staging';

/**
 * Configuration Source
 * Source of configuration
 */
export type ConfigSource = 'environment' | 'file' | 'database' | 'api';

/**
 * Configuration Override
 * Configuration override rules
 */
export interface ConfigOverride {
  field: string;
  value: any;
  condition?: (env: ConfigEnvironment) => boolean;
  priority: number;
}
