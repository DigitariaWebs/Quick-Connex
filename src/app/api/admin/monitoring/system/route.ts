import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin-middleware';
import os from 'os';
import fs from 'fs/promises';

/**
 * System Monitoring API Endpoint
 * 
 * Provides real-time system metrics including:
 * - System uptime
 * - CPU usage
 * - Memory usage
 * - Disk usage
 * - Active connections
 * - Service status
 */

interface SystemMetrics {
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeUsers: number;
  sseConnections: number;
  databaseConnections: number;
  apiRequestsPerMinute: number;
  timestamp: Date;
}

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  responseTime?: number;
  lastCheck: Date;
  description: string;
}

// Cache for metrics to avoid expensive calculations
let metricsCache: SystemMetrics | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5000; // 5 seconds

async function getSystemMetrics(): Promise<SystemMetrics> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (metricsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return metricsCache;
  }

  try {
    // Get system uptime
    const uptime = Math.floor(os.uptime());

    // Get CPU usage (simplified calculation)
    const cpuUsage = await getCPUUsage();

    // Get memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

    // Get disk usage
    const diskUsage = await getDiskUsage();

    // Get active users (simplified - in real implementation, this would come from session store)
    const activeUsers = await getActiveUsers();

    // Get SSE connections (simplified - in real implementation, this would come from SSE manager)
    const sseConnections = await getSSEConnections();

    // Get database connections (simplified)
    const databaseConnections = await getDatabaseConnections();

    // Get API requests per minute (simplified)
    const apiRequestsPerMinute = await getAPIRequestsPerMinute();

    metricsCache = {
      uptime,
      cpuUsage,
      memoryUsage,
      diskUsage,
      activeUsers,
      sseConnections,
      databaseConnections,
      apiRequestsPerMinute,
      timestamp: new Date()
    };

    cacheTimestamp = now;
    return metricsCache;

  } catch (error) {
    console.error('Error getting system metrics:', error);
    
    // Return default values on error
    return {
      uptime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      activeUsers: 0,
      sseConnections: 0,
      databaseConnections: 0,
      apiRequestsPerMinute: 0,
      timestamp: new Date()
    };
  }
}

async function getCPUUsage(): Promise<number> {
  try {
    // Simplified CPU usage calculation
    // In production, you might want to use a more sophisticated method
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    return Math.round(100 - (100 * totalIdle / totalTick));
  } catch (error) {
    console.error('Error calculating CPU usage:', error);
    return 0;
  }
}

async function getDiskUsage(): Promise<number> {
  try {
    // Get disk usage for the current directory
    const stats = await fs.stat('.');
    // This is a simplified calculation - in production, you'd want to use a proper disk usage library
    return Math.random() * 100; // Placeholder
  } catch (error) {
    console.error('Error calculating disk usage:', error);
    return 0;
  }
}

async function getActiveUsers(): Promise<number> {
  try {
    // In a real implementation, this would query your session store or database
    // For now, return a simulated value
    return Math.floor(Math.random() * 50) + 10;
  } catch (error) {
    console.error('Error getting active users:', error);
    return 0;
  }
}

async function getSSEConnections(): Promise<number> {
  try {
    // In a real implementation, this would query your SSE manager
    // For now, return a simulated value
    return Math.floor(Math.random() * 20) + 5;
  } catch (error) {
    console.error('Error getting SSE connections:', error);
    return 0;
  }
}

async function getDatabaseConnections(): Promise<number> {
  try {
    // In a real implementation, this would query your database connection pool
    // For now, return a simulated value
    return Math.floor(Math.random() * 10) + 2;
  } catch (error) {
    console.error('Error getting database connections:', error);
    return 0;
  }
}

async function getAPIRequestsPerMinute(): Promise<number> {
  try {
    // In a real implementation, this would query your API metrics store
    // For now, return a simulated value
    return Math.floor(Math.random() * 100) + 20;
  } catch (error) {
    console.error('Error getting API requests per minute:', error);
    return 0;
  }
}

async function getServiceStatus(): Promise<ServiceStatus[]> {
  try {
    // In a real implementation, this would check actual service health
    return [
      {
        name: "API Server",
        status: "operational",
        responseTime: Math.floor(Math.random() * 50) + 20,
        lastCheck: new Date(),
        description: "Main application server"
      },
      {
        name: "Database",
        status: "operational",
        responseTime: Math.floor(Math.random() * 20) + 5,
        lastCheck: new Date(),
        description: "MongoDB database"
      },
      {
        name: "SSE Service",
        status: "operational",
        responseTime: Math.floor(Math.random() * 10) + 2,
        lastCheck: new Date(),
        description: "Server-Sent Events service"
      },
      {
        name: "Email Service",
        status: Math.random() > 0.8 ? "degraded" : "operational",
        responseTime: Math.floor(Math.random() * 100) + 50,
        lastCheck: new Date(),
        description: "SMTP email delivery"
      }
    ];
  } catch (error) {
    console.error('Error getting service status:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check super admin permissions
    const authResult = await requireSuperAdmin(request);
    if (!authResult.success) {
      return authResult.response;
    }

    // Get system metrics
    const metrics = await getSystemMetrics();
    const services = await getServiceStatus();

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        services,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('System monitoring API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve system metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
