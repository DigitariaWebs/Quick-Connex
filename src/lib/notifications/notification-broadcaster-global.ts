/**
 * Global Notification Broadcaster
 * 
 * This is a simpler implementation using global variables instead of a singleton class
 * to avoid issues with Next.js module loading and instance management.
 * 
 * Now integrated with SSE monitoring service for real-time admin monitoring.
 */

interface SSEClient {
  userId: string;
  userType: string;
  controller: ReadableStreamDefaultController;
  lastActivity: number;
}

interface NotificationData {
  id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  transferId?: string;
  data?: any;
  timestamp: string;
  read?: boolean;
}

// Global state
let clients: Map<string, SSEClient> = new Map();
let heartbeatInterval: NodeJS.Timeout | null = null;

// Import monitoring integration (lazy import to avoid circular dependencies)
let monitoringIntegration: any = null;
function getMonitoringIntegration() {
  if (!monitoringIntegration) {
    try {
      monitoringIntegration = require('./sse-monitoring-integration');
    } catch (error) {
      console.warn('📊 SSE Monitoring: Integration not available', error);
    }
  }
  return monitoringIntegration;
}

// Initialize heartbeat if not already started
function startHeartbeat() {
  if (heartbeatInterval) return; // Already started
  
  console.log('📡 Global Notification Broadcaster: Starting heartbeat');
  heartbeatInterval = setInterval(() => {
    const now = Date.now();
    const staleThreshold = 60000; // 1 minute
    const staleUsers: string[] = [];

    // Check for stale connections
    for (const [userId, client] of clients.entries()) {
      if (now - client.lastActivity > staleThreshold) {
        staleUsers.push(userId);
      }
    }

    // Clean up stale connections
    staleUsers.forEach(userId => {
      console.log(`📡 Global Notification Broadcaster: Cleaning up stale connection for user ${userId}`);
      clients.delete(userId);
    });

    // Send heartbeat to all active clients
    for (const [userId, client] of clients.entries()) {
      try {
        sendToClient(userId, {
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        });
        
        // Track heartbeat event in monitoring integration
        const monitoring = getMonitoringIntegration();
        if (monitoring) {
          try {
            monitoring.trackConnectionEvent(
              'heartbeat',
              userId,
              `user-${userId}@example.com`,
              client.userType,
              'Heartbeat ping sent',
              `conn_${userId}`
            );
            monitoring.incrementConnectionEvents(userId);
          } catch (error) {
            console.warn('📊 SSE Monitoring: Failed to track heartbeat event', error);
          }
        }
      } catch (error) {
        console.error(`📡 Global Notification Broadcaster: Error sending heartbeat to user ${userId}:`, error);
        clients.delete(userId);
      }
    }

  }, 30000); // Every 30 seconds
}

/**
 * Register a new SSE client connection
 */
export function registerClient(userId: string, userType: string, controller: ReadableStreamDefaultController): void {
  console.log(`📡 Global Notification Broadcaster: Registering client for user ${userId} (${userType})`);
  console.log(`📡 Global Notification Broadcaster: User ID type: ${typeof userId}, value: ${userId}`);
  console.log(`📡 Global Notification Broadcaster: Current clients before registration: ${clients.size}`);
  
  clients.set(userId, {
    userId,
    userType,
    controller,
    lastActivity: Date.now()
  });

  console.log(`📡 Global Notification Broadcaster: Current clients after registration: ${clients.size}`);
  console.log(`📡 Global Notification Broadcaster: Client keys: ${Array.from(clients.keys()).join(', ')}`);

  // Track connection event in monitoring integration
  const monitoring = getMonitoringIntegration();
  if (monitoring) {
    try {
      console.log(`📊 SSE Monitoring: Tracking connection for user ${userId}`);
      monitoring.trackConnectionEvent(
        'connect',
        userId,
        `user-${userId}@example.com`, // Would need real email from user data
        userType,
        'User connected to SSE stream',
        `conn_${userId}`
      );
      monitoring.updateConnectionStatus(userId, 'connected', `user-${userId}@example.com`, userType);
      console.log(`📊 SSE Monitoring: Successfully tracked connection for user ${userId}`);
    } catch (error) {
      console.warn('📊 SSE Monitoring: Failed to track connection event', error);
    }
  } else {
    console.warn('📊 SSE Monitoring: Monitoring integration not available');
  }

  // Start heartbeat if not already started
  startHeartbeat();

  // Send initial connection message
  try {
    sendToClient(userId, {
      type: 'connection',
      message: 'Connected to notification stream',
      userId,
      userType,
      timestamp: new Date().toISOString()
    });
    console.log(`📡 Global Notification Broadcaster: Initial connection message sent to user ${userId}`);
  } catch (error) {
    console.error(`📡 Global Notification Broadcaster: Error sending initial message to user ${userId}:`, error);
  }

  console.log(`📡 Global Notification Broadcaster: ${clients.size} active connections`);
  
  // Broadcast dashboard update to admins
  broadcastDashboardUpdate();
}

/**
 * Unregister a client connection
 */
