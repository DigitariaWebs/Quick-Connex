/**
 * Heartbeat Manager
 * 
 * Manages connection health monitoring with adaptive heartbeat intervals
 * and connection quality assessment.
 */

export interface HeartbeatConfig {
  interval: number;
  timeout: number;
  maxMissedHeartbeats: number;
  adaptiveInterval: boolean;
  qualityThresholds: {
    excellent: number;
    good: number;
    poor: number;
  };
}

export class HeartbeatManager {
  private interval: number;
  private timeout: number;
  private maxMissedHeartbeats: number;
  private adaptiveInterval: boolean;
  private qualityThresholds: HeartbeatConfig['qualityThresholds'];
  
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = 0;
  private missedHeartbeats: number = 0;
  private onTimeoutCallback: (() => void) | null = null;
  private isRunning: boolean = false;
  
  // Connection quality tracking
  private responseTimes: number[] = [];
  private maxResponseTimeHistory: number = 10;
  private connectionQuality: 'excellent' | 'good' | 'poor' | 'critical' = 'critical';

  constructor(
    onTimeout: () => void,
    config?: Partial<HeartbeatConfig>
  ) {
    this.onTimeoutCallback = onTimeout;
    
    const defaultConfig: HeartbeatConfig = {
      interval: 30000, // 30 seconds
      timeout: 60000, // 1 minute
      maxMissedHeartbeats: 3,
      adaptiveInterval: true,
      qualityThresholds: {
        excellent: 100, // < 100ms response time
        good: 500,      // < 500ms response time
        poor: 1000      // < 1000ms response time
      }
    };

    const finalConfig = { ...defaultConfig, ...config };
    this.interval = finalConfig.interval;
    this.timeout = finalConfig.timeout;
    this.maxMissedHeartbeats = finalConfig.maxMissedHeartbeats;
    this.adaptiveInterval = finalConfig.adaptiveInterval;
    this.qualityThresholds = finalConfig.qualityThresholds;
  }

  /**
   * Start heartbeat monitoring
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.lastHeartbeat = Date.now();
    this.missedHeartbeats = 0;
    this.scheduleNextHeartbeat();
  }

  /**
   * Stop heartbeat monitoring
   */
  public stop(): void {
    this.isRunning = false;
    this.clearTimers();
  }

  /**
   * Record activity (message received)
   */
  public recordActivity(): void {
    const now = Date.now();
    const responseTime = now - this.lastHeartbeat;
    
    // Track response time for quality assessment
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }
    
    this.lastHeartbeat = now;
    this.missedHeartbeats = 0;
    this.updateConnectionQuality();
    
    // Clear timeout timer since we got activity
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  /**
   * Get current connection quality
   */
  public getConnectionQuality(): 'excellent' | 'good' | 'poor' | 'critical' {
    return this.connectionQuality;
  }

  /**
   * Get heartbeat statistics
   */
  public getStats(): {
    isActive: boolean;
    lastHeartbeat: number | null;
    missedHeartbeats: number;
    quality: 'excellent' | 'good' | 'poor' | 'critical';
  } {
    return {
      isActive: this.isRunning,
      lastHeartbeat: this.lastHeartbeat || null,
      missedHeartbeats: this.missedHeartbeats,
      quality: this.connectionQuality as 'excellent' | 'good' | 'poor' | 'critical'
    };
  }

  /**
   * Update connection quality based on response times
   */
  private updateConnectionQuality(): void {
    if (this.responseTimes.length === 0) {
      this.connectionQuality = 'critical';
      return;
    }

    const averageResponseTime = this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    
    if (averageResponseTime < this.qualityThresholds.excellent) {
      this.connectionQuality = 'excellent';
    } else if (averageResponseTime < this.qualityThresholds.good) {
      this.connectionQuality = 'good';
    } else if (averageResponseTime < this.qualityThresholds.poor) {
      this.connectionQuality = 'poor';
    } else {
      this.connectionQuality = 'critical';
    }
  }

  /**
   * Schedule next heartbeat
   */
  private scheduleNextHeartbeat(): void {
    if (!this.isRunning) {
      return;
    }

    // Adaptive interval based on connection quality
    let heartbeatInterval = this.interval;
    if (this.adaptiveInterval) {
      switch (this.connectionQuality) {
        case 'excellent':
          heartbeatInterval = this.interval * 0.8; // 20% faster
          break;
        case 'good':
          heartbeatInterval = this.interval; // Normal
          break;
        case 'poor':
          heartbeatInterval = this.interval * 1.5; // 50% slower
          break;
        case 'critical':
          heartbeatInterval = this.interval * 2; // 100% slower
          break;
      }
    }

    this.heartbeatTimer = setTimeout(() => {
      this.performHeartbeat();
    }, heartbeatInterval);
  }

  /**
   * Perform heartbeat check
   */
  private performHeartbeat(): void {
    if (!this.isRunning) {
      return;
    }

    const now = Date.now();
    const timeSinceLastActivity = now - this.lastHeartbeat;

    if (timeSinceLastActivity > this.timeout) {
      this.missedHeartbeats++;
      
      if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
        this.handleTimeout();
        return;
      }
    }

    // Schedule next heartbeat
    this.scheduleNextHeartbeat();
  }

  /**
   * Handle heartbeat timeout
   */
  private handleTimeout(): void {
    if (this.onTimeoutCallback) {
      this.onTimeoutCallback();
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }
}

/**
 * Server-side Heartbeat Manager
 * 
 * Manages server-side heartbeat sending and client health monitoring.
 */
export class ServerHeartbeatManager {
  private interval: number;
  private isRunning: boolean = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private onCleanup: (() => void) | null = null;
  private onSendHeartbeat: (() => void) | null = null;

  constructor(
    onCleanup: () => void,
    onSendHeartbeat: () => void,
    interval: number = 30000 // 30 seconds
  ) {
    this.onCleanup = onCleanup;
    this.onSendHeartbeat = onSendHeartbeat;
    this.interval = interval;
  }

  /**
   * Start server heartbeat
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.scheduleHeartbeat();
  }

  /**
   * Stop server heartbeat
   */
  public stop(): void {
    this.isRunning = false;
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule next heartbeat
   */
  private scheduleHeartbeat(): void {
    if (!this.isRunning) {
      return;
    }

    this.heartbeatTimer = setTimeout(() => {
      if (this.onSendHeartbeat) {
        this.onSendHeartbeat();
      }
      this.scheduleHeartbeat();
    }, this.interval);
  }
}
