"use client";

/**
 * Unified SSE Client Manager
 * 
 * This is the single, consolidated client-side SSE manager that replaces
 * all competing SSE systems. It provides:
 * - Single connection per user
 * - Smart reconnection with exponential backoff
 * - Connection pooling and reuse
 * - Session-aware connection management
 * - Selective logging
 * - Centralized state management
 */

import { SmartReconnectionManager } from './reconnection-strategy';
import { HeartbeatManager } from './heartbeat-manager';
import { SelectiveLogger } from './selective-logger';

// Types
export interface SSEMessage {
  type: string;
  data?: any;
  message?: string;
  userId?: string;
  userType?: string;
  timestamp?: string;
}

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

export interface ReconnectionStrategy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface LogLevel {
  ERROR: boolean;
  WARN: boolean;
  INFO: boolean;
  DEBUG: boolean;
}

// Configuration
const DEFAULT_CONFIG = {
  heartbeatInterval: 60000, // 1 minute
  heartbeatTimeout: 120000, // 2 minutes
  connectionTimeout: 30000, // 30 seconds
  maxSubscribers: 100,
  logLevel: {
    ERROR: true,
    WARN: true,
    INFO: false, // Reduced logging
    DEBUG: false
  } as LogLevel,
  reconnection: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  } as ReconnectionStrategy
};

class UnifiedSSEClient {
  private static instance: UnifiedSSEClient;
  
  // Core state
  private connection: EventSource | null = null;
  private subscribers: Map<string, SSESubscriber> = new Map();
  private user: any = null;
  private sessionId: string | null = null;
  
  // Connection state
  private state: ConnectionState['status'] = 'disconnected';
  private lastSuccessfulMessage: number = 0;
  private lastConnectionAttempt: number = 0;
  private reconnectAttempts: number = 0;
  
  // Timers
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  
  // Configuration
  private config = DEFAULT_CONFIG;
  
  // Connection pooling for reuse
  private connectionPool: Map<string, EventSource> = new Map();
  private connectionPoolSize: number = 0;
  private maxPoolSize: number = 5;
  
  // Smart reconnection manager
  private reconnectManager: SmartReconnectionManager;
  
  // Heartbeat manager
  private heartbeatManager: HeartbeatManager;
  
  // Session integration (removed - was broken import)
  
  // Selective logger
  private logger: SelectiveLogger;
  
  private constructor() {
    this.log('INFO', 'Unified SSE Client Manager initialized');
    
    // Initialize smart reconnection manager
    this.reconnectManager = new SmartReconnectionManager({
      maxAttempts: 10,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true
    });
    
    // Initialize heartbeat manager
    this.heartbeatManager = new HeartbeatManager(
      this.handleHeartbeatTimeout.bind(this),
      {
        interval: 30000,
        timeout: 60000,
        maxMissedHeartbeats: 3,
        adaptiveInterval: true
      }
    );
    
    // Session integration removed (was broken import)
    
    // Initialize selective logger
    this.logger = new SelectiveLogger('UnifiedSSEClient', {
      level: 'INFO',
      maxLogsPerMinute: 100,
      enableRateLimiting: true,
      enableFiltering: true,
      filters: ['heartbeat', 'debug', 'connection']
    });
  }
  
  public static getInstance(): UnifiedSSEClient {
    if (!UnifiedSSEClient.instance) {
      UnifiedSSEClient.instance = new UnifiedSSEClient();
    }
    return UnifiedSSEClient.instance;
  }
  
  /**
   * Set user and establish connection
   */
  public setUser(user: any, sessionId?: string): void {
    this.log('INFO', 'Setting user', { userId: user?._id, userType: user?.userType });
    
    this.user = user;
    this.sessionId = sessionId || null;
    
    // Only connect if we have subscribers
    if (this.subscribers.size > 0) {
      this.connect();
    }
  }
  
  /**
   * Clear user and disconnect
   */
  public clearUser(): void {
    this.log('INFO', 'Clearing user and disconnecting');
    
    this.user = null;
    this.sessionId = null;
    this.disconnect();
  }
  
