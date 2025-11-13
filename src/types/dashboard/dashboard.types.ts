/**
 * Dashboard Types
 * 
 * Comprehensive types for the admin dashboard including:
 * - Dashboard statistics
 * - System health metrics
 * - Service status
 * - Recent activity
 * - Trend data
 */

export interface DashboardStats {
  activeUsers: number;
  totalUsers: number;
  transfersToday: number;
  transfersTotal: number;
  notificationsSent: number;
  pendingApprovals: number;
  systemHealth: SystemHealth;
  recentActivity: RecentActivity[];
  trends: TrendData;
  timestamp: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number; // in seconds
  services: ServiceHealthMap;
  overallScore: number; // 0-100
}

export interface ServiceHealthMap {
  database: ServiceHealth;
  api: ServiceHealth;
}

export interface ServiceHealth {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency?: number; // in milliseconds
  uptime?: number; // in seconds
  lastCheck: string;
  metadata?: {
    connections?: number;
    activeConnections?: number;
    errorRate?: number;
    [key: string]: any;
  };
}

export interface RecentActivity {
  id: string;
  type: 'user' | 'transfer' | 'system' | 'notification' | 'security';
  action: string;
  description: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    email: string;
    userType: string;
  };
  metadata?: {
    targetId?: string;
    targetType?: string;
    changes?: any;
    [key: string]: any;
  };
}

export interface TrendData {
  activeUsers: {
    current: number;
    previous: number;
    change: string;
    trend: 'up' | 'down' | 'stable';
  };
  transfers: {
    current: number;
    previous: number;
    change: string;
    trend: 'up' | 'down' | 'stable';
  };
  notifications: {
    current: number;
    previous: number;
    change: string;
    trend: 'up' | 'down' | 'stable';
  };
  systemHealth: {
    current: number;
    previous: number;
    change: string;
    trend: 'up' | 'down' | 'stable';
  };
  totalUsers: {
    current: number;
    previous: number;
    change: string;
    trend: 'up' | 'down' | 'stable';
  };
  pendingApprovals: {
    current: number;
    previous: number;
    change: string;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface SSEStats {
  activeConnections: number;
  totalConnections: number;
  connectionsByType: {
    [key: string]: number;
  };
  connectionQuality: {
    excellent: number;
    good: number;
    poor: number;
    critical: number;
  };
  averageConnectionDuration: number; // in minutes
  eventsPerMinute: number;
  reconnectionRate: number; // percentage
}

export interface DashboardError {
  message: string;
  code?: string;
  timestamp: string;
  retryable: boolean;
}

export interface DashboardLoadingState {
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: string | null;
}

// Helper type for stat cards
export interface StatCard {
  name: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: any; // Lucide icon component
  color: string;
  bgColor: string;
  isLive?: boolean;
}

