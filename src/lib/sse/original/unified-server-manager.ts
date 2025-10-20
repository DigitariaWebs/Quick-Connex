/**
 * Unified SSE Server Manager
 * 
 * This is the single, consolidated server-side SSE manager that replaces
 * all competing server-side SSE systems. It provides:
 * - Single client registry
 * - Connection pooling and reuse
 * - Session-aware connection management
 * - Selective logging
 * - Centralized state management
 * - Performance monitoring
 */

import { ReadableStreamDefaultController } from 'stream/web';
import { ServerHeartbeatManager } from './heartbeat-manager';
import { SelectiveLogger } from './selective-logger';
// import { SessionValidationResult } from '@/lib/auth/session-validation'; // Module not available
type SessionValidationResult = any;

// Types
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

export interface ServerState {
  totalConnections: number;
  activeConnections: number;
  connectionsByType: Record<string, number>;
  averageConnectionDuration: number;
  totalMessagesSent: number;
  lastCleanup: Date;
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
  cleanupInterval: 300000, // 5 minutes
  staleConnectionThreshold: 300000, // 5 minutes
  maxConnections: 1000,
  maxMessagesPerMinute: 100,
  logLevel: {
    ERROR: true,
    WARN: true,
    INFO: false, // Reduced logging
    DEBUG: false
  } as LogLevel
};

class UnifiedSSEServer {
  private static instance: UnifiedSSEServer;
  
  // Core state
  private clients: Map<string, SSEClient> = new Map();
  private serverState: ServerState = {
    totalConnections: 0,
    activeConnections: 0,
    connectionsByType: {},
    averageConnectionDuration: 0,
    totalMessagesSent: 0,
    lastCleanup: new Date()
  };
  
  // Timers
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  // Configuration
  private config = DEFAULT_CONFIG;
  
  // Performance tracking
  private messageRateTracker: Map<string, number[]> = new Map();
  
  private constructor() {
    this.log('INFO', 'Unified SSE Server Manager initialized');
    this.startHeartbeat();
    this.startCleanup();
  }
  
  public static getInstance(): UnifiedSSEServer {
    if (!UnifiedSSEServer.instance) {
      UnifiedSSEServer.instance = new UnifiedSSEServer();
    }
    return UnifiedSSEServer.instance;
  }
  
  /**
   * Register a new SSE client
   */
  public registerClient(
    userId: string,
    userType: string,
    controller: ReadableStreamDefaultController,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string
  ): void {
    this.log('INFO', 'Registering client', { userId, userType, sessionId });
    
    // Remove existing client if any
    this.unregisterClient(userId);
    
    const client: SSEClient = {
      userId,
      userType,
      sessionId,
      controller,
      lastActivity: Date.now(),
      connectedAt: new Date(),
      ipAddress,
      userAgent,
      connectionQuality: 'excellent',
      messageCount: 0,
      lastPing: new Date()
    };
    
    this.clients.set(userId, client);
    this.updateServerState();
    
    // Send initial connection message
    this.sendToClient(userId, {
      type: 'connection',
      message: 'Connected to unified SSE stream',
      userId,
      userType,
      timestamp: new Date().toISOString()
    });
    
    this.log('INFO', 'Client registered successfully', { 
      totalClients: this.clients.size,
      activeConnections: this.serverState.activeConnections 
    });
  }
  
  /**
   * Unregister a client
   */
  public unregisterClient(userId: string): void {
    const client = this.clients.get(userId);
    if (client) {
      this.log('INFO', 'Unregistering client', { userId });
      this.clients.delete(userId);
      this.updateServerState();
    }
  }
  
  /**
   * Send message to specific client
   */
  public sendToClient(userId: string, data: any): boolean {
    const client = this.clients.get(userId);
    if (!client) {
      this.log('WARN', 'Client not found', { userId });
      return false;
    }
    
    try {
      const encoder = new TextEncoder();
      const message = `data: ${JSON.stringify(data)}\n\n`;
      
      client.controller.enqueue(encoder.encode(message));
      client.lastActivity = Date.now();
      client.messageCount++;
      client.lastPing = new Date();
      
      this.serverState.totalMessagesSent++;
      this.trackMessageRate(userId);
      
      this.log('DEBUG', 'Message sent to client', { userId, type: data.type });
      return true;
    } catch (error) {
      this.log('ERROR', 'Failed to send message to client', { userId, error });
      // Remove failed client
      this.unregisterClient(userId);
      return false;
    }
  }
  
  /**
   * Broadcast message to all clients
   */
  public broadcastToAll(data: any): number {
    this.log('DEBUG', 'Broadcasting to all clients', { 
      totalClients: this.clients.size,
      messageType: data.type 
    });
    
    let successCount = 0;
    const failedClients: string[] = [];
    
    for (const [userId, client] of this.clients.entries()) {
      if (this.sendToClient(userId, data)) {
        successCount++;
      } else {
        failedClients.push(userId);
      }
    }
    
    // Clean up failed clients
    failedClients.forEach(userId => this.unregisterClient(userId));
    
    this.log('INFO', 'Broadcast completed', { 
      successCount, 
      failedCount: failedClients.length,
      totalClients: this.clients.size 
    });
    
    return successCount;
  }
  
