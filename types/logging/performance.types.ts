/**
 * Performance Tracker Types
 * 
 * Type definitions for performance tracking interfaces.
 */

export interface PerformanceTracker {
  start(label: string): void;
  end(label: string): number;
  getMetrics(): Record<string, number>;
}
