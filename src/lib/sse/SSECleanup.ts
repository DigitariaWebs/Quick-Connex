/**
 * SSE Cleanup Component
 * 
 * Handles cleanup operations for SSE connections and messages.
 * Similar to SessionCleanup in the session system.
 */

import { SSEClient, SSECleanupResult, SSECleanupConfig } from './original/SSETypes';

export interface SSECleanupStats {
  totalCleanups: number;
  connectionsCleaned: number;
  messagesCleaned: number;
  averageCleanupTime: number;
  lastCleanup: Date;
  errors: string[];
}

export class SSECleanup {
  private static stats: SSECleanupStats = {
    totalCleanups: 0,
    connectionsCleaned: 0,
    messagesCleaned: 0,
    averageCleanupTime: 0,
    lastCleanup: new Date(),
    errors: []
  };

  /**
   * Perform comprehensive SSE cleanup
   */
  static async performCleanup(
    clients: Map<string, SSEClient>,
    config: Partial<SSECleanupConfig> = {}
  ): Promise<SSECleanupResult> {
    const startTime = Date.now();
    const cleanupConfig: SSECleanupConfig = {
      maxInactiveTime: 300000, // 5 minutes
      maxMessageAge: 600000, // 10 minutes
      batchSize: 100,
      dryRun: false,
      ...config
    };

    const result: SSECleanupResult = {
      cleanedConnections: 0,
      cleanedMessages: 0,
      performance: 0,
      errors: []
    };

    try {
      // Cleanup inactive connections
      const inactiveResult = await this.cleanupInactiveConnections(clients, cleanupConfig);
      result.cleanedConnections = inactiveResult.cleaned;
      result.errors.push(...inactiveResult.errors);

      // Cleanup stale connections
      const staleResult = await this.cleanupStaleConnections(clients, cleanupConfig);
      result.cleanedConnections += staleResult.cleaned;
      result.errors.push(...staleResult.errors);

      // Update statistics
      this.updateStats(result, Date.now() - startTime);

      result.performance = Date.now() - startTime;

      console.log('🧹 SSE Cleanup completed:', {
        connections: result.cleanedConnections,
        messages: result.cleanedMessages,
        performance: result.performance,
        errors: result.errors.length
      });

      return result;

    } catch (error) {
      const errorMessage = `SSE cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMessage);
      result.performance = Date.now() - startTime;
      
      console.error('❌ SSE Cleanup error:', error);
      return result;
    }
  }

  /**
   * Cleanup inactive connections
   */
  private static async cleanupInactiveConnections(
    clients: Map<string, SSEClient>,
    config: SSECleanupConfig
  ): Promise<{ cleaned: number; errors: string[] }> {
    const now = Date.now();
    const inactiveThreshold = now - config.maxInactiveTime;
    const toRemove: string[] = [];
    const errors: string[] = [];

    try {
      clients.forEach((client, userId) => {
        if (client.lastActivity < inactiveThreshold) {
          toRemove.push(userId);
        }
      });

      // Remove inactive connections
      if (!config.dryRun) {
        toRemove.forEach(userId => {
          try {
            clients.delete(userId);
          } catch (error) {
            errors.push(`Failed to remove client ${userId}: ${error}`);
          }
        });
      }

      return { cleaned: toRemove.length, errors };

    } catch (error) {
      errors.push(`Inactive connection cleanup failed: ${error}`);
      return { cleaned: 0, errors };
    }
  }

  /**
   * Cleanup stale connections
   */
  private static async cleanupStaleConnections(
    clients: Map<string, SSEClient>,
    config: SSECleanupConfig
  ): Promise<{ cleaned: number; errors: string[] }> {
    const now = Date.now();
    const staleThreshold = now - (config.maxInactiveTime * 2); // Double the inactive time
    const toRemove: string[] = [];
    const errors: string[] = [];

    try {
      clients.forEach((client, userId) => {
        // Check if connection is stale based on multiple criteria
        const isStale = 
          client.lastActivity < staleThreshold ||
          client.connectionQuality === 'critical' ||
          (now - client.connectedAt.getTime()) > (config.maxInactiveTime * 4);

        if (isStale) {
          toRemove.push(userId);
        }
      });

      // Remove stale connections
      if (!config.dryRun) {
        toRemove.forEach(userId => {
          try {
            clients.delete(userId);
          } catch (error) {
            errors.push(`Failed to remove stale client ${userId}: ${error}`);
          }
        });
      }

      return { cleaned: toRemove.length, errors };

    } catch (error) {
      errors.push(`Stale connection cleanup failed: ${error}`);
      return { cleaned: 0, errors };
    }
  }

  /**
   * Cleanup connections by user type
   */
  static async cleanupByUserType(
    clients: Map<string, SSEClient>,
    userType: string,
    config: Partial<SSECleanupConfig> = {}
  ): Promise<{ cleaned: number; errors: string[] }> {
    const cleanupConfig: SSECleanupConfig = {
      maxInactiveTime: 300000,
      maxMessageAge: 600000,
      batchSize: 100,
      dryRun: false,
      ...config
    };

    const toRemove: string[] = [];
    const errors: string[] = [];

    try {
      clients.forEach((client, userId) => {
        if (client.userType === userType) {
          toRemove.push(userId);
        }
      });

      if (!cleanupConfig.dryRun) {
        toRemove.forEach(userId => {
          try {
            clients.delete(userId);
          } catch (error) {
            errors.push(`Failed to remove ${userType} client ${userId}: ${error}`);
          }
        });
      }

      return { cleaned: toRemove.length, errors };

    } catch (error) {
      errors.push(`User type cleanup failed: ${error}`);
      return { cleaned: 0, errors };
    }
  }

  /**
   * Cleanup high-risk connections
   */
  static async cleanupHighRiskConnections(
    clients: Map<string, SSEClient>,
    config: Partial<SSECleanupConfig> = {}
  ): Promise<{ cleaned: number; errors: string[] }> {
    const cleanupConfig: SSECleanupConfig = {
      maxInactiveTime: 300000,
      maxMessageAge: 600000,
      batchSize: 100,
      dryRun: false,
      ...config
    };

    const toRemove: string[] = [];
    const errors: string[] = [];

    try {
      clients.forEach((client, userId) => {
        // Remove connections with critical quality or suspicious patterns
        if (
          client.connectionQuality === 'critical' ||
          client.messageCount === 0 && (Date.now() - client.connectedAt.getTime()) > 60000
        ) {
          toRemove.push(userId);
        }
      });

      if (!cleanupConfig.dryRun) {
        toRemove.forEach(userId => {
          try {
            clients.delete(userId);
          } catch (error) {
            errors.push(`Failed to remove high-risk client ${userId}: ${error}`);
          }
        });
      }

      return { cleaned: toRemove.length, errors };

    } catch (error) {
      errors.push(`High-risk cleanup failed: ${error}`);
      return { cleaned: 0, errors };
    }
  }

  /**
   * Schedule automatic cleanup
   */
  static scheduleAutomaticCleanup(
    clients: Map<string, SSEClient>,
    intervalMinutes: number = 5
  ): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        await this.performCleanup(clients);
      } catch (error) {
        console.error('❌ Automatic SSE cleanup failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Get cleanup statistics
   */
  static getCleanupStats(): SSECleanupStats {
    return { ...this.stats };
  }

  /**
   * Update cleanup statistics
   */
  private static updateStats(result: SSECleanupResult, duration: number): void {
    this.stats.totalCleanups++;
    this.stats.connectionsCleaned += result.cleanedConnections;
    this.stats.messagesCleaned += result.cleanedMessages;
    this.stats.averageCleanupTime = 
      (this.stats.averageCleanupTime + duration) / 2;
    this.stats.lastCleanup = new Date();
    this.stats.errors.push(...result.errors);
  }

  /**
   * Reset cleanup statistics
   */
  static resetCleanupStats(): void {
    this.stats = {
      totalCleanups: 0,
      connectionsCleaned: 0,
      messagesCleaned: 0,
      averageCleanupTime: 0,
      lastCleanup: new Date(),
      errors: []
    };
  }
}
