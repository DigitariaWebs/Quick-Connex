/**
 * SSE Metrics Component
 * 
 * Handles performance metrics and monitoring for SSE connections.
 * Similar to SessionMetrics in the session system.
 */

import { SSEPerformanceMetrics, SSEClient, ServerStats } from './SSETypes';

export interface SSEMetricsConfig {
  enableMetrics: boolean;
  metricsInterval: number;
  maxMetricsHistory: number;
  enablePerformanceTracking: boolean;
}

export const SSE_METRICS_CONFIG: SSEMetricsConfig = {
  enableMetrics: true,
  metricsInterval: 60000, // 1 minute
  maxMetricsHistory: 100,
  enablePerformanceTracking: true
};

export class SSEMetrics {
  private static instance: SSEMetrics;
  
  // Performance metrics
  private metrics: SSEPerformanceMetrics = {
    averageConnectionTime: 0,
    averageMessageLatency: 0,
    connectionSuccessRate: 0,
    messageDeliveryRate: 0,
    activeConnections: 0,
    totalMessages: 0,
    errorRate: 0
  };

  // Historical metrics
  private metricsHistory: SSEPerformanceMetrics[] = [];
  
  // Connection tracking
  private connectionTimes: number[] = [];
  private messageLatencies: number[] = [];
  private connectionAttempts: number = 0;
  private successfulConnections: number = 0;
  private failedConnections: number = 0;
  private totalMessages: number = 0;
  private failedMessages: number = 0;

  // Timers
  private metricsTimer: NodeJS.Timeout | null = null;

