import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminWithSession } from '@/lib/auth/session-auth-middleware';
import {
  getDatabaseMetrics,
  getDatabaseStats,
  getCollectionStats,
  getIndexPerformance,
  getRecentQueries,
  getConnectionInfo,
  getDatabaseHealth,
  DatabaseMetrics,
  QueryPerformance,
  ConnectionInfo,
  IndexPerformance
} from '@/lib/monitoring/database-monitoring-service';

/**
 * Database Performance Monitoring API Endpoint
 * 
 * Provides comprehensive database monitoring including:
 * - Query execution times and performance
 * - Connection pool status
 * - Database size and growth metrics
 * - Slow query identification
 * - Index performance analysis
 * - Real-time database health
 */

// Cache for database monitoring data to avoid excessive API calls
let cachedData: {
  metrics: DatabaseMetrics;
  queries: QueryPerformance[];
  connections: ConnectionInfo[];
  indexes: IndexPerformance[];
  health: any;
  lastUpdated: number;
} | null = null;

const CACHE_DURATION = 5000; // 5 seconds cache

export async function GET(request: NextRequest) {
  try {
    // Check super admin permissions
    const authResult = await requireSuperAdminWithSession(request);
    if (!authResult.success) {
      return authResult.response;
    }

    // Get time range from query params
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '1h';

    // Check if we have cached data that's still fresh
    const now = Date.now();
    if (cachedData && (now - cachedData.lastUpdated) < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: {
          metrics: cachedData.metrics,
          recentQueries: cachedData.queries.slice(0, 20),
          connections: cachedData.connections,
          indexes: cachedData.indexes,
          health: cachedData.health
        }
      });
    }

    console.log('📊 Database Monitoring: Fetching real MongoDB data...');

    // Fetch real database data
    const [metrics, queries, connections, indexes, health, dbStats, collectionStats] = await Promise.all([
      getDatabaseMetrics(),
      getRecentQueries(50),
      getConnectionInfo(),
      getIndexPerformance(),
      getDatabaseHealth(),
      getDatabaseStats(),
      getCollectionStats()
    ]);

    // Cache the data
    cachedData = {
      metrics,
      queries,
      connections,
      indexes,
      health,
      lastUpdated: now
    };

    // Filter queries based on time range
    let timeFilter = 3600000; // 1 hour default
    
    switch (timeRange) {
      case '6h': timeFilter = 6 * 3600000; break;
      case '24h': timeFilter = 24 * 3600000; break;
      case '7d': timeFilter = 7 * 24 * 3600000; break;
    }
    
    const filteredQueries = queries.filter(q => 
      q.timestamp.getTime() > (now - timeFilter)
    );

    console.log('📊 Database Monitoring: Successfully fetched real data');

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        recentQueries: filteredQueries.slice(0, 20), // Return only the 20 most recent
        connections,
        indexes,
        health,
        dbStats,
        collectionStats
      }
    });

  } catch (error) {
    console.error('❌ Database monitoring API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve database metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
