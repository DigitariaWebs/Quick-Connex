/**
 * SSE Types
 * 
 * Type definitions for the unified SSE system.
 */

export interface SSEMessage {
  type: string;
  data?: any;
  timestamp?: string;
  userId?: string;
  userType?: string;
  priority?: 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
}

export interface SSESubscriber {
  id: string;
  callback: (message: SSEMessage) => void;
  priority: 'high' | 'medium' | 'low';
  createdAt: number;
  lastActivity: number;
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  reconnectAttempts: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  subscribers: number;
  lastActivity?: number;
  lastError?: string;
}

export interface SSEConfig {
  endpoint: string;
  connectionTimeout: number;
  heartbeatInterval: number;
  heartbeatTimeout: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  enableLogging: boolean;
  logLevel: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
}

export interface ConnectionPoolStats {
  poolSize: number;
  maxPoolSize: number;
  poolKeys: string[];
  activeConnections: number;
  staleConnections: number;
}

export interface HeartbeatStats {
  isRunning: boolean;
  lastHeartbeat: number;
  missedHeartbeats: number;
  connectionQuality: string;
  averageResponseTime: number;
  responseTimeHistory: number[];
}

export interface ReconnectionStats {
  attempts: number;
  maxAttempts: number;
  nextDelay: number;
  timeUntilNext: number;
  canAttempt: boolean;
  circuitBreaker: 'closed' | 'open' | 'half-open';
}

export interface LoggerStats {
  totalLogs: number;
  logsByLevel: Record<string, number>;
  topMessages: Array<{ message: string; count: number }>;
  rateLimitStatus: {
    isLimited: boolean;
    logsPerMinute: number;
    maxLogsPerMinute: number;
  };
}

export interface SSEStats {
  connection: ConnectionState;
  pool: ConnectionPoolStats;
  heartbeat: HeartbeatStats;
  reconnection: ReconnectionStats;
  logger: LoggerStats;
  uptime: number;
  totalMessages: number;
  totalErrors: number;
}

export type SSEEventType = 
  | 'connection'
  | 'disconnection'
  | 'message'
  | 'error'
  | 'heartbeat'
  | 'reconnect'
  | 'timeout'
  | 'cleanup';

export interface SSEEvent {
  type: SSEEventType;
  timestamp: number;
  data?: any;
  userId?: string;
  userType?: string;
}

export interface SSEClientInfo {
  userId: string;
  userType: string;
  sessionId: string;
  connectionTime: number;
  lastActivity: number;
  messageCount: number;
  errorCount: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
}

export interface SSEServerStats {
  totalConnections: number;
  connectionsByType: Record<string, number>;
  activeConnections: number;
  totalMessages: number;
  totalErrors: number;
  uptime: number;
  averageResponseTime: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
}