  /**
   * Broadcast message to clients by user type
   */
  public broadcastToUserType(userType: string, data: any): number {
    this.log('DEBUG', 'Broadcasting to user type', { userType, messageType: data.type });
    
    let successCount = 0;
    const failedClients: string[] = [];
    
    for (const [userId, client] of this.clients.entries()) {
      if (client.userType === userType) {
        if (this.sendToClient(userId, data)) {
          successCount++;
        } else {
          failedClients.push(userId);
        }
      }
    }
    
    // Clean up failed clients
    failedClients.forEach(userId => this.unregisterClient(userId));
    
    this.log('INFO', 'User type broadcast completed', { 
      userType,
      successCount, 
      failedCount: failedClients.length 
    });
    
    return successCount;
  }
  
  /**
   * Get server state
   */
  public getServerState(): ServerState {
    return { ...this.serverState };
  }
  
  /**
   * Get client information
   */
  public getClient(userId: string): SSEClient | null {
    return this.clients.get(userId) || null;
  }
  
  /**
   * Get all clients
   */
  public getAllClients(): SSEClient[] {
    return Array.from(this.clients.values());
  }
  
  /**
   * Get clients by user type
   */
  public getClientsByType(userType: string): SSEClient[] {
    return Array.from(this.clients.values()).filter(client => client.userType === userType);
  }
  
  /**
   * Check if client exists
   */
  public hasClient(userId: string): boolean {
    return this.clients.has(userId);
  }
  
  /**
   * Get connection statistics
   */
  public getStats(): {
    totalConnections: number;
    activeConnections: number;
    connectionsByType: Record<string, number>;
    averageConnectionDuration: number;
    totalMessagesSent: number;
    clientIds: string[];
  } {
    return {
      totalConnections: this.serverState.totalConnections,
      activeConnections: this.serverState.activeConnections,
      connectionsByType: { ...this.serverState.connectionsByType },
      averageConnectionDuration: this.serverState.averageConnectionDuration,
      totalMessagesSent: this.serverState.totalMessagesSent,
      clientIds: Array.from(this.clients.keys())
    };
  }
  
  /**
   * Private: Update server state
   */
  private updateServerState(): void {
    this.serverState.activeConnections = this.clients.size;
    
    // Calculate connections by type
    this.serverState.connectionsByType = {};
    for (const client of this.clients.values()) {
      this.serverState.connectionsByType[client.userType] = 
        (this.serverState.connectionsByType[client.userType] || 0) + 1;
    }
    
    // Calculate average connection duration
    if (this.clients.size > 0) {
      const now = Date.now();
      const totalDuration = Array.from(this.clients.values())
        .reduce((sum, client) => sum + (now - client.connectedAt.getTime()), 0);
      this.serverState.averageConnectionDuration = totalDuration / this.clients.size;
    }
  }
  
  /**
   * Private: Start heartbeat system
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }
  
  /**
   * Private: Send heartbeat to all clients
   */
  private sendHeartbeat(): void {
    const heartbeatData = {
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
      serverTime: Date.now()
    };
    
    this.broadcastToAll(heartbeatData);
    this.log('DEBUG', 'Heartbeat sent to all clients');
  }
  
  /**
   * Private: Start cleanup system
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleConnections();
    }, this.config.cleanupInterval);
  }
  
  /**
   * Private: Clean up stale connections
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    const staleClients: string[] = [];
    
    for (const [userId, client] of this.clients.entries()) {
      const timeSinceLastActivity = now - client.lastActivity;
      
      if (timeSinceLastActivity > this.config.staleConnectionThreshold) {
        staleClients.push(userId);
      }
    }
    
    if (staleClients.length > 0) {
      this.log('INFO', 'Cleaning up stale connections', { 
        staleCount: staleClients.length,
        totalClients: this.clients.size 
      });
      
      staleClients.forEach(userId => this.unregisterClient(userId));
    }
    
    this.serverState.lastCleanup = new Date();
  }
  
  /**
   * Private: Track message rate for performance monitoring
   */
  private trackMessageRate(userId: string): void {
    const now = Date.now();
    const minuteAgo = now - 60000;
    
    if (!this.messageRateTracker.has(userId)) {
      this.messageRateTracker.set(userId, []);
    }
    
    const rates = this.messageRateTracker.get(userId)!;
    
    // Remove old entries
    while (rates.length > 0 && rates[0] < minuteAgo) {
      rates.shift();
    }
    
    // Add current timestamp
    rates.push(now);
    
    // Check rate limit
    if (rates.length > this.config.maxMessagesPerMinute) {
      this.log('WARN', 'Message rate limit exceeded', { userId, rate: rates.length });
      this.unregisterClient(userId);
    }
  }
  
  /**
   * Private: Logging with selective levels
   */
  private log(level: keyof LogLevel, message: string, data?: any): void {
    if (this.config.logLevel[level]) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [UnifiedSSEServer] [${level}]`;
      
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
    this.log('INFO', 'Cleaning up Unified SSE Server Manager');
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.clients.clear();
    this.messageRateTracker.clear();
  }
}

// Export singleton instance
export const unifiedSSEServer = UnifiedSSEServer.getInstance();

// Types are already exported as interfaces above
