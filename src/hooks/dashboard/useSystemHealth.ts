import { useState, useEffect, useCallback } from 'react';
import { SystemHealth } from '@/types/dashboard';

/**
 * useSystemHealth Hook
 * 
 * Custom hook for monitoring system health status
 * 
 * Features:
 * - Real-time health monitoring
 * - Service-level status tracking
 * - Automatic polling
 * - Health score calculation
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
   * Fetch system health from dashboard stats
   */
  const fetchSystemHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch system health');
      }

      const result = await response.json();

      if (result.success && result.data.systemHealth) {
        setHealth(result.data.systemHealth);
        setLastCheck(new Date().toISOString());
      }

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

