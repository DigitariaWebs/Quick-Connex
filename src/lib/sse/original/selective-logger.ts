/**
 * Selective Logger
 * 
 * Implements intelligent logging with rate limiting, filtering,
 * and performance optimization to reduce log spam.
 */

export interface LogLevel {
  ERROR: number;
  WARN: number;
  INFO: number;
  DEBUG: number;
}

export interface LoggerConfig {
  level: keyof LogLevel;
  maxLogsPerMinute: number;
  enableRateLimiting: boolean;
  enableFiltering: boolean;
  filters: string[];
  enablePerformance: boolean;
}

export class SelectiveLogger {
  private level: keyof LogLevel;
  private maxLogsPerMinute: number;
  private enableRateLimiting: boolean;
  private enableFiltering: boolean;
  private filters: string[];
  private enablePerformance: boolean;
  
  private logCounts: Map<string, number> = new Map();
  private lastResetTime: number = Date.now();
  private performanceMetrics: Map<string, number[]> = new Map();
  
  private readonly LOG_LEVELS: LogLevel = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
  };

  constructor(
    private context: string,
    config?: Partial<LoggerConfig>
  ) {
    const defaultConfig: LoggerConfig = {
      level: 'INFO',
      maxLogsPerMinute: 100,
      enableRateLimiting: true,
      enableFiltering: true,
      filters: ['heartbeat', 'debug', 'connection'],
      enablePerformance: false
    };

    const finalConfig = { ...defaultConfig, ...config };
    this.level = finalConfig.level;
    this.maxLogsPerMinute = finalConfig.maxLogsPerMinute;
    this.enableRateLimiting = finalConfig.enableRateLimiting;
    this.enableFiltering = finalConfig.enableFiltering;
    this.filters = finalConfig.filters;
    this.enablePerformance = finalConfig.enablePerformance;
  }

  /**
   * Log a message with selective filtering
   */
  public log(level: keyof LogLevel, message: string, data?: any): void {
    // Check log level
    if (this.LOG_LEVELS[level] > this.LOG_LEVELS[this.level]) {
      return;
    }

    // Check rate limiting
    if (this.enableRateLimiting && this.isRateLimited()) {
      return;
    }

    // Check filtering
    if (this.enableFiltering && this.shouldFilter(message)) {
      return;
    }

    // Record performance metrics
    if (this.enablePerformance) {
      this.recordPerformanceMetric(level, message);
    }

    // Log the message
    this.outputLog(level, message, data);
  }

  /**
   * Log error message
   */
  public error(message: string, data?: any): void {
    this.log('ERROR', message, data);
  }

  /**
   * Log warning message
   */
  public warn(message: string, data?: any): void {
    this.log('WARN', message, data);
  }

  /**
   * Log info message
   */
  public info(message: string, data?: any): void {
    this.log('INFO', message, data);
  }

  /**
   * Log debug message
   */
  public debug(message: string, data?: any): void {
    this.log('DEBUG', message, data);
  }

  /**
   * Check if logging is rate limited
   */
  private isRateLimited(): boolean {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    
    // Reset counters every minute
    if (timeSinceReset > 60000) {
      this.logCounts.clear();
      this.lastResetTime = now;
    }

    // Check if we've exceeded the rate limit
    const totalLogs = Array.from(this.logCounts.values()).reduce((sum, count) => sum + count, 0);
    return totalLogs >= this.maxLogsPerMinute;
  }

  /**
   * Check if message should be filtered
   */
  private shouldFilter(message: string): boolean {
    return this.filters.some(filter => 
      message.toLowerCase().includes(filter.toLowerCase())
    );
  }

  /**
   * Record performance metric
   */
  private recordPerformanceMetric(level: keyof LogLevel, message: string): void {
    const key = `${level}-${message}`;
    const now = Date.now();
    
    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, []);
    }
    
    const metrics = this.performanceMetrics.get(key)!;
    metrics.push(now);
    
    // Keep only last 100 entries
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  /**
   * Output log message
   */
  private outputLog(level: keyof LogLevel, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.context}] [${level}] ${message}`;
    
    // Count this log
    const countKey = `${level}-${message}`;
    const currentCount = this.logCounts.get(countKey) || 0;
    this.logCounts.set(countKey, currentCount + 1);
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }

  /**
   * Get logging statistics
   */
  public getStats(): {
    totalLogs: number;
    filteredLogs: number;
    lastLogTime: number | null;
    logLevel: string;
  } {
    const totalLogs = Array.from(this.logCounts.values()).reduce((sum, count) => sum + count, 0);
    const filteredLogs = this.logCounts.get('filtered') || 0;
    const lastLogTime = this.lastResetTime || null;
    const logLevel = this.level;

    return {
      totalLogs,
      filteredLogs,
      lastLogTime,
      logLevel
    };
  }

  /**
   * Update logger configuration
   */
  public updateConfig(newConfig: Partial<LoggerConfig>): void {
    if (newConfig.level) this.level = newConfig.level;
    if (newConfig.maxLogsPerMinute) this.maxLogsPerMinute = newConfig.maxLogsPerMinute;
    if (newConfig.enableRateLimiting !== undefined) this.enableRateLimiting = newConfig.enableRateLimiting;
    if (newConfig.enableFiltering !== undefined) this.enableFiltering = newConfig.enableFiltering;
    if (newConfig.filters) this.filters = newConfig.filters;
    if (newConfig.enablePerformance !== undefined) this.enablePerformance = newConfig.enablePerformance;
  }

  /**
   * Clear all logs and reset counters
   */
  public clear(): void {
    this.logCounts.clear();
    this.performanceMetrics.clear();
    this.lastResetTime = Date.now();
  }
}
