/**
 * SSE Types and Interfaces
 * 
 * Centralized type definitions for the SSE system.
 * Similar to how SessionManager has clean type definitions.
 */

// Core SSE Message Types
export interface SSEMessage {
  type: string;
  data?: any;
  message?: string;
  userId?: string;
  userType?: string;
  timestamp?: string;
  id?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface NotificationData {
  id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  transferId?: string;
  data?: any;
  timestamp: string;
  read?: boolean;
}

// Client-side Types
export interface SSESubscriber {
  id: string;
  callback: (message: SSEMessage) => void;
  priority: 'high' | 'medium' | 'low';
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  lastConnected?: Date;
  lastError?: Date;
  reconnectAttempts: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  subscribers: number;
}

export interface User {
  _id: string;
  email: string;
  userType: string;
  [key: string]: any;
}

// Server-side Types
export interface SSEClient {
  userId: string;
  userType: string;
  sessionId?: string;
  controller: ReadableStreamDefaultController;
  lastActivity: number;
  connectedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  messageCount: number;
  lastPing: Date;
}

export interface ServerStats {
  totalConnections: number;
  activeConnections: number;
  connectionsByType: Record<string, number>;
  averageConnectionDuration: number;
  totalMessagesSent: number;
  lastCleanup: Date;
}

// Configuration Types
export interface SSEConfig {
  heartbeatInterval: number;
  heartbeatTimeout: number;
  connectionTimeout: number;
  maxSubscribers: number;
  maxConnections: number;
  maxMessagesPerMinute: number;
  cleanupInterval: number;
  staleConnectionThreshold: number;
  logLevel: LogLevel;
  reconnection: ReconnectionConfig;
}

export interface ReconnectionConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface LogLevel {
  ERROR: boolean;
  WARN: boolean;
  INFO: boolean;
  DEBUG: boolean;
}

// Result Types
export interface SSEResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

export interface ConnectionResult {
  success: boolean;
  connection?: EventSource;
  error?: string;
}

export interface BroadcastResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  error?: string;
}

// Performance Types
export interface SSEPerformanceMetrics {
  averageConnectionTime: number;
  averageMessageLatency: number;
  connectionSuccessRate: number;
  messageDeliveryRate: number;
  activeConnections: number;
  totalMessages: number;
  errorRate: number;
}

// Security Types
export interface SSESecurityContext {
  userId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  connectionTime: Date;
  lastActivity: Date;
  riskScore: number;
  securityFlags: string[];
}

// Cleanup Types
export interface SSECleanupResult {
  cleanedConnections: number;
  cleanedMessages: number;
  performance: number;
  errors: string[];
}

export interface SSECleanupConfig {
  maxInactiveTime: number;
  maxMessageAge: number;
  batchSize: number;
  dryRun: boolean;
}
