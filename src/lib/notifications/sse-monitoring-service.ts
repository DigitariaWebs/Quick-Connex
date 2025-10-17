/**
 * SSE Monitoring Service
 * 
 * This service tracks real SSE connections and events for admin monitoring.
 * It integrates with the existing notification broadcaster to provide real-time
 * connection statistics and event tracking.
 */

// Import the integration module directly
import * as integrationModule from './sse-monitoring-integration';

// Get the integration module
function getIntegrationModule() {
  console.log('📊 SSE Monitoring Service: Getting integration module...');
  console.log('📊 SSE Monitoring Service: Integration module:', integrationModule);
  console.log('📊 SSE Monitoring Service: getActiveConnections function:', integrationModule.getActiveConnections);
  return integrationModule;
}

export interface SSEConnection {
  id: string;
  userId: string;
  userEmail: string;
  userType: string;
  connectedAt: Date;
  lastPing: Date;
  status: 'connected' | 'disconnected' | 'reconnecting';
  quality: 'excellent' | 'good' | 'poor' | 'critical';
  reconnectionAttempts: number;
  totalEvents: number;
  userAgent: string;
  ipAddress: string;
}

export interface SSEMetrics {
  totalConnections: number;
  activeConnections: number;
  disconnectedConnections: number;
  reconnectingConnections: number;
  averageConnectionDuration: number;
  totalEventsToday: number;
  eventsPerMinute: number;
  connectionQuality: {
    excellent: number;
    good: number;
    poor: number;
    critical: number;
  };
  connectionsByType: Record<string, number>;
}

export interface ConnectionEvent {
  id: string;
  type: 'connect' | 'disconnect' | 'reconnect' | 'error' | 'ping' | 'heartbeat';
  userId: string;
  userEmail: string;
  userType: string;
  timestamp: Date;
  details: string;
  connectionId: string;
  ipAddress?: string;
}

// In-memory storage for connection tracking
let connectionHistory: Map<string, SSEConnection> = new Map();
let eventHistory: ConnectionEvent[] = [];
let dailyEventCount: number = 0;
let lastEventCountReset: Date = new Date();

// Track events per minute
let eventsPerMinuteHistory: number[] = [];
const EVENTS_HISTORY_SIZE = 60; // Keep last 60 minutes

/**
 * Initialize the monitoring service
 */
export function initializeSSEMonitoring(): void {
  console.log('📊 SSE Monitoring Service: Initializing real-time monitoring');
  
  // Set up periodic cleanup and metrics calculation
  setInterval(() => {
    cleanupStaleConnections();
    calculateEventsPerMinute();
    resetDailyEventCountIfNeeded();
  }, 60000); // Every minute
}

/**
 * Track a new connection event
 */
export function trackConnectionEvent(
  type: 'connect' | 'disconnect' | 'reconnect' | 'error' | 'ping' | 'heartbeat',
  userId: string,
  userEmail: string,
  userType: string,
  details: string,
  connectionId?: string,
  ipAddress?: string
): void {
  const event: ConnectionEvent = {
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    userId,
    userEmail,
    userType,
    timestamp: new Date(),
    details,
    connectionId: connectionId || `conn_${userId}`,
    ipAddress
  };

  // Add to event history
  eventHistory.unshift(event);
  
  // Keep only last 1000 events
  if (eventHistory.length > 1000) {
    eventHistory = eventHistory.slice(0, 1000);
  }

  // Update daily event count
  dailyEventCount++;

  // Update events per minute
  eventsPerMinuteHistory.push(1);
  if (eventsPerMinuteHistory.length > EVENTS_HISTORY_SIZE) {
    eventsPerMinuteHistory.shift();
  }

  console.log(`📊 SSE Monitoring Service: Tracked ${type} event for user ${userId}`);
}

/**
 * Update connection status in history
 */
