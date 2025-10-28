/**
 * Database Connection Types
 * 
 * Database connection configuration and management types.
 */

export interface DatabaseConfig {
  uri?: string;
  options?: {
    bufferCommands?: boolean;
    bufferMaxEntries?: number;
    maxPoolSize?: number;
    minPoolSize?: number;
    maxIdleTimeMS?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
    connectTimeoutMS?: number;
    retryWrites?: boolean;
    retryReads?: boolean;
    readPreference?: 'primary' | 'secondary' | 'primaryPreferred' | 'secondaryPreferred' | 'nearest';
    writeConcern?: {
      w?: number | 'majority';
      j?: boolean;
      wtimeout?: number;
    };
    authSource?: string;
    ssl?: boolean;
    tls?: boolean;
    tlsInsecure?: boolean;
  };
  monitoring?: MonitoringConfig;
  cache?: CacheConfig;
}

export interface MonitoringConfig {
  enabled?: boolean;
  slowQueryThreshold?: number; // milliseconds
  maxQueryHistory?: number;
  trackConnectionPool?: boolean;
  trackMemoryUsage?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface CacheConfig {
  enabled?: boolean;
  defaultTTL?: number; // seconds
  maxSize?: number; // number of entries
  cleanupInterval?: number; // seconds
}

export interface ConnectionStats {
  state: 'connected' | 'connecting' | 'disconnected' | 'disconnecting';
  host: string;
  port: number;
  name: string;
  readyState: number;
  collections: number;
  models: number;
  plugins: string[];
  config: any;
}

export interface PoolStats {
  totalConnections: number;
  availableConnections: number;
  inUseConnections: number;
  waitingRequests: number;
  maxPoolSize: number;
  minPoolSize: number;
  maxIdleTimeMS: number;
  serverSelectionTimeoutMS: number;
  socketTimeoutMS: number;
  connectTimeoutMS: number;
}

export interface ConnectionHealth {
  connected: boolean;
  readyState: number;
  host: string;
  port: number;
  database: string;
  uptime: number;
  lastActivity: Date;
}

export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'critical';
  connection: ConnectionHealth;
  performance: PerformanceHealth;
  memory: MemoryHealth;
  issues: string[];
  recommendations: string[];
  lastChecked: Date;
}

export interface PerformanceHealth {
  averageQueryTime: number;
  slowQueryCount: number;
  connectionPoolUtilization: number;
  indexHitRatio: number;
  cacheHitRatio: number;
}

export interface MemoryHealth {
  used: number;
  available: number;
  total: number;
  utilization: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

export interface DatabaseServiceConfig {
  connection?: DatabaseConfig;
  monitoring?: MonitoringConfig;
  cache?: CacheConfig;
  models?: {
    autoIndex?: boolean;
    autoCreate?: boolean;
    strict?: boolean;
  };
}

export interface ModelRegistry {
  [key: string]: any; // Model type
}

export interface ModelRegistration {
  name: string;
  model: any; // Model type
  schema?: any;
  options?: any;
}
