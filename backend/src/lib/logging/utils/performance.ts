/**
 * Performance Tracking Utilities
 * 
 * Functions for tracking performance metrics and timing operations.
 */

/**
 * Performance tracker class
 */
export class PerformanceTracker {
  private timers: Map<string, number> = new Map();
  private metrics: Map<string, number[]> = new Map();

  /**
   * Start a timer for a given label
   */
  startTimer(label: string): void {
    this.timers.set(label, Date.now());
  }

  /**
   * End a timer and return the duration
   */
  endTimer(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(label);

    // Store metrics for analysis
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(duration);

    return duration;
  }

  /**
   * Get performance metrics for a label
   */
  getMetrics(label?: string): Record<string, number[]> {
    if (label) {
      return { [label]: this.metrics.get(label) || [] };
    }
    
    const result: Record<string, number[]> = {};
    this.metrics.forEach((values, key) => {
      result[key] = values;
    });
    return result;
  }

  /**
   * Get average duration for a label
   */
  getAverageDuration(label: string): number {
    const values = this.metrics.get(label) || [];
    if (values.length === 0) return 0;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.timers.clear();
  }
}

/**
 * Create a new performance tracker instance
 */
export function createPerformanceTracker(): PerformanceTracker {
  return new PerformanceTracker();
}