export function updateConnectionStatus(
  userId: string,
  status: 'connected' | 'disconnected' | 'reconnecting',
  userEmail?: string,
  userType?: string,
  ipAddress?: string
): void {
  const existingConnection = connectionHistory.get(userId);
  const now = new Date();

  if (existingConnection) {
    // Update existing connection
    existingConnection.status = status;
    existingConnection.lastPing = now;
    
    if (status === 'connected') {
      existingConnection.connectedAt = now;
      existingConnection.reconnectionAttempts = 0;
    } else if (status === 'reconnecting') {
      existingConnection.reconnectionAttempts++;
    }
  } else if (status === 'connected' && userEmail && userType) {
    // Create new connection record
    const newConnection: SSEConnection = {
      id: `conn_${userId}`,
      userId,
      userEmail,
      userType,
      connectedAt: now,
      lastPing: now,
      status,
      quality: 'excellent', // Default quality
      reconnectionAttempts: 0,
      totalEvents: 0,
      userAgent: 'Unknown', // Would need to be passed from client
      ipAddress: ipAddress || 'Unknown'
    };
    
    connectionHistory.set(userId, newConnection);
  }

  // Track the status change event
  trackConnectionEvent(
    status === 'connected' ? 'connect' : 
    status === 'disconnected' ? 'disconnect' : 'reconnect',
    userId,
    userEmail || 'Unknown',
    userType || 'Unknown',
    `User ${status} to SSE stream`,
    `conn_${userId}`,
    ipAddress
  );
}

/**
 * Update connection quality
 */
export function updateConnectionQuality(userId: string, quality: 'excellent' | 'good' | 'poor' | 'critical'): void {
  const connection = connectionHistory.get(userId);
  if (connection) {
    connection.quality = quality;
  }
}

/**
 * Increment event count for a connection
 */
export function incrementConnectionEvents(userId: string): void {
  const connection = connectionHistory.get(userId);
  if (connection) {
    connection.totalEvents++;
    connection.lastPing = new Date();
  }
}

/**
 * Get real-time SSE metrics
 */
export function getRealTimeSSEMetrics(): SSEMetrics {
  const integration = getIntegrationModule();
  const now = new Date();
  
  console.log('📊 SSE Monitoring Service: Getting real-time metrics');
  
  if (!integration) {
    console.warn('📊 SSE Monitoring Service: Integration module not available');
    return {
      totalConnections: 0,
      activeConnections: 0,
      disconnectedConnections: 0,
      reconnectingConnections: 0,
      averageConnectionDuration: 0,
      totalEventsToday: 0,
      eventsPerMinute: 0,
      connectionQuality: { excellent: 0, good: 0, poor: 0, critical: 0 },
      connectionsByType: {}
    };
  }
  
  // Get active connections from integration
  const activeConnections = integration.getActiveConnections();
  const totalConnections = activeConnections.length;
  const connectedConnections = activeConnections.filter(c => c.status === 'connected');
  const disconnectedConnections = activeConnections.filter(c => c.status === 'disconnected').length;
  const reconnectingConnections = activeConnections.filter(c => c.status === 'reconnecting').length;
  
  // Calculate average connection duration for active connections
  const averageDuration = connectedConnections.length > 0 
    ? connectedConnections.reduce((sum, conn) => {
        const duration = (now.getTime() - conn.connectedAt.getTime()) / 60000; // minutes
        return sum + duration;
      }, 0) / connectedConnections.length
    : 0;

  // Calculate connection quality distribution
  const qualityCounts = activeConnections.reduce((acc, conn) => {
    acc[conn.quality]++;
    return acc;
  }, { excellent: 0, good: 0, poor: 0, critical: 0 });

  // Calculate connections by type
  const connectionsByType = activeConnections.reduce((acc, conn) => {
    acc[conn.userType] = (acc[conn.userType] || 0) + 1;
    return acc;
  }, {});

  return {
    totalConnections,
    activeConnections: connectedConnections.length,
    disconnectedConnections,
    reconnectingConnections,
    averageConnectionDuration: Math.round(averageDuration),
    totalEventsToday: integration.getDailyEventCount(),
    eventsPerMinute: 0, // Would need to implement this in integration
    connectionQuality: qualityCounts,
    connectionsByType
  };
}

/**
 * Get real-time connections list
 */
