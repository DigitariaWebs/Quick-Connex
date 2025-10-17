/**
 * SSE Monitoring Integration
 * 
 * This module provides a bridge between the notification broadcaster
 * and the monitoring service to avoid circular dependencies.
 */

// Global state for monitoring
let activeConnections: Map<string, any> = new Map();
let connectionEvents: any[] = [];
let dailyEventCount: number = 0;
let lastEventCountReset: Date = new Date();

/**
 * Track a connection event
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
  const event = {
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
  connectionEvents.unshift(event);
  
  // Keep only last 1000 events
  if (connectionEvents.length > 1000) {
    connectionEvents = connectionEvents.slice(0, 1000);
  }

  // Update daily event count
  dailyEventCount++;

  console.log(`📊 SSE Monitoring Integration: Tracked ${type} event for user ${userId}`);
}

/**
 * Update connection status
 */
export function updateConnectionStatus(
  userId: string,
  status: 'connected' | 'disconnected' | 'reconnecting',
  userEmail?: string,
  userType?: string,
  ipAddress?: string
): void {
  const now = new Date();
  
  if (status === 'connected') {
    activeConnections.set(userId, {
      id: `conn_${userId}`,
      userId,
      userEmail: userEmail || `user-${userId}@example.com`,
      userType: userType || 'Unknown',
      connectedAt: now,
      lastPing: now,
      status,
      quality: 'excellent',
      reconnectionAttempts: 0,
      totalEvents: 0,
      userAgent: 'Unknown',
      ipAddress: ipAddress || 'Unknown'
    });
  } else {
    const connection = activeConnections.get(userId);
    if (connection) {
      connection.status = status;
      connection.lastPing = now;
    }
  }

  console.log(`📊 SSE Monitoring Integration: Updated connection status for user ${userId}: ${status}`);
}

/**
 * Increment connection events
 */
export function incrementConnectionEvents(userId: string): void {
  const connection = activeConnections.get(userId);
  if (connection) {
    connection.totalEvents++;
    connection.lastPing = new Date();
  }
}

/**
 * Get active connections
 */
export function getActiveConnections(): any[] {
  return Array.from(activeConnections.values());
}

/**
 * Get connection events
 */
export function getConnectionEvents(limit: number = 50): any[] {
  return connectionEvents.slice(0, limit);
}

/**
 * Get daily event count
 */
export function getDailyEventCount(): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastReset = new Date(lastEventCountReset.getFullYear(), lastEventCountReset.getMonth(), lastEventCountReset.getDate());
  
  if (today.getTime() > lastReset.getTime()) {
    dailyEventCount = 0;
    lastEventCountReset = now;
  }
  
  return dailyEventCount;
}

/**
 * Clean up stale connections
 */
export function cleanupStaleConnections(): void {
  const now = new Date();
  const staleThreshold = 5 * 60 * 1000; // 5 minutes
  
  const staleConnections: string[] = [];
  
  activeConnections.forEach((connection, userId) => {
    if (now.getTime() - connection.lastPing.getTime() > staleThreshold) {
      staleConnections.push(userId);
    }
  });

  staleConnections.forEach(userId => {
    const connection = activeConnections.get(userId);
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
 * Get connection quality
 */
export function calculateConnectionQuality(connection: any): 'excellent' | 'good' | 'poor' | 'critical' {
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
  activeConnections.forEach((connection, userId) => {
    const quality = calculateConnectionQuality(connection);
    connection.quality = quality;
  });
}

/**
 * Clear all monitoring data
 */
export function clearAllData(): void {
  activeConnections.clear();
  connectionEvents.length = 0;
  dailyEventCount = 0;
  lastEventCountReset = new Date();
  console.log('🧹 SSE Monitoring: All data cleared');
}
