import { useState, useEffect, useCallback } from 'react';
import { dashboardClient } from '@/lib/client';
import { SystemHealth } from '@/lib/client';

/**
 * useSystemHealth Hook
 * 
 * Thin React hook that manages system health state and delegates business logic to DashboardClient.
 * Follows Clean Architecture by separating UI concerns from business logic.
 */

interface UseSystemHealthOptions {
  pollInterval?: number; // in milliseconds (default: 15000 = 15 seconds)
  enablePolling?: boolean; // default: true
}

interface UseSystemHealthReturn {
  health: SystemHealth | null;
  isHealthy: boolean;
  isDegraded: boolean;
  isDown: boolean;
  lastCheck: string | null;
  refresh: () => Promise<void>;
}

export function useSystemHealth(
  options: UseSystemHealthOptions = {}
): UseSystemHealthReturn {
  const {
    pollInterval = 15000,
    enablePolling = true
  } = options;

  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  /**
   * Fetch system health using DashboardClient
   */
  const fetchSystemHealth = useCallback(async () => {
    try {
      const healthData = await dashboardClient.fetchSystemHealth();
      setHealth(healthData);
      setLastCheck(new Date().toISOString());
    } catch (err) {
      console.error('❌ System health fetch error:', err);
      // Set degraded state on error
      setHealth(prev => prev ? { ...prev, status: 'degraded' } : null);
    }
  }, []);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchSystemHealth();
  }, [fetchSystemHealth]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchSystemHealth();
  }, [fetchSystemHealth]);

  /**
   * Set up polling for health checks
   */
  useEffect(() => {
    if (!enablePolling || pollInterval <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      fetchSystemHealth();
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [enablePolling, pollInterval, fetchSystemHealth]);

  // Calculate health status flags
  const isHealthy = health?.status === 'healthy';
  const isDegraded = health?.status === 'degraded';
  const isDown = health?.status === 'down';

  return {
    health,
    isHealthy,
    isDegraded,
    isDown,
    lastCheck,
    refresh
  };
}