  /**
   * Subscribe to SSE messages
   */
  public subscribe(
    subscriberId: string, 
    callback: (message: SSEMessage) => void,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): () => void {
    this.log('DEBUG', 'Subscribing', { subscriberId, priority });
    
    this.subscribers.set(subscriberId, {
      id: subscriberId,
      callback,
      priority
    });
    
    // Connect if this is the first subscriber and we have a user
    if (this.subscribers.size === 1 && this.user) {
      this.connect();
    }
    
    // Return unsubscribe function
    return () => {
      this.log('DEBUG', 'Unsubscribing', { subscriberId });
      this.subscribers.delete(subscriberId);
      
      // Disconnect if no more subscribers
      if (this.subscribers.size === 0) {
        this.disconnect();
      }
    };
  }
  
  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    const heartbeatQuality = this.heartbeatManager.getConnectionQuality();
    const reconnectionState = this.reconnectManager.getState();
    
    return {
      status: this.state,
      lastConnected: this.lastSuccessfulMessage > 0 ? new Date(this.lastSuccessfulMessage) : undefined,
      lastError: this.reconnectAttempts > 0 ? new Date() : undefined,
      reconnectAttempts: this.reconnectAttempts,
      connectionQuality: heartbeatQuality,
      subscribers: this.subscribers.size
    };
  }
  
  /**
   * Force reconnection (for debugging)
   */
  public forceReconnect(): void {
    this.log('WARN', 'Force reconnecting SSE');
    this.disconnect();
    if (this.user && this.subscribers.size > 0) {
      setTimeout(() => this.connect(), 1000);
    }
  }
  
  /**
   * Get connection from pool or create new one
   */
  private getConnectionFromPool(): EventSource | null {
    const poolKey = this.getConnectionPoolKey();
    
    // Try to get existing connection from pool
    if (this.connectionPool.has(poolKey)) {
      const pooledConnection = this.connectionPool.get(poolKey)!;
      
      // Check if connection is still valid
      if (pooledConnection.readyState === EventSource.OPEN) {
        this.log('DEBUG', 'Reusing connection from pool', { poolKey });
        return pooledConnection;
      } else {
        // Remove invalid connection from pool
        this.connectionPool.delete(poolKey);
        this.connectionPoolSize--;
      }
    }
    
    return null;
  }
  
  /**
   * Add connection to pool
   */
  private addConnectionToPool(connection: EventSource): void {
    const poolKey = this.getConnectionPoolKey();
    
    // Don't exceed max pool size
    if (this.connectionPoolSize >= this.maxPoolSize) {
      // Remove oldest connection
      const oldestKey = this.connectionPool.keys().next().value;
      if (oldestKey) {
        const oldestConnection = this.connectionPool.get(oldestKey);
        if (oldestConnection) {
          oldestConnection.close();
        }
        this.connectionPool.delete(oldestKey);
        this.connectionPoolSize--;
      }
    }
    
    this.connectionPool.set(poolKey, connection);
    this.connectionPoolSize++;
    
    this.log('DEBUG', 'Connection added to pool', { 
      poolKey, 
      poolSize: this.connectionPoolSize 
    });
  }
  
  /**
   * Get connection pool key
   */
  private getConnectionPoolKey(): string {
    return this.user ? `${this.user._id}-${this.user.userType}` : 'anonymous';
  }
  
  /**
   * Clean up connection pool
   */
  private cleanupConnectionPool(): void {
    const now = Date.now();
    const staleThreshold = 300000; // 5 minutes
    
    for (const [key, connection] of this.connectionPool.entries()) {
      // Check if connection is stale or closed
      if (connection.readyState === EventSource.CLOSED || 
          connection.readyState === EventSource.CONNECTING) {
        this.log('DEBUG', 'Removing stale connection from pool', { key });
        connection.close();
        this.connectionPool.delete(key);
        this.connectionPoolSize--;
      }
    }
  }
  
  /**
   * Get connection pool statistics
   */
  public getConnectionPoolStats(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    maxConnections: number;
    poolUtilization: number;
  } {
    const activeConnections = Array.from(this.connectionPool.values())
      .filter(conn => conn.readyState === EventSource.OPEN).length;
    
    const totalConnections = this.connectionPoolSize;
    const idleConnections = totalConnections - activeConnections;
    const poolUtilization = this.maxPoolSize > 0 ? (totalConnections / this.maxPoolSize) * 100 : 0;
    
    return {
      totalConnections,
      activeConnections,
      idleConnections,
      maxConnections: this.maxPoolSize,
      poolUtilization
    };
  }
  
  /**
   * Get comprehensive SSE statistics
   */
  public getStats(): {
    connection: ConnectionState;
    pool: {
      totalConnections: number;
      activeConnections: number;
      idleConnections: number;
      maxConnections: number;
      poolUtilization: number;
    };
    heartbeat: {
      isActive: boolean;
      lastHeartbeat: number | null;
      missedHeartbeats: number;
      quality: 'excellent' | 'good' | 'poor' | 'critical';
    };
    reconnection: {
      isReconnecting: boolean;
      attempts: number;
      maxAttempts: number;
      nextAttempt: number | null;
      backoffMultiplier: number;
    };
    logger: {
      totalLogs: number;
      filteredLogs: number;
      lastLogTime: number | null;
      logLevel: string;
    };
    uptime: number;
    totalMessages: number;
    totalErrors: number;
  } {
    return {
      connection: this.getConnectionState(),
      pool: this.getConnectionPoolStats(),
      heartbeat: this.heartbeatManager.getStats(),
      reconnection: this.reconnectManager.getState(),
      logger: this.logger.getStats(),
      uptime: Date.now() - this.lastSuccessfulMessage,
      totalMessages: 0, // TODO: Track message count
      totalErrors: this.reconnectAttempts
    };
  }
  
  /**
   * Private: Establish SSE connection
   */
  private connect(): void {
    if (this.state === 'connecting' || this.state === 'connected') {
      this.log('DEBUG', 'Connection already in progress or connected');
      return;
    }
    
    if (!this.user) {
      this.log('WARN', 'Cannot connect: no user set');
      return;
    }
    
    // Check if reconnection should be attempted
    if (!this.reconnectManager.shouldAttemptReconnection()) {
      this.log('DEBUG', 'Reconnection not allowed by smart manager');
      return;
    }
    
    // Debounce connection attempts
    const now = Date.now();
    if (now - this.lastConnectionAttempt < 2000) {
      this.log('DEBUG', 'Connection debounced');
      return;
    }
    this.lastConnectionAttempt = now;
    
    // Clean up stale connections from pool
    this.cleanupConnectionPool();
    
    // Try to get connection from pool first
    const pooledConnection = this.getConnectionFromPool();
    if (pooledConnection) {
      this.log('INFO', 'Using pooled SSE connection');
      this.connection = pooledConnection;
      this.state = 'connected';
      this.reconnectAttempts = 0;
      this.lastSuccessfulMessage = Date.now();
      this.startHeartbeat();
      return;
    }
    
    this.log('INFO', 'Establishing new SSE connection', { userId: this.user._id });
    this.state = 'connecting';
    
    // Clear existing connection
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    
    try {
      // Create new connection
      this.connection = new EventSource('/api/sse', {
        withCredentials: true
      });
      
      // Set up connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.state === 'connecting') {
          this.log('ERROR', 'Connection timeout');
          this.handleConnectionError('Connection timeout');
        }
      }, this.config.connectionTimeout);
      
      // Connection opened
      this.connection.onopen = () => {
        this.log('INFO', 'SSE connection opened successfully');
        this.state = 'connected';
        this.reconnectAttempts = 0;
        this.lastSuccessfulMessage = Date.now();
        this.startHeartbeat();
        this.clearConnectionTimeout();
        
        // Record successful connection
        this.reconnectManager.recordSuccess();
        
        // Add to connection pool for reuse
        this.addConnectionToPool(this.connection!);
      };
      
      // Message received
      this.connection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.lastSuccessfulMessage = Date.now();
          
          // Record activity for heartbeat manager
          this.heartbeatManager.recordActivity();
          
          this.log('DEBUG', 'Message received', { type: data.type });
          
          // Broadcast to all subscribers
          this.subscribers.forEach(subscriber => {
            try {
              subscriber.callback(data);
            } catch (error) {
              this.log('ERROR', 'Subscriber callback error', { subscriberId: subscriber.id, error });
            }
          });
        } catch (error) {
          this.log('ERROR', 'Error parsing SSE message', { error });
        }
      };
      
      // Connection error
      this.connection.onerror = (error) => {
        this.log('ERROR', 'SSE connection error', { error });
        this.reconnectManager.recordFailure();
        this.handleConnectionError('Connection error');
      };
      
    } catch (error) {
      this.log('ERROR', 'Failed to create SSE connection', { error });
      this.handleConnectionError('Failed to create connection');
    }
  }
  
  /**
   * Private: Handle connection errors
   */
  private handleConnectionError(reason: string): void {
    this.log('ERROR', 'Connection error', { reason });
    this.state = 'error';
    this.clearConnectionTimeout();
    this.stopHeartbeat();
    
    // Use smart reconnection manager
    if (this.reconnectManager.shouldAttemptReconnection()) {
      const delay = this.reconnectManager.getReconnectionDelay();
      this.log('INFO', 'Scheduling reconnection', { delay, reason });
      this.scheduleReconnection();
    } else {
      this.log('ERROR', 'Reconnection not allowed by smart manager');
      this.state = 'disconnected';
    }
  }
  
  /**
   * Private: Schedule reconnection with smart backoff
   */
  private scheduleReconnection(): void {
    this.reconnectAttempts++;
    this.state = 'reconnecting';
    
    const delay = this.reconnectManager.getReconnectionDelay();
    
    this.log('INFO', 'Scheduling reconnection', { 
      attempt: this.reconnectAttempts, 
      delay: delay,
      isReconnecting: this.reconnectManager.getState().isReconnecting
    });
    
    this.reconnectTimer = setTimeout(() => {
      if (this.user && this.subscribers.size > 0) {
        this.connect();
      }
    }, delay);
  }
  
  /**
   * Private: Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatManager.start();
  }
  
  /**
   * Private: Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    this.heartbeatManager.stop();
  }
  
  /**
   * Private: Handle heartbeat timeout
   */
  private handleHeartbeatTimeout(): void {
    this.log('WARN', 'Heartbeat timeout, forcing reconnect');
    this.handleConnectionError('Heartbeat timeout');
  }
  
  /**
   * Private: Clear connection timeout
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }
  
  /**
   * Private: Disconnect SSE connection
   */
  private disconnect(): void {
    this.log('INFO', 'Disconnecting SSE connection');
    
    this.state = 'disconnected';
    this.stopHeartbeat();
    this.clearConnectionTimeout();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.connection) {
      // Don't close pooled connections, just clear current reference
      const poolKey = this.getConnectionPoolKey();
      if (!this.connectionPool.has(poolKey)) {
        this.connection.close();
      }
      this.connection = null;
    }
  }
  
  /**
   * Private: Logging with selective levels
   */
  private log(level: keyof LogLevel, message: string, data?: any): void {
    if (this.config.logLevel[level]) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [UnifiedSSE] [${level}]`;
      
      if (data) {
        console.log(`${prefix} ${message}`, data);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  }
  
  /**
   * Cleanup method
   */
  public cleanup(): void {
    this.log('INFO', 'Cleaning up Unified SSE Client Manager');
    this.disconnect();
    this.subscribers.clear();
    this.connectionPool.clear();
    this.user = null;
    this.sessionId = null;
  }
}

// Export singleton instance
export const unifiedSSEClient = UnifiedSSEClient.getInstance();

// Types are already exported as interfaces above
