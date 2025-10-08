"use client";

interface SSEMessage {
  type: string;
  data?: any;
  message?: string;
  userId?: string;
  userType?: string;
  timestamp?: string;
}

interface SSESubscriber {
  id: string;
  callback: (message: SSEMessage) => void;
}

class GlobalSSEManager {
  private static instance: GlobalSSEManager;
  private eventSource: EventSource | null = null;
  private subscribers: Map<string, SSESubscriber> = new Map();
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private lastSuccessfulMessage: number = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private user: any = null;

  private constructor() {
    console.log('🌐 Global SSE Manager: Instance created');
  }

  public static getInstance(): GlobalSSEManager {
    if (!GlobalSSEManager.instance) {
      GlobalSSEManager.instance = new GlobalSSEManager();
    }
    return GlobalSSEManager.instance;
  }

  public setUser(user: any) {
    this.user = user;
    console.log('🌐 Global SSE Manager: User set', { userId: user?._id, userType: user?.userType });
  }

  public subscribe(subscriberId: string, callback: (message: SSEMessage) => void): () => void {
    console.log('🌐 Global SSE Manager: Subscribing', { subscriberId, totalSubscribers: this.subscribers.size + 1 });
    
    this.subscribers.set(subscriberId, { id: subscriberId, callback });
    
    // If this is the first subscriber and we have a user, establish connection
    if (this.subscribers.size === 1 && this.user) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      console.log('🌐 Global SSE Manager: Unsubscribing', { subscriberId, remainingSubscribers: this.subscribers.size - 1 });
      this.subscribers.delete(subscriberId);
      
      // If no more subscribers, disconnect
      if (this.subscribers.size === 0) {
        this.disconnect();
      }
    };
  }

  private connect() {
    if (this.isConnecting || this.isConnected || !this.user) {
      console.log('🌐 Global SSE Manager: Connection skipped', { 
        isConnecting: this.isConnecting, 
        isConnected: this.isConnected, 
        hasUser: !!this.user 
      });
      return;
    }

    console.log('🌐 Global SSE Manager: Establishing connection', { userId: this.user._id });
    this.isConnecting = true;

    try {
      this.eventSource = new EventSource('/api/notifications/sse', {
        withCredentials: true
      });

      this.eventSource.onopen = () => {
        console.log('✅ Global SSE Manager: Connection opened successfully');
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.lastSuccessfulMessage = Date.now();
        this.startHeartbeat();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.lastSuccessfulMessage = Date.now();
          
          console.log('📨 Global SSE Manager: Message received', { 
            type: data.type, 
            subscribers: this.subscribers.size 
          });
          
          // Broadcast to all subscribers
          this.subscribers.forEach(subscriber => {
            try {
              subscriber.callback(data);
            } catch (error) {
              console.error('Error in subscriber callback:', error);
            }
          });
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('❌ Global SSE Manager: Connection error', error);
        this.isConnected = false;
        this.isConnecting = false;
        this.stopHeartbeat();
        
        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`🔄 Global SSE Manager: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
          
          setTimeout(() => {
            if (this.subscribers.size > 0) {
              this.connect();
            }
          }, delay);
        } else {
          console.error('❌ Global SSE Manager: Max reconnection attempts reached');
        }
      };

    } catch (error) {
      console.error('❌ Global SSE Manager: Failed to create connection', error);
      this.isConnecting = false;
    }
  }

  private disconnect() {
    console.log('🌐 Global SSE Manager: Disconnecting');
    this.isConnected = false;
    this.isConnecting = false;
    this.stopHeartbeat();
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      const timeSinceLastMessage = Date.now() - this.lastSuccessfulMessage;
      if (timeSinceLastMessage > 60000) { // 1 minute without messages
        console.log('💓 Global SSE Manager: Heartbeat timeout, reconnecting');
        this.disconnect();
        if (this.subscribers.size > 0) {
          this.connect();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      subscribers: this.subscribers.size,
      reconnectAttempts: this.reconnectAttempts,
      lastSuccessfulMessage: this.lastSuccessfulMessage
    };
  }
}

export const globalSSEManager = GlobalSSEManager.getInstance();
