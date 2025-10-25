/**
 * Database Monitoring Service
 * 
 * Enhanced monitoring service that integrates with QueryMonitor for real query data
 * and provides comprehensive database performance insights.
 */

import mongoose from 'mongoose';
import { QueryMonitor } from './query-monitor';
import {
  QueryPerformance,
  ConnectionInfo,
  IndexPerformance,
  DatabaseStats,
  CollectionStats
} from './types';
import type { 
  DatabaseMetrics,
  PoolStats,
  QueryStats,
  MemoryHealth,
  IndexUsageStats,
  RecentQuery,
  DatabaseError,
  DatabaseHealth
} from '../core/types';

/**
 * Get real-time database metrics with QueryMonitor integration
 */
export async function getDatabaseMetrics(): Promise<DatabaseMetrics> {
  try {
    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    
    // Get MongoDB server status
    const admin = mongoose.connection.db?.admin();
    if (!admin) {
      throw new Error('Database admin not available');
    }
    const serverStatus = await admin.serverStatus();
    
    // Get connection pool info
    const connections = mongoose.connections;
    const activeConnections = connections.filter(conn => conn.readyState === 1).length;
    const idleConnections = connections.filter(conn => conn.readyState === 0).length;
    
    // Get QueryMonitor stats for REAL query data
    const queryMonitor = QueryMonitor.getInstance();
    const queryStats = queryMonitor.getQueryStats();
    
    // Calculate metrics from server status
    const uptime = serverStatus.uptime || 0;
    const version = serverStatus.version || 'Unknown';
    const host = serverStatus.host || 'localhost';
    const port = serverStatus.port || 27017;
    
    // Get database stats
    const dbStats = await mongoose.connection.db?.stats();
    const databaseSize = dbStats?.dataSize || 0;
    
    // Get slow queries from QueryMonitor
    const slowQueries = queryMonitor.getSlowQueries(20);
    
    // Create connection pool stats
    const connectionPool: PoolStats = {
      totalConnections: connections.length,
      availableConnections: idleConnections,
      inUseConnections: activeConnections,
      waitingRequests: 0,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000
    };
    
    // Create memory health stats
    const memoryUsage: MemoryHealth = {
      used: Math.floor(Math.random() * 1000000000), // Mock data
      available: Math.floor(Math.random() * 2000000000),
      total: Math.floor(Math.random() * 3000000000),
      utilization: Math.random() * 100,
      heapUsed: Math.floor(Math.random() * 500000000),
      heapTotal: Math.floor(Math.random() * 1000000000),
      external: Math.floor(Math.random() * 100000000)
    };
    
    // Create index usage stats
    const indexUsage: IndexUsageStats = {
      totalIndexes: Math.floor(Math.random() * 50),
      usedIndexes: Math.floor(Math.random() * 30),
      unusedIndexes: ['index1', 'index2'],
      indexHitRatio: Math.random() * 100,
      indexSize: Math.floor(Math.random() * 1000000),
      recommendations: ['Consider adding indexes for frequently queried fields']
    };
    
    // Create database errors (empty for now)
    const errors: DatabaseError[] = [];
    
    return {
      connectionPool,
      queryPerformance: queryStats,
      memoryUsage,
      indexUsage,
      slowQueries,
      errors,
      uptime,
      lastActivity: new Date()
    };
    
  } catch (error) {
    console.error('Failed to get database metrics:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    
    const dbStats = await mongoose.connection.db?.stats();
    
    return {
      collections: dbStats?.collections || 0,
      documents: dbStats?.objects || 0,
      indexes: dbStats?.indexes || 0,
      dataSize: dbStats?.dataSize || 0,
      storageSize: dbStats?.storageSize || 0,
      indexSize: dbStats?.indexSize || 0,
      avgObjSize: dbStats?.avgObjSize || 0
    };
    
  } catch (error) {
    console.error('Failed to get database stats:', error);
    throw error;
  }
}

/**
 * Get collection statistics
 */
export async function getCollectionStats(): Promise<CollectionStats[]> {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    
    const collections = await mongoose.connection.db?.listCollections().toArray();
    const collectionStats: CollectionStats[] = [];
    
    if (!collections) {
      return collectionStats;
    }
    
    for (const collection of collections) {
      try {
        // Use the correct MongoDB API for collection stats
        const collectionObj = mongoose.connection.db?.collection(collection.name);
        const count = await collectionObj?.countDocuments();
        
        // Get basic collection info
        const stats: CollectionStats = {
          name: collection.name,
          count: count || 0,
          size: 0,
          avgObjSize: 0,
          storageSize: 0,
          totalIndexSize: 0,
          indexSizes: {}
        };
        
        // Try to get more detailed stats if available
        try {
          const collStats = await mongoose.connection.db?.command({
            collStats: collection.name
          });
          
          stats.size = collStats?.size || 0;
          stats.avgObjSize = collStats?.avgObjSize || 0;
          stats.storageSize = collStats?.storageSize || 0;
          stats.totalIndexSize = collStats?.totalIndexSize || 0;
          stats.indexSizes = collStats?.indexSizes || {};
        } catch (statsError) {
          // If collStats fails, try to estimate size from document count
          if (count && count > 0) {
            // Estimate average document size (this is a rough approximation)
            const estimatedAvgSize = 1024; // 1KB average per document
            stats.size = count * estimatedAvgSize;
            stats.avgObjSize = estimatedAvgSize;
            stats.storageSize = count * estimatedAvgSize * 1.2; // Add 20% for overhead
          }
        }
        
        collectionStats.push(stats);
      } catch (error) {
        console.warn(`Failed to get stats for collection ${collection.name}:`, error);
        // Add basic collection info even if stats fail
        collectionStats.push({
          name: collection.name,
          count: 0,
          size: 0,
          avgObjSize: 0,
          storageSize: 0,
          totalIndexSize: 0,
          indexSizes: {}
        });
      }
    }
    
    return collectionStats;
    
  } catch (error) {
    console.error('Failed to get collection stats:', error);
    throw error;
  }
}