export function getRealTimeConnections(): SSEConnection[] {
  const integration = getIntegrationModule();
  
  if (!integration) {
    console.warn('📊 SSE Monitoring Service: Integration module not available');
    return [];
  }
  
  console.log('📊 SSE Monitoring Service: Getting connections from integration...');
  
  // Get active connections from integration
  const activeConnections = integration.getActiveConnections();
  
  console.log('📊 SSE Monitoring Service: Found', activeConnections.length, 'connections');
  
  // Update connection qualities
  integration.updateAllConnectionQualities();
  
  return activeConnections
    .sort((a, b) => b.connectedAt.getTime() - a.connectedAt.getTime());
}

/**
 * Get recent connection events
 */
export function getRecentConnectionEvents(limit: number = 50): ConnectionEvent[] {
  const integration = getIntegrationModule();
  
  if (!integration) {
    console.warn('📊 SSE Monitoring Service: Integration module not available');
    return [];
  }
  
  return integration.getConnectionEvents(limit);
}

/**
 * Clean up stale connections
 */
function cleanupStaleConnections(): void {
  const now = new Date();
  const staleThreshold = 5 * 60 * 1000; // 5 minutes
  
  const staleConnections: string[] = [];
  
  connectionHistory.forEach((connection, userId) => {
    if (now.getTime() - connection.lastPing.getTime() > staleThreshold) {
      staleConnections.push(userId);
    }
  });

  staleConnections.forEach(userId => {
    const connection = connectionHistory.get(userId);
    if (connection) {
      connection.status = 'disconnected';
      trackConnectionEvent(
        'disconnect',
        userId,
        connection.userEmail,
        connection.userType,
        'Connection timed out',
        connection.id,
        connection.ipAddress
      );
    }
  });
}

/**
 * Calculate events per minute
 */
function calculateEventsPerMinute(): void {
  // This is called every minute, so we can track the rate
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60000);
  
  const recentEvents = eventHistory.filter(event => 
    event.timestamp.getTime() > oneMinuteAgo.getTime()
  );
  
  // Update events per minute history
  eventsPerMinuteHistory.push(recentEvents.length);
  if (eventsPerMinuteHistory.length > EVENTS_HISTORY_SIZE) {
    eventsPerMinuteHistory.shift();
  }
}

/**
 * Reset daily event count if needed
 */
function resetDailyEventCountIfNeeded(): void {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastReset = new Date(lastEventCountReset.getFullYear(), lastEventCountReset.getMonth(), lastEventCountReset.getDate());
  
  if (today.getTime() > lastReset.getTime()) {
    dailyEventCount = 0;
    lastEventCountReset = now;
    console.log('📊 SSE Monitoring Service: Reset daily event count');
  }
}

/**
 * Get connection quality based on connection stability
 */
export function calculateConnectionQuality(connection: SSEConnection): 'excellent' | 'good' | 'poor' | 'critical' {
  const now = new Date();
  const timeSinceLastPing = now.getTime() - connection.lastPing.getTime();
  const connectionDuration = now.getTime() - connection.connectedAt.getTime();
  
  // Excellent: Connected for more than 5 minutes, recent ping, no reconnections
  if (connectionDuration > 300000 && timeSinceLastPing < 60000 && connection.reconnectionAttempts === 0) {
    return 'excellent';
  }
  
  // Good: Connected for more than 2 minutes, recent ping, minimal reconnections
  if (connectionDuration > 120000 && timeSinceLastPing < 120000 && connection.reconnectionAttempts <= 1) {
    return 'good';
  }
  
  // Poor: Some issues but still functional
  if (timeSinceLastPing < 300000 && connection.reconnectionAttempts <= 3) {
    return 'poor';
  }
  
  // Critical: Multiple issues
  return 'critical';
}

/**
 * Update all connection qualities
 */
export function updateAllConnectionQualities(): void {
  connectionHistory.forEach((connection, userId) => {
    const quality = calculateConnectionQuality(connection);
    connection.quality = quality;
  });
}

// Initialize the monitoring service
initializeSSEMonitoring();
