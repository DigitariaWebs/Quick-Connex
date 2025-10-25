/**
 * Database Connection Utilities
 * 
 * Connection management, validation, and statistics for database operations.
 */

import { Connection } from 'mongoose';
import { log } from '@/lib/services';
import { DatabaseError } from '../../utils/error-handling';
import { ConnectionStats, PoolStats } from '../core/types';

/**
 * Create connection options for MongoDB
 */
export function createConnectionOptions(): any {
  return {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferMaxEntries: 0,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    retryWrites: true,
    retryReads: true
  };
}

/**
 * Validate database connection
 */
export async function validateConnection(connection: Connection): Promise<boolean> {
  try {
    if (!connection) {
      return false;
    }

    const state = connection.readyState;
    if (state !== 1) { // 1 = connected
      return false;
    }

    // Test with a simple ping
    if (!connection.db) {
      return false;
    }
    await connection.db.admin().ping();
    return true;
  } catch (error) {
    log.error('Connection validation failed:', error);
    return false;
  }
}

/**
 * Get connection statistics
 */
export function getConnectionStats(connection: Connection): ConnectionStats {
  if (!connection) {
    throw new DatabaseError('Connection not available');
  }

  const state = connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  return {
    state: (states[state] || 'unknown') as 'disconnected' | 'connected' | 'connecting' | 'disconnecting',
    host: connection.host,
    port: connection.port,
    name: connection.name,
    readyState: state,
    collections: connection.collections ? Object.keys(connection.collections).length : 0,
    models: connection.models ? Object.keys(connection.models).length : 0,
    plugins: connection.plugins ? Object.keys(connection.plugins) : [],
    config: connection.config || {}
  };
}

/**
 * Get connection pool statistics
 */
export function getPoolStats(connection: Connection): PoolStats {
  if (!connection) {
    throw new DatabaseError('Connection not available');
  }

  // Note: These are approximate values as Mongoose doesn't expose detailed pool stats
  return {
    totalConnections: 0, // Not directly available in Mongoose
    availableConnections: 0,
    inUseConnections: 0,
    waitingRequests: 0,
    maxPoolSize: 10, // Default value
    minPoolSize: 0,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000
  };
}

// Note: ConnectionStats is now imported from core/types

// Note: PoolStats is now imported from core/types