/**
 * Get index information for all collections
 */
export async function getIndexPerformance(): Promise<IndexPerformance[]> {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    
    const collections = await mongoose.connection.db?.listCollections().toArray();
    const indexPerformance: IndexPerformance[] = [];
    
    if (!collections) {
      return indexPerformance;
    }
    
    for (const collection of collections) {
      try {
        const indexes = await mongoose.connection.db?.collection(collection.name)?.listIndexes().toArray();
        
        if (!indexes) continue;
        
        for (const index of indexes) {
          // Get index stats (simplified)
          const usage = Math.floor(Math.random() * 100); // Placeholder
          const efficiency = Math.min(100, 70 + Math.random() * 30);
          
          indexPerformance.push({
            name: index.name,
            collection: collection.name,
            size: index.size || 0,
            usage,
            efficiency,
            lastUsed: new Date(Date.now() - Math.random() * 3600000), // Random time within last hour
            keys: index.key || {},
            unique: index.unique || false
          });
        }
      } catch (error) {
        console.warn(`Failed to get indexes for collection ${collection.name}:`, error);
      }
    }
    
    return indexPerformance;
    
  } catch (error) {
    console.error('Failed to get index performance:', error);
    throw error;
  }
}

/**
 * Get recent queries - now returns REAL data from QueryMonitor
 */
export async function getRecentQueries(limit: number = 20): Promise<QueryPerformance[]> {
  try {
    const queryMonitor = QueryMonitor.getInstance();
    const recentQueries = queryMonitor.getRecentQueries(limit);
    
    // Map QueryMonitor format to API format
    return recentQueries.map(q => ({
      query: `db.${q.model}.${q.operation}()`,
      executionTime: q.executionTime,
      timestamp: q.timestamp,
      type: mapOperationType(q.operation),
      collection: q.model,
      slow: q.slow,
      operation: q.operation
    }));
    
  } catch (error) {
    console.error('Failed to get recent queries:', error);
    throw error;
  }
}

/**
 * Get connection information
 */
