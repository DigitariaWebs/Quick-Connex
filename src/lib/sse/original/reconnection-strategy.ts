/**
 * Exponential Backoff Reconnection Strategy
 * 
 * Implements smart reconnection with exponential backoff to prevent
 * connection storms and reduce server load.
 */

export interface ReconnectionConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export class ExponentialBackoff {
  private attempts: number = 0;
  private config: ReconnectionConfig;
  private lastAttemptTime: number = 0;

  constructor(config?: Partial<ReconnectionConfig>) {
    this.config = {
      maxAttempts: 10,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
      jitter: true,
      ...config
    };
  }

  /**
   * Record a reconnection attempt
   */
  public recordAttempt(): void {
    this.attempts++;
    this.lastAttemptTime = Date.now();
  }

  /**
   * Reset attempts counter
   */
  public reset(): void {
    this.attempts = 0;
  }

  /**
   * Get current attempt count
   */
  public getAttempts(): number {
    return this.attempts;
  }

  /**
   * Check if should attempt reconnection
   */
  public shouldReconnect(): boolean {
    return this.attempts < this.config.maxAttempts;
  }

  /**
   * Get delay for next reconnection attempt
   */
  public getDelay(): number {
    if (this.attempts === 0) {
      return 0;
    }

    // Calculate exponential backoff delay
    const exponentialDelay = this.config.baseDelay * 
      Math.pow(this.config.backoffMultiplier, this.attempts - 1);

    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);

    // Add jitter to prevent thundering herd
    if (this.config.jitter) {
      const jitterAmount = cappedDelay * 0.1; // 10% jitter
      const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
      return Math.max(0, cappedDelay + jitter);
    }

    return cappedDelay;
  }

  /**
   * Get time until next attempt is allowed
   */
  public getTimeUntilNextAttempt(): number {
    const delay = this.getDelay();
    const timeSinceLastAttempt = Date.now() - this.lastAttemptTime;
    return Math.max(0, delay - timeSinceLastAttempt);
  }

  /**
   * Check if enough time has passed for next attempt
   */
  public canAttemptNow(): boolean {
    return this.getTimeUntilNextAttempt() <= 0;
  }

  /**
   * Get reconnection statistics
   */
  public getStats(): {
    attempts: number;
    maxAttempts: number;
    nextDelay: number;
    timeUntilNext: number;
    canAttempt: boolean;
  } {
    return {
      attempts: this.attempts,
      maxAttempts: this.config.maxAttempts,
      nextDelay: this.getDelay(),
      timeUntilNext: this.getTimeUntilNextAttempt(),
      canAttempt: this.canAttemptNow()
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ReconnectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Smart Reconnection Manager
 * 
 * Manages reconnection attempts with circuit breaker pattern
 * and adaptive strategies based on connection quality.
 */
export class SmartReconnectionManager {
  private backoff: ExponentialBackoff;
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private circuitBreakerFailures: number = 0;
  private circuitBreakerThreshold: number = 5;
  private circuitBreakerTimeout: number = 60000; // 1 minute
  private lastCircuitBreakerReset: number = 0;

  constructor(config?: Partial<ReconnectionConfig>) {
    this.backoff = new ExponentialBackoff(config);
  }

  /**
   * Record a successful connection
   */
  public recordSuccess(): void {
    this.backoff.reset();
    this.circuitBreakerState = 'closed';
    this.circuitBreakerFailures = 0;
    this.lastCircuitBreakerReset = Date.now();
  }

  /**
   * Record a failed connection attempt
   */
  public recordFailure(): void {
    this.backoff.recordAttempt();
    this.circuitBreakerFailures++;
    
    if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
      this.circuitBreakerState = 'open';
      this.lastCircuitBreakerReset = Date.now();
    }
  }

  /**
   * Check if reconnection should be attempted
   */
  public shouldAttemptReconnection(): boolean {
    // Check circuit breaker
    if (this.circuitBreakerState === 'open') {
      const timeSinceOpen = Date.now() - this.lastCircuitBreakerReset;
      if (timeSinceOpen > this.circuitBreakerTimeout) {
        this.circuitBreakerState = 'half-open';
        return true;
      }
      return false;
    }

    // Check if we've exceeded max attempts
    if (!this.backoff.shouldReconnect()) {
      return false;
    }

    // Check if enough time has passed
    return this.backoff.canAttemptNow();
  }

  /**
   * Get delay for next reconnection attempt
   */
  public getReconnectionDelay(): number {
    if (this.circuitBreakerState === 'open') {
      return this.circuitBreakerTimeout;
    }
    
    return this.backoff.getDelay();
  }

  /**
   * Get current state
   */
  public getState(): {
    isReconnecting: boolean;
    attempts: number;
    maxAttempts: number;
    nextAttempt: number | null;
    backoffMultiplier: number;
  } {
    return {
      isReconnecting: this.circuitBreakerState !== 'closed',
      attempts: this.backoff.getAttempts(),
      maxAttempts: this.backoff.getAttempts(),
      nextAttempt: this.shouldAttemptReconnection() ? Date.now() + this.getReconnectionDelay() : null,
      backoffMultiplier: this.backoff['config'].backoffMultiplier
    };
  }
}
