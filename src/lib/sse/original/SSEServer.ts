/**
 * SSE Server - Clean Implementation
 * 
 * Simplified server-side SSE manager with only the features that are actually used.
 * Follows clean architecture principles.
 */

import { ReadableStreamDefaultController } from 'stream/web';

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

export interface ServerStats {
  totalConnections: number;
  activeConnections: number;
  connectionsByType: Record<string, number>;
  averageConnectionDuration: number;
  totalMessagesSent: number;
  lastCleanup: Date;
}

/**
 * Clean SSE Server Manager
 * 
 * Only includes the methods that are actually being used:
 * - registerClient(userId, userType, sessionId, controller, ipAddress, userAgent)
 * - unregisterClient(userId)
 * - getStats()
 * - broadcastToAll(notificationData)
 */
export class SSEServer {
  private static instance: SSEServer;
  
  // Core state
  private clients: Map<string, SSEClient> = new Map();
  private serverState: ServerStats = {
    totalConnections: 0,
    activeConnections: 0,
    connectionsByType: {},
    averageConnectionDuration: 0,
    totalMessagesSent: 0,
    lastCleanup: new Date()
  };
  
  private constructor() {
    console.log('🖥️ SSE Server initialized');
  }
  
  public static getInstance(): SSEServer {
    if (!SSEServer.instance) {
      SSEServer.instance = new SSEServer();
    }
    return SSEServer.instance;
  }
  
  /**
   * Register a new client
   */
  public registerClient(
    userId: string,
    userType: string,
    sessionId: string,
    controller: ReadableStreamDefaultController,
    ipAddress?: string,
    userAgent?: string
  ): void {
    const client: SSEClient = {
      userId,
      userType,
      sessionId,
      controller,
      lastActivity: Date.now(),
      connectedAt: new Date(),
      ipAddress,
      userAgent,
      connectionQuality: 'good',
      messageCount: 0,
      lastPing: new Date()
    };
    
    this.clients.set(userId, client);
    this.serverState.totalConnections++;
    this.serverState.activeConnections = this.clients.size;
    this.serverState.connectionsByType[userType] = (this.serverState.connectionsByType[userType] || 0) + 1;
    
    console.log('👤 SSE Server: Client registered', { userId, userType, ipAddress });
  }
  
  /**
   * Unregister a client
   */
  public unregisterClient(userId: string): void {
    if (this.clients.has(userId)) {
      this.clients.delete(userId);
      this.serverState.activeConnections = this.clients.size;
      console.log('👤 SSE Server: Client unregistered', { userId });
    }
  }
  
  /**
   * Get server statistics
   */
  public getStats(): ServerStats {
    return {
      ...this.serverState,
      activeConnections: this.clients.size,
      lastCleanup: new Date()
    };
  }
  
  /**
   * Broadcast message to all connected clients
   */
  public broadcastToAll(notificationData: NotificationData): number {
    let broadcastCount = 0;
    
    this.clients.forEach((client) => {
      try {
        // Send message to client
        const message = `data: ${JSON.stringify(notificationData)}\n\n`;
        client.controller.enqueue(new TextEncoder().encode(message));
        
        client.messageCount++;
        client.lastActivity = Date.now();
        broadcastCount++;
        
      } catch (error) {
        console.error('❌ SSE Server: Failed to send message to client', { userId: client.userId, error });
        // Remove disconnected client
        this.clients.delete(client.userId);
      }
    });
    
    this.serverState.totalMessagesSent += broadcastCount;
    console.log('📡 SSE Server: Broadcast completed', { 
      messageId: notificationData.id, 
      broadcastCount, 
      totalClients: this.clients.size 
    });
    
    return broadcastCount;
  }
  
  /**
   * Send message to specific client
   */
  public sendToClient(userId: string, message: any): boolean {
    const client = this.clients.get(userId);
    if (!client) {
      console.warn('⚠️ SSE Server: Client not found', { userId });
      return false;
    }
    
    try {
      const data = `data: ${JSON.stringify(message)}\n\n`;
      client.controller.enqueue(new TextEncoder().encode(data));
      client.messageCount++;
      client.lastActivity = Date.now();
      return true;
    } catch (error) {
      console.error('❌ SSE Server: Failed to send message to client', { userId, error });
      this.clients.delete(userId);
      return false;
    }
  }
  
  /**
   * Send message to clients by user type
   */
  public sendToUserType(userType: string, message: any): number {
    let sentCount = 0;
    
    this.clients.forEach((client) => {
      if (client.userType === userType) {
        if (this.sendToClient(client.userId, message)) {
          sentCount++;
        }
      }
    });
    
    return sentCount;
  }
  
  /**
   * Cleanup inactive clients
   */
  public cleanupInactiveClients(maxInactiveTime: number = 300000): number { // 5 minutes
    let cleanedCount = 0;
    const now = Date.now();
    
    this.clients.forEach((client, userId) => {
      if (now - client.lastActivity > maxInactiveTime) {
        this.clients.delete(userId);
        cleanedCount++;
        console.log('🧹 SSE Server: Cleaned up inactive client', { userId, inactiveTime: now - client.lastActivity });
      }
    });
    
    this.serverState.activeConnections = this.clients.size;
    this.serverState.lastCleanup = new Date();
    
    return cleanedCount;
  }
  
  /**
   * Get client information
   */
  public getClient(userId: string): SSEClient | undefined {
    return this.clients.get(userId);
  }
  
  /**
   * Get all clients
   */
  public getAllClients(): SSEClient[] {
    return Array.from(this.clients.values());
  }
  
  /**
   * Cleanup method
   */
  public cleanup(): void {
    console.log('🧹 SSE Server: Cleaning up');
    this.clients.clear();
    this.serverState = {
      totalConnections: 0,
      activeConnections: 0,
      connectionsByType: {},
      averageConnectionDuration: 0,
      totalMessagesSent: 0,
      lastCleanup: new Date()
    };
  }
}

// Export singleton instance
export const sseServer = SSEServer.getInstance();