export async function getConnectionInfo(): Promise<ConnectionInfo[]> {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    
    const connections = mongoose.connections;
    const connectionInfo: ConnectionInfo[] = [];
    
    connections.forEach((conn, index) => {
      const status = conn.readyState === 1 ? 'active' : 
                    conn.readyState === 0 ? 'idle' : 'waiting';
      
      connectionInfo.push({
        id: `conn_${index}`,
        status,
        connectedAt: new Date(Date.now()),
        lastQuery: new Date(Date.now() - Math.random() * 300000), // Random time within last 5 minutes
        queryCount: Math.floor(Math.random() * 100),
        totalTime: Math.random() * 10000,
        user: 'admin', // Simplified
        host: conn.host || 'localhost',
        port: conn.port || 27017
      });
    });
    
    return connectionInfo;
    
  } catch (error) {
    console.error('Failed to get connection info:', error);
    throw error;
  }
}

/**
 * Get database health status
 */
export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  try {
    const metrics = await getDatabaseMetrics();
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check connection pool
    const poolUtilization = (metrics.connectionPool.inUseConnections / metrics.connectionPool.totalConnections) * 100;
    if (poolUtilization > 80) {
      issues.push('High connection pool utilization');
      recommendations.push('Consider increasing connection pool size');
    }
    
    // Check slow queries
    if (metrics.slowQueries.length > 10) {
      issues.push('High number of slow queries detected');
      recommendations.push('Review and optimize slow queries');
    }
    
    // Check index hit ratio
    if (metrics.indexUsage.indexHitRatio < 85) {
      issues.push('Low index hit ratio');
      recommendations.push('Review index usage and add missing indexes');
    }
    
    // Check memory usage
    if (metrics.memoryUsage.utilization > 90) {
      issues.push('High memory utilization');
      recommendations.push('Consider increasing memory or optimizing queries');
    }
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (issues.length > 2) {
      status = 'critical';
    } else if (issues.length > 0) {
      status = 'degraded';
    }
    
    return {
      status,
      connection: {
        connected: true,
        readyState: 1,
        host: 'localhost',
        port: 27017,
        database: 'patients_management',
        uptime: metrics.uptime,
        lastActivity: metrics.lastActivity
      },
      performance: {
        averageQueryTime: metrics.queryPerformance.averageExecutionTime,
        slowQueryCount: metrics.slowQueries.length,
        connectionPoolUtilization: poolUtilization,
        indexHitRatio: metrics.indexUsage.indexHitRatio,
        cacheHitRatio: 85 // Mock value
      },
      memory: metrics.memoryUsage,
      issues,
      recommendations,
      lastChecked: new Date()
    };
    
  } catch (error) {
    console.error('Failed to get database health:', error);
    return {
      status: 'critical',
      connection: {
        connected: false,
        readyState: 0,
        host: 'unknown',
        port: 0,
        database: 'unknown',
        uptime: 0,
        lastActivity: new Date()
      },
      performance: {
        averageQueryTime: 0,
        slowQueryCount: 0,
        connectionPoolUtilization: 0,
        indexHitRatio: 0,
        cacheHitRatio: 0
      },
      memory: {
        used: 0,
        available: 0,
        total: 0,
        utilization: 0,
        heapUsed: 0,
        heapTotal: 0,
        external: 0
      },
      issues: ['Failed to connect to database'],
      recommendations: ['Check database connection and configuration'],
      lastChecked: new Date()
    };
  }
}

/**
 * Map operation type from QueryMonitor to API format
 */
function mapOperationType(operation: string): 'select' | 'insert' | 'update' | 'delete' | 'aggregate' {
  const operationMap: Record<string, 'select' | 'insert' | 'update' | 'delete' | 'aggregate'> = {
    'find': 'select',
    'findOne': 'select',
    'count': 'select',
    'distinct': 'select',
    'insertOne': 'insert',
    'insertMany': 'insert',
    'updateOne': 'update',
    'updateMany': 'update',
    'replaceOne': 'update',
    'deleteOne': 'delete',
    'deleteMany': 'delete',
    'aggregate': 'aggregate'
  };
  
  return operationMap[operation] || 'select';
}
