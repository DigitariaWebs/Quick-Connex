/**
 * Database Monitoring Service
 * 
 * Comprehensive database monitoring with real-time metrics collection,
 * alert generation, performance recommendations, and index usage tracking.
 */

import { 
  DatabaseMetrics,
  DatabaseAlert,
  IndexUsageStats,
  DatabaseHealth,
  DatabaseEvent,
  DatabaseError
} from '../../../types/database';
import { QueryMonitor } from './query-monitor';
import { 
  performDatabaseHealthCheck,
  calculateDatabaseMetrics,
  calculateIndexUsageStats,
  monitorMemoryUsage,
  checkForMemoryLeaks,
  generateHealthReport,
  HealthCheckScheduler
} from '../utils/health';
import { 
  getConnectionStats,
  getPoolStats
} from '../utils/connection';
import { MONITORING_THRESHOLDS, HEALTH_STATUS } from '../core/constants';

/**
 * Database Monitoring Service
 */
export class DatabaseMonitoringService {
  private static instance: DatabaseMonitoringService;
  private queryMonitor: QueryMonitor;
  private alerts: DatabaseAlert[] = [];
  private metrics: DatabaseMetrics | null = null;
  private healthScheduler: HealthCheckScheduler | null = null;
  private eventListeners: ((event: DatabaseEvent) => void)[] = [];
  private connection: any = null;
  private config: any = null;
  private enabled = false;

