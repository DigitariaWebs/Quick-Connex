/**
 * SSE Manager - Clean Implementation
 * 
 * Main orchestrator for all SSE operations, similar to SessionManager.
 * Follows clean architecture principles with proper separation of concerns.
 */

import { SSEMessage, SSEClient, NotificationData, SSEResult, ConnectionResult, BroadcastResult, SSEPerformanceMetrics } from './SSETypes';
import { SSESecurity, SSE_SECURITY_CONFIG } from './SSESecurity';
import { SSECache } from './SSECache';
// import { SSECleanup } from './SSECleanup'; // File not available
import { SSEMetrics } from './SSEMetrics';

export interface SSEManagerConfig {
  enableSecurity: boolean;
  enableCaching: boolean;
  enableMetrics: boolean;
  enableCleanup: boolean;
  maxConnections: number;
  heartbeatInterval: number;
  cleanupInterval: number;
}

export const SSE_MANAGER_CONFIG: SSEManagerConfig = {
  enableSecurity: true,
  enableCaching: true,
  enableMetrics: true,
  enableCleanup: true,
  maxConnections: 1000,
  heartbeatInterval: 60000,
  cleanupInterval: 300000
};

export class SSEManager {
  private static instance: SSEManager;
  
  // Core components
  private cache: SSECache;
  private metrics: SSEMetrics;
  // private cleanup: typeof SSECleanup; // File not available
  private security: typeof SSESecurity;
  
  // Client registry
  private clients: Map<string, SSEClient> = new Map();
  
  // Configuration
  private config: SSEManagerConfig;
  
  // Timers
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = SSE_MANAGER_CONFIG;
    this.cache = SSECache.getInstance();
    this.metrics = SSEMetrics.getInstance();
    // this.cleanup = SSECleanup; // File not available
    this.security = SSESecurity;
    
