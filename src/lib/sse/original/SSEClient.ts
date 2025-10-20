/**
 * SSE Client - Clean Implementation
 * 
 * Simplified client-side SSE manager with only the features that are actually used.
 * Follows clean architecture principles.
 */

"use client";

// Types
export interface SSEMessage {
  type: string;
  data?: any;
  message?: string;
  userId?: string;
  userType?: string;
  timestamp?: string;
}

export interface SSESubscriber {
  id: string;
  callback: (message: SSEMessage) => void;
  priority: 'high' | 'medium' | 'low';
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  reconnectAttempts: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  subscribers: number;
}

export interface User {
  _id: string;
  email: string;
  userType: string;
  [key: string]: any;
}

/**
 * Clean SSE Client Manager
 * 
 * Only includes the methods that are actually being used:
 * - setUser(user, sessionId)
 * - clearUser()
 * - subscribe(id, callback, priority)
 * - getConnectionState()
 */
export class SSEClient {
  private static instance: SSEClient;
  
  // Core state
  private connection: EventSource | null = null;
  private subscribers: Map<string, SSESubscriber> = new Map();
  private user: User | null = null;
  private sessionId: string | null = null;
  
  // Connection state
  private state: ConnectionState['status'] = 'disconnected';
  private reconnectAttempts: number = 0;
  private connectionQuality: ConnectionState['connectionQuality'] = 'critical';
  
  private constructor() {
    console.log('🔌 SSE Client initialized');
  }
  
  public static getInstance(): SSEClient {
    if (!SSEClient.instance) {
      SSEClient.instance = new SSEClient();
    }
    return SSEClient.instance;
  }
  
  /**
   * Set user for connection
   */
  public setUser(user: User, sessionId?: string): void {
    this.user = user;
    this.sessionId = sessionId || null;
    console.log('👤 SSE Client: User set', { userId: user._id, sessionId });
  }
  
  /**
   * Clear user from connection
   */
  public clearUser(): void {
    this.user = null;
    this.sessionId = null;
    this.disconnect();
    console.log('👤 SSE Client: User cleared');
  }
  
  /**
   * Subscribe to messages
   */
  public subscribe(
    id: string, 
    callback: (message: SSEMessage) => void, 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): () => void {
    this.subscribers.set(id, { id, callback, priority });
    console.log('📡 SSE Client: Subscribed', { id, priority });
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(id);
      console.log('📡 SSE Client: Unsubscribed', { id });
    };
  }
  
  /**
   * Get connection state
   */
  public getConnectionState(): ConnectionState {
    return {
      status: this.state,
      reconnectAttempts: this.reconnectAttempts,
      connectionQuality: this.connectionQuality,
      subscribers: this.subscribers.size
    };
  }
  
  /**
   * Connect to SSE endpoint
   */
  private connect(): void {
    if (this.state === 'connecting' || this.state === 'connected') {
      return;
    }
    
    if (!this.user) {
      console.warn('⚠️ SSE Client: Cannot connect - no user set');
      return;
    }
    
    this.state = 'connecting';
    console.log('🔌 SSE Client: Connecting...');
    
    try {
      // Create SSE connection
      this.connection = new EventSource('/api/sse');
      
      this.connection.onopen = () => {
        this.state = 'connected';
        this.reconnectAttempts = 0;
        this.connectionQuality = 'good';
        console.log('✅ SSE Client: Connected');
      };
      
      this.connection.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          this.broadcastToSubscribers(message);
        } catch (error) {
          console.error('❌ SSE Client: Failed to parse message', error);
        }
      };
      
      this.connection.onerror = (error) => {
        this.state = 'error';
        this.connectionQuality = 'critical';
        console.error('❌ SSE Client: Connection error', error);
        this.handleReconnection();
      };
      
    } catch (error) {
      console.error('❌ SSE Client: Failed to create connection', error);
      this.state = 'error';
    }
  }
  
  /**
   * Disconnect from SSE endpoint
   */
  private disconnect(): void {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    this.state = 'disconnected';
    console.log('🔌 SSE Client: Disconnected');
  }
  
  /**
   * Handle reconnection
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= 5) {
      console.log('🔄 SSE Client: Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    this.state = 'reconnecting';
    
    setTimeout(() => {
      this.connect();
    }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000));
  }
  
  /**
   * Broadcast message to all subscribers
   */
  private broadcastToSubscribers(message: SSEMessage): void {
    this.subscribers.forEach((subscriber) => {
      try {
        subscriber.callback(message);
      } catch (error) {
        console.error('❌ SSE Client: Subscriber callback error', error);
      }
    });
  }
  
  /**
   * Cleanup method
   */
  public cleanup(): void {
    console.log('🧹 SSE Client: Cleaning up');
    this.disconnect();
    this.subscribers.clear();
    this.user = null;
    this.sessionId = null;
  }
}

// Export singleton instance
export const sseClient = SSEClient.getInstance();