  private constructor() {
    if (SSE_METRICS_CONFIG.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  public static getInstance(): SSEMetrics {
    if (!SSEMetrics.instance) {
      SSEMetrics.instance = new SSEMetrics();
    }
    return SSEMetrics.instance;
  }

  /**
   * Record connection attempt
   */
  public recordConnectionAttempt(): void {
    this.connectionAttempts++;
  }

  /**
   * Record successful connection
   */
  public recordSuccessfulConnection(connectionTime: number): void {
    this.successfulConnections++;
    this.connectionTimes.push(connectionTime);
    this.updateConnectionMetrics();
  }

  /**
   * Record failed connection
   */
  public recordFailedConnection(): void {
    this.failedConnections++;
    this.updateConnectionMetrics();
  }

  /**
   * Record message sent
   */
  public recordMessageSent(latency?: number): void {
    this.totalMessages++;
    if (latency !== undefined) {
      this.messageLatencies.push(latency);
      this.updateMessageMetrics();
    }
  }

  /**
   * Record failed message
   */
  public recordFailedMessage(): void {
    this.failedMessages++;
    this.updateMessageMetrics();
  }

  /**
   * Update connection metrics
   */
  private updateConnectionMetrics(): void {
    this.metrics.connectionSuccessRate = this.connectionAttempts > 0 
      ? (this.successfulConnections / this.connectionAttempts) * 100 
      : 0;

    if (this.connectionTimes.length > 0) {
      this.metrics.averageConnectionTime = 
        this.connectionTimes.reduce((a, b) => a + b, 0) / this.connectionTimes.length;
    }
  }

  /**
   * Update message metrics
   */
  private updateMessageMetrics(): void {
    this.metrics.messageDeliveryRate = this.totalMessages > 0 
      ? ((this.totalMessages - this.failedMessages) / this.totalMessages) * 100 
      : 0;

    if (this.messageLatencies.length > 0) {
      this.metrics.averageMessageLatency = 
        this.messageLatencies.reduce((a, b) => a + b, 0) / this.messageLatencies.length;
    }
  }

  /**
   * Update active connections count
   */
  public updateActiveConnections(count: number): void {
    this.metrics.activeConnections = count;
  }

  /**
   * Update total messages count
   */
  public updateTotalMessages(count: number): void {
    this.metrics.totalMessages = count;
  }

  /**
   * Calculate error rate
   */
  public calculateErrorRate(): number {
    const totalOperations = this.connectionAttempts + this.totalMessages;
    const totalErrors = this.failedConnections + this.failedMessages;
    
    this.metrics.errorRate = totalOperations > 0 
      ? (totalErrors / totalOperations) * 100 
      : 0;
    
    return this.metrics.errorRate;
  }

  /**
   * Get current metrics
   */
  public getMetrics(): SSEPerformanceMetrics {
    this.calculateErrorRate();
    return { ...this.metrics };
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(): SSEPerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get detailed statistics
   */
  public getDetailedStats(): {
    metrics: SSEPerformanceMetrics;
    history: SSEPerformanceMetrics[];
    raw: {
      connectionAttempts: number;
      successfulConnections: number;
      failedConnections: number;
      totalMessages: number;
      failedMessages: number;
      connectionTimes: number[];
      messageLatencies: number[];
    };
  } {
    return {
      metrics: this.getMetrics(),
      history: this.getMetricsHistory(),
      raw: {
        connectionAttempts: this.connectionAttempts,
        successfulConnections: this.successfulConnections,
        failedConnections: this.failedConnections,
        totalMessages: this.totalMessages,
        failedMessages: this.failedMessages,
        connectionTimes: [...this.connectionTimes],
        messageLatencies: [...this.messageLatencies]
      }
    };
  }

  /**
   * Calculate server statistics
   */
  public calculateServerStats(clients: Map<string, SSEClient>): ServerStats {
    const now = Date.now();
    const connectionsByType: Record<string, number> = {};
    let totalDuration = 0;
    let connectionCount = 0;

    clients.forEach(client => {
      // Count by user type
      connectionsByType[client.userType] = (connectionsByType[client.userType] || 0) + 1;
      
      // Calculate average connection duration
      const duration = now - client.connectedAt.getTime();
      totalDuration += duration;
      connectionCount++;
    });

    return {
      totalConnections: this.connectionAttempts,
      activeConnections: clients.size,
      connectionsByType,
      averageConnectionDuration: connectionCount > 0 ? totalDuration / connectionCount : 0,
      totalMessagesSent: this.totalMessages,
      lastCleanup: new Date()
    };
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.collectMetrics();
    }, SSE_METRICS_CONFIG.metricsInterval);
  }

  /**
   * Collect and store metrics
   */
  private collectMetrics(): void {
    const currentMetrics = this.getMetrics();
    this.metricsHistory.push(currentMetrics);

    // Keep only recent history
    if (this.metricsHistory.length > SSE_METRICS_CONFIG.maxMetricsHistory) {
      this.metricsHistory = this.metricsHistory.slice(-SSE_METRICS_CONFIG.maxMetricsHistory);
    }

    // Clean up old data
    this.cleanupOldData();
  }

  /**
   * Clean up old performance data
   */
  private cleanupOldData(): void {
    const maxAge = 300000; // 5 minutes
    const now = Date.now();

    // Keep only recent connection times
    this.connectionTimes = this.connectionTimes.filter(time => now - time < maxAge);
    
    // Keep only recent message latencies
    this.messageLatencies = this.messageLatencies.filter(latency => latency < maxAge);
  }

  /**
   * Reset all metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      averageConnectionTime: 0,
      averageMessageLatency: 0,
      connectionSuccessRate: 0,
      messageDeliveryRate: 0,
      activeConnections: 0,
      totalMessages: 0,
      errorRate: 0
    };

    this.metricsHistory = [];
    this.connectionTimes = [];
    this.messageLatencies = [];
    this.connectionAttempts = 0;
    this.successfulConnections = 0;
    this.failedConnections = 0;
    this.totalMessages = 0;
    this.failedMessages = 0;
  }

  /**
   * Stop metrics collection
   */
  public stopMetricsCollection(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    status: 'excellent' | 'good' | 'poor' | 'critical';
    score: number;
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    let score = 100;
    const recommendations: string[] = [];

    // Connection success rate scoring
    if (metrics.connectionSuccessRate < 50) {
      score -= 30;
      recommendations.push('Connection success rate is very low');
    } else if (metrics.connectionSuccessRate < 80) {
      score -= 15;
      recommendations.push('Connection success rate could be improved');
    }

    // Message delivery rate scoring
    if (metrics.messageDeliveryRate < 70) {
      score -= 25;
      recommendations.push('Message delivery rate is low');
    } else if (metrics.messageDeliveryRate < 90) {
      score -= 10;
      recommendations.push('Message delivery rate could be improved');
    }

    // Error rate scoring
    if (metrics.errorRate > 20) {
      score -= 20;
      recommendations.push('Error rate is high');
    } else if (metrics.errorRate > 10) {
      score -= 10;
      recommendations.push('Error rate could be reduced');
    }

    // Connection time scoring
    if (metrics.averageConnectionTime > 5000) {
      score -= 15;
      recommendations.push('Connection time is slow');
    }

    // Message latency scoring
    if (metrics.averageMessageLatency > 1000) {
      score -= 10;
      recommendations.push('Message latency is high');
    }

    let status: 'excellent' | 'good' | 'poor' | 'critical';
    if (score >= 90) status = 'excellent';
    else if (score >= 70) status = 'good';
    else if (score >= 50) status = 'poor';
    else status = 'critical';

    return { status, score, recommendations };
  }
}