    this.initialize();
  }

  public static getInstance(): SSEManager {
    if (!SSEManager.instance) {
      SSEManager.instance = new SSEManager();
    }
    return SSEManager.instance;
  }

  /**
   * Initialize SSE Manager
   */
  private initialize(): void {
    console.log('🚀 SSE Manager initialized');
    
    if (this.config.enableMetrics) {
      this.metrics.updateActiveConnections(this.clients.size);
    }
    
    this.startHeartbeat();
    this.startCleanup();
  }

  /**
   * Register a new client
   */
  public async registerClient(
    userId: string,
    userType: string,
    sessionId: string,
    controller: ReadableStreamDefaultController,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SSEResult> {
    try {
      // Security validation
      if (this.config.enableSecurity) {
        const securityResult = await this.security.validateConnection(
          userId, 
          ipAddress || 'unknown', 
          userAgent || 'unknown', 
          sessionId
        );
        
        if (!securityResult.valid) {
          return {
            success: false,
            error: securityResult.reason || 'Security validation failed'
          };
        }
      }

      // Check connection limits
      if (this.clients.size >= this.config.maxConnections) {
        return {
          success: false,
          error: 'Maximum connections reached'
        };
      }

      // Create client
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

      // Register client
      this.clients.set(userId, client);
      
      // Cache client if enabled
      if (this.config.enableCaching) {
        this.cache.setClient(userId, client);
      }

      // Record metrics
      if (this.config.enableMetrics) {
        this.metrics.recordSuccessfulConnection(0); // Connection time not applicable for SSE
        this.metrics.updateActiveConnections(this.clients.size);
      }

      // Record security
      if (this.config.enableSecurity) {
        this.security.recordConnection(userId, ipAddress || 'unknown');
      }

      console.log('✅ SSE Client registered:', { userId, userType, ipAddress });

      return {
        success: true,
        message: 'Client registered successfully',
        data: { userId, userType, connectionQuality: client.connectionQuality }
      };

    } catch (error) {
      console.error('❌ SSE Client registration failed:', error);
      return {
        success: false,
        error: 'Failed to register client'
      };
    }
  }

  /**
   * Unregister a client
   */
  public unregisterClient(userId: string): SSEResult {
    try {
      const client = this.clients.get(userId);
      if (!client) {
        return {
          success: false,
          error: 'Client not found'
        };
      }

      // Remove from registry
      this.clients.delete(userId);
      
      // Remove from cache
      if (this.config.enableCaching) {
        this.cache.removeClient(userId);
      }

      // Update metrics
      if (this.config.enableMetrics) {
        this.metrics.updateActiveConnections(this.clients.size);
      }

      // Record security
      if (this.config.enableSecurity) {
        this.security.recordDisconnection(userId, client.ipAddress || 'unknown');
      }

      console.log('✅ SSE Client unregistered:', { userId });

      return {
        success: true,
        message: 'Client unregistered successfully'
      };

    } catch (error) {
      console.error('❌ SSE Client unregistration failed:', error);
      return {
        success: false,
        error: 'Failed to unregister client'
      };
    }
  }

  /**
   * Broadcast message to all clients
   */
  public async broadcastToAll(notificationData: NotificationData): Promise<BroadcastResult> {
    const startTime = Date.now();
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      this.clients.forEach((client, userId) => {
        try {
          // Send message to client
          const message = `data: ${JSON.stringify(notificationData)}\n\n`;
          client.controller.enqueue(new TextEncoder().encode(message));
          
          client.messageCount++;
          client.lastActivity = Date.now();
          sentCount++;

          // Record metrics
          if (this.config.enableMetrics) {
            this.metrics.recordMessageSent(Date.now() - startTime);
          }

        } catch (error) {
          failedCount++;
          errors.push(`Failed to send to client ${userId}: ${error}`);
          
          // Remove failed client
          this.clients.delete(userId);
          
          if (this.config.enableMetrics) {
            this.metrics.recordFailedMessage();
          }
        }
      });

      // Update total messages
      if (this.config.enableMetrics) {
        this.metrics.updateTotalMessages(sentCount);
      }

      console.log('📡 SSE Broadcast completed:', { 
        sent: sentCount, 
        failed: failedCount, 
        total: this.clients.size 
      });

      return {
        success: sentCount > 0,
        sentCount,
        failedCount,
        error: errors.length > 0 ? errors.join('; ') : undefined
      };

    } catch (error) {
      console.error('❌ SSE Broadcast failed:', error);
      return {
        success: false,
        sentCount: 0,
        failedCount: this.clients.size,
        error: `Broadcast failed: ${error}`
      };
    }
  }

  /**
   * Send message to specific client
   */
  public sendToClient(userId: string, message: SSEMessage): SSEResult {
    try {
      const client = this.clients.get(userId);
      if (!client) {
        return {
          success: false,
          error: 'Client not found'
        };
      }

      const data = `data: ${JSON.stringify(message)}\n\n`;
      client.controller.enqueue(new TextEncoder().encode(data));
      
      client.messageCount++;
      client.lastActivity = Date.now();

      // Record metrics
      if (this.config.enableMetrics) {
        this.metrics.recordMessageSent();
      }

      return {
        success: true,
        message: 'Message sent successfully'
      };

    } catch (error) {
      console.error('❌ SSE Send to client failed:', error);
      return {
        success: false,
        error: 'Failed to send message to client'
      };
    }
  }

  /**
   * Send message to clients by user type
   */
  public sendToUserType(userType: string, message: SSEMessage): BroadcastResult {
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    this.clients.forEach((client, userId) => {
      if (client.userType === userType) {
        const result = this.sendToClient(userId, message);
        if (result.success) {
          sentCount++;
        } else {
          failedCount++;
          errors.push(result.error || 'Unknown error');
        }
      }
    });

    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };
  }

  /**
   * Get server statistics
   */
  public getStats(): {
    totalConnections: number;
    activeConnections: number;
    connectionsByType: Record<string, number>;
    averageConnectionDuration: number;
    totalMessagesSent: number;
    lastCleanup: Date;
    performance?: SSEPerformanceMetrics;
    security?: any;
  } {
    const now = Date.now();
    const connectionsByType: Record<string, number> = {};
    let totalDuration = 0;
    let connectionCount = 0;

    this.clients.forEach(client => {
      connectionsByType[client.userType] = (connectionsByType[client.userType] || 0) + 1;
      const duration = now - client.connectedAt.getTime();
      totalDuration += duration;
      connectionCount++;
    });

    const stats = {
      totalConnections: this.clients.size,
      activeConnections: this.clients.size,
      connectionsByType,
      averageConnectionDuration: connectionCount > 0 ? totalDuration / connectionCount : 0,
      totalMessagesSent: this.metrics.getMetrics().totalMessages,
      lastCleanup: new Date()
    };

    // Add performance metrics if enabled
    if (this.config.enableMetrics) {
      (stats as any).performance = this.metrics.getMetrics();
    }

    // Add security stats if enabled
    if (this.config.enableSecurity) {
      (stats as any).security = this.security.getSecurityStats();
    }

    return stats;
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
   * Start heartbeat
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      this.performHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * Perform heartbeat
   */
  private performHeartbeat(): void {
    const now = Date.now();
    const staleThreshold = now - (this.config.heartbeatInterval * 2);

    this.clients.forEach((client, userId) => {
      if (client.lastActivity < staleThreshold) {
        // Mark as stale
        client.connectionQuality = 'poor';
      }
    });
  }

  /**
   * Start cleanup
   */
  private startCleanup(): void {
    if (!this.config.enableCleanup) return;

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(async () => {
      await this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Perform cleanup
   */
  public async performCleanup(): Promise<{ cleaned: number; performance: number }> {
    if (!this.config.enableCleanup) {
      return { cleaned: 0, performance: 0 };
    }

    // const startTime = Date.now();
    // const result = await this.cleanup.performCleanup(this.clients);
    
    // Update metrics
    if (this.config.enableMetrics) {
      this.metrics.updateActiveConnections(this.clients.size);
    }

    console.log('🧹 SSE Cleanup skipped - cleanup module not available');

    return {
      cleaned: 0,
      performance: 0
    };
  }

  /**
   * Get performance analytics
   */
  public getPerformanceAnalytics(): any {
    if (!this.config.enableMetrics) {
      return null;
    }

    return this.metrics.getDetailedStats();
  }

  /**
   * Get security statistics
   */
  public getSecurityStatistics(): any {
    if (!this.config.enableSecurity) {
      return null;
    }

    return this.security.getSecurityStats();
  }

  /**
   * Get cleanup statistics
   */
  public getCleanupStatistics(): any {
    if (!this.config.enableCleanup) {
      return null;
    }

    // return this.cleanup.getCleanupStats(); // Cleanup module not available
    return { totalCleanups: 0, totalCleaned: 0, averageCleanupTime: 0 };
  }

  /**
   * Cleanup method
   */
  public cleanup(): void {
    console.log('🧹 SSE Manager: Cleaning up');
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.clients.clear();
    
    if (this.config.enableCaching) {
      this.cache.clear();
    }
    
    if (this.config.enableMetrics) {
      this.metrics.resetMetrics();
    }
  }
}

// Export singleton instance
export const sseManager = SSEManager.getInstance();