  private constructor() {
    this.queryMonitor = QueryMonitor.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DatabaseMonitoringService {
    if (!DatabaseMonitoringService.instance) {
      DatabaseMonitoringService.instance = new DatabaseMonitoringService();
    }
    return DatabaseMonitoringService.instance;
  }

  /**
   * Initialize monitoring service
   */
  async initialize(connection: any, config: any): Promise<void> {
    this.connection = connection;
    this.config = config;
    this.enabled = config.monitoring?.enabled ?? true;

    if (this.enabled) {
      this.queryMonitor.enable();
      this.startHealthMonitoring();
      this.setupEventListeners();
      console.log('Database monitoring service initialized');
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (!this.enabled) return;

    this.healthScheduler = new HealthCheckScheduler(
      async () => this.performHealthCheck(),
      MONITORING_THRESHOLDS.HEALTH_CHECK_INTERVAL
    );

    this.healthScheduler.onHealthUpdate((health) => {
      this.handleHealthUpdate(health);
    });

    this.healthScheduler.start();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.queryMonitor.addEventListener((event) => {
      this.handleDatabaseEvent(event);
    });
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<DatabaseHealth> {
    try {
      const connectionStats = getConnectionStats(this.connection);
      const poolStats = getPoolStats(this.connection, this.config);
      const queryStats = this.queryMonitor.getQueryStats();
      
      const health = await performDatabaseHealthCheck(
        this.connection,
        queryStats,
        connectionStats
      );

      this.metrics = calculateDatabaseMetrics(
        poolStats,
        queryStats,
        health.memory,
        this.getIndexUsageStats(),
        this.queryMonitor.getSlowQueries(),
        this.getRecentErrors()
      );

      return health;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): DatabaseMetrics | null {
    return this.metrics;
  }

  /**
   * Get index usage statistics
   */
  getIndexUsageStats(): IndexUsageStats {
    // In a real implementation, you'd query the database for actual index stats
    return calculateIndexUsageStats();
  }

  /**
   * Get recent errors
   */
  getRecentErrors(): DatabaseError[] {
    // In a real implementation, you'd track actual errors
    return [];
  }

  /**
   * Generate performance recommendations
   */
  generatePerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (!this.metrics) {
      return ['Collect more metrics data for recommendations'];
    }

    const { queryPerformance, memoryUsage, indexUsage } = this.metrics;

    // Query performance recommendations
    if (queryPerformance.averageExecutionTime > MONITORING_THRESHOLDS.SLOW_QUERY) {
      recommendations.push('Consider optimizing slow queries or adding indexes');
    }

    if (queryPerformance.slowQueries > 10) {
      recommendations.push('Review and optimize frequently slow queries');
    }

    // Memory recommendations
    if (memoryUsage.utilization > MONITORING_THRESHOLDS.MEMORY_WARNING) {
      recommendations.push('Monitor memory usage and consider garbage collection');
    }

    // Index recommendations
    if (indexUsage.indexHitRatio < 80) {
      recommendations.push('Review unused indexes and consider removing them');
    }

    if (indexUsage.unusedIndexes.length > 0) {
      recommendations.push(`Remove unused indexes: ${indexUsage.unusedIndexes.join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Create alert
   */
  createAlert(
    type: 'performance' | 'connection' | 'memory' | 'error',
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    metadata: any = {}
  ): DatabaseAlert {
    const alert: DatabaseAlert = {
      id: this.generateAlertId(),
      type,
      severity,
      message,
      timestamp: new Date(),
      resolved: false,
      metadata
    };

    this.alerts.push(alert);
    this.emitAlertEvent(alert);

    return alert;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): DatabaseAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get alerts by type
   */
  getAlertsByType(type: 'performance' | 'connection' | 'memory' | 'error'): DatabaseAlert[] {
    return this.alerts.filter(alert => alert.type === type);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Clear resolved alerts
   */
  clearResolvedAlerts(): number {
    const initialLength = this.alerts.length;
    this.alerts = this.alerts.filter(alert => !alert.resolved);
    return initialLength - this.alerts.length;
  }

  /**
   * Handle health update
   */
  private handleHealthUpdate(health: DatabaseHealth): void {
    // Check for issues and create alerts
    if (health.status === HEALTH_STATUS.CRITICAL) {
      this.createAlert(
        'connection',
        'critical',
        'Database health is critical',
        { health }
      );
    } else if (health.status === HEALTH_STATUS.DEGRADED) {
      this.createAlert(
        'performance',
        'medium',
        'Database performance is degraded',
        { health }
      );
    }

    // Check individual issues
    health.issues.forEach(issue => {
      if (issue.includes('memory')) {
        this.createAlert('memory', 'high', issue, { health });
      } else if (issue.includes('connection')) {
        this.createAlert('connection', 'high', issue, { health });
      } else if (issue.includes('query')) {
        this.createAlert('performance', 'medium', issue, { health });
      }
    });
  }

  /**
   * Handle database events
   */
  private handleDatabaseEvent(event: DatabaseEvent): void {
    // Process different event types
    switch (event.type) {
      case 'slow_query':
        this.handleSlowQueryEvent(event);
        break;
      case 'error':
        this.handleErrorEvent(event);
        break;
      default:
        // Handle other events
        break;
    }

    // Emit to external listeners
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in database event listener:', error);
      }
    });
  }

  /**
   * Handle slow query events
   */
  private handleSlowQueryEvent(event: DatabaseEvent): void {
    const data = event.data as any;
    
    if (data.executionTime > this.config.monitoring?.slowQueryThreshold * 2) {
      this.createAlert(
        'performance',
        'high',
        `Very slow query detected: ${data.operation} on ${data.model} took ${data.executionTime}ms`,
        { event }
      );
    }
  }

  /**
   * Handle error events
   */
  private handleErrorEvent(event: DatabaseEvent): void {
    this.createAlert(
      'error',
      'medium',
      `Database error: ${event.data}`,
      { event }
    );
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: DatabaseEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: DatabaseEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    enabled: boolean;
    healthStatus: string;
    activeAlerts: number;
    totalQueries: number;
    slowQueries: number;
    uptime: number;
  } {
    const queryStats = this.queryMonitor.getQueryStats();
    const activeAlerts = this.getActiveAlerts().length;
    
    return {
      enabled: this.enabled,
      healthStatus: this.metrics ? 'monitoring' : 'not_monitored',
      activeAlerts,
      totalQueries: queryStats.totalQueries,
      slowQueries: queryStats.slowQueries,
      uptime: process.uptime()
    };
  }

  /**
   * Generate monitoring report
   */
  async generateReport(): Promise<{
    summary: string;
    health: DatabaseHealth;
    metrics: DatabaseMetrics | null;
    alerts: DatabaseAlert[];
    recommendations: string[];
  }> {
    const health = await this.performHealthCheck();
    const healthReport = generateHealthReport(health);
    const recommendations = this.generatePerformanceRecommendations();

    return {
      summary: healthReport.summary,
      health,
      metrics: this.metrics,
      alerts: this.getActiveAlerts(),
      recommendations
    };
  }

  /**
   * Export monitoring data
   */
  exportData(): {
    metrics: DatabaseMetrics | null;
    alerts: DatabaseAlert[];
    queryData: any;
    configuration: any;
  } {
    return {
      metrics: this.metrics,
      alerts: [...this.alerts],
      queryData: this.queryMonitor.exportQueryData(),
      configuration: {
        enabled: this.enabled,
        config: this.config
      }
    };
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.healthScheduler) {
      this.healthScheduler.stop();
    }
    
    this.queryMonitor.disable();
    this.enabled = false;
    
    console.log('Database monitoring stopped');
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Emit alert event
   */
  private emitAlertEvent(alert: DatabaseAlert): void {
    const event: DatabaseEvent = {
      type: 'alert',
      timestamp: alert.timestamp,
      data: alert
    };

    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in alert event listener:', error);
      }
    });
  }

  /**
   * Get memory leak detection
   */
  async checkMemoryLeaks(): Promise<{
    hasLeak: boolean;
    severity: 'low' | 'medium' | 'high';
    recommendations: string[];
  }> {
    const memoryData = monitorMemoryUsage();
    return checkForMemoryLeaks([memoryData.current]);
  }

  /**
   * Get query monitor instance
   */
  getQueryMonitor(): QueryMonitor {
    return this.queryMonitor;
  }

  /**
   * Update configuration
   */
  updateConfiguration(config: any): void {
    this.config = { ...this.config, ...config };
    
    if (config.monitoring?.slowQueryThreshold) {
      this.queryMonitor.setSlowQueryThreshold(config.monitoring.slowQueryThreshold);
    }
    
    if (config.monitoring?.maxQueryHistory) {
      this.queryMonitor.setMaxQueryHistory(config.monitoring.maxQueryHistory);
    }
  }
}