export function unregisterClient(userId: string): void {
  console.log(`📡 Global Notification Broadcaster: Unregistering client for user ${userId}`);
  
  // Track disconnection event in monitoring integration
  const monitoring = getMonitoringIntegration();
  if (monitoring) {
    try {
      monitoring.trackConnectionEvent(
        'disconnect',
        userId,
        `user-${userId}@example.com`, // Would need real email from user data
        'Unknown', // Would need real user type
        'User disconnected from SSE stream',
        `conn_${userId}`
      );
      monitoring.updateConnectionStatus(userId, 'disconnected');
    } catch (error) {
      console.warn('📊 SSE Monitoring: Failed to track disconnection event', error);
    }
  }
  
  clients.delete(userId);
  console.log(`📡 Global Notification Broadcaster: ${clients.size} active connections`);
  
  // Broadcast dashboard update to admins
  broadcastDashboardUpdate();
}

/**
 * Broadcast notification to a specific user
 */
export function broadcastToUser(userId: string, notification: NotificationData): boolean {
  const client = clients.get(userId);
  if (!client) {
    console.log(`📡 Global Notification Broadcaster: No active connection for user ${userId}`);
    return false;
  }

  try {
    sendToClient(userId, notification);
    console.log(`📡 Global Notification Broadcaster: Notification sent to user ${userId}: ${notification.type}`);
    return true;
  } catch (error) {
    console.error(`📡 Global Notification Broadcaster: Error sending to user ${userId}:`, error);
    clients.delete(userId);
    return false;
  }
}

/**
 * Broadcast notification to all connected users
 */
export function broadcastToAll(notification: NotificationData): number {
  console.log(`📡 Global Notification Broadcaster: Broadcasting to ${clients.size} clients`);
  
  let successCount = 0;
  const failedUsers: string[] = [];

  for (const [userId, client] of clients.entries()) {
    try {
      sendToClient(userId, notification);
      successCount++;
    } catch (error) {
      console.error(`📡 Global Notification Broadcaster: Error sending to user ${userId}:`, error);
      failedUsers.push(userId);
    }
  }

  // Clean up failed connections
  failedUsers.forEach(userId => clients.delete(userId));

  console.log(`📡 Global Notification Broadcaster: Sent to ${successCount}/${clients.size} clients`);
  return successCount;
}

/**
 * Broadcast notification to users by type (e.g., all managers)
 */
export function broadcastToUserType(userType: string, notification: NotificationData): number {
  console.log(`📡 Global Notification Broadcaster: Broadcasting to ${userType} users`);
  
  let successCount = 0;
  const failedUsers: string[] = [];

  for (const [userId, client] of clients.entries()) {
    if (client.userType === userType) {
      try {
        sendToClient(userId, notification);
        successCount++;
      } catch (error) {
        console.error(`📡 Global Notification Broadcaster: Error sending to user ${userId}:`, error);
        failedUsers.push(userId);
      }
    }
  }

  // Clean up failed connections
  failedUsers.forEach(userId => clients.delete(userId));

  console.log(`📡 Global Notification Broadcaster: Sent to ${successCount} ${userType} users`);
  return successCount;
}

/**
 * Broadcast dashboard update to admin users
 * This is called when connection counts change
 */
export function broadcastDashboardUpdate(): void {
  const adminTypes = ['admin', 'super_admin'];
  const activeConnections = clients.size;
  
  const dashboardUpdate = {
    type: 'dashboard_update',
    data: {
      activeUsers: activeConnections,
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };

  // Send to all admin users
  for (const [userId, client] of clients.entries()) {
    if (adminTypes.includes(client.userType)) {
      try {
        sendToClient(userId, dashboardUpdate);
      } catch (error) {
        console.error(`📡 Dashboard Update: Error sending to admin ${userId}:`, error);
      }
    }
  }

  console.log(`📡 Dashboard Update: Sent connection count (${activeConnections}) to admins`);
}

/**
 * Send a message to a specific client
 */
function sendToClient(userId: string, data: any): void {
  const client = clients.get(userId);
  if (!client) {
    throw new Error(`Client ${userId} not found`);
  }

  const encoder = new TextEncoder();
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  try {
    client.controller.enqueue(encoder.encode(message));
    client.lastActivity = Date.now();
  } catch (error) {
    throw new Error(`Failed to send message to client ${userId}: ${error}`);
  }
}

/**
 * Get connection statistics
 */
export function getStats(): { totalConnections: number; connectionsByType: Record<string, number>; clientIds: string[] } {
  console.log(`📡 Global Notification Broadcaster: Getting stats - ${clients.size} clients`);
  console.log(`📡 Global Notification Broadcaster: Client keys: ${Array.from(clients.keys()).join(', ')}`);
  
  const connectionsByType: Record<string, number> = {};
  const clientIds: string[] = [];
  
  for (const client of clients.values()) {
    console.log(`📡 Global Notification Broadcaster: Client ${client.userId} (${client.userType})`);
    connectionsByType[client.userType] = (connectionsByType[client.userType] || 0) + 1;
    clientIds.push(client.userId);
  }

  const stats = {
    totalConnections: clients.size,
    connectionsByType,
    clientIds
  };
  
  console.log(`📡 Global Notification Broadcaster: Returning stats:`, stats);
  return stats;
}

/**
 * Cleanup method
 */
export function cleanup(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  clients.clear();
  console.log('📡 Global Notification Broadcaster: Cleaned up');
}

export type { NotificationData, SSEClient };
