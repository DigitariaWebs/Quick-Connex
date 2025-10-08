# Global SSE System Documentation

## Overview

The Global SSE (Server-Sent Events) System is a comprehensive real-time notification architecture that provides a single, persistent connection across all pages and components in the application. This system replaces the previous multiple-connection approach with a clean, efficient single-connection architecture.

## Architecture

### Core Components

1. **Global SSE Manager** (`src/lib/global-sse-manager.ts`)
   - Singleton class that manages the single SSE connection
   - Handles connection lifecycle, reconnection logic, and heartbeat monitoring
   - Manages multiple subscribers to the same connection

2. **SSE Context Provider** (`src/contexts/SSEContext.tsx`)
   - React context that provides SSE state to all components
   - Single subscription to the global SSE manager
   - Manages connection status and message distribution

3. **SSE Hook** (`useSSE()`)
   - Custom hook that components use to access SSE state
   - Provides connection status, messages, and error handling

4. **Server-Side SSE Endpoint** (`src/app/api/notifications/sse/route.ts`)
   - Simplified endpoint that provides the SSE stream
   - No server-side connection tracking (handled by client)

## Key Features

### ✅ Single Connection Management
- **One SSE connection** per user session
- **Persistent across all pages** during navigation
- **Automatic reconnection** with exponential backoff
- **Heartbeat monitoring** to detect connection issues

### ✅ Efficient Resource Usage
- **Shared connection** across all components
- **No duplicate connections** or subscribers
- **Automatic cleanup** when no subscribers remain
- **Memory efficient** with proper subscription management

### ✅ Real-time Notifications
- **Transfer status changes** - Instant updates when transfer status changes
- **New transfers** - Real-time notifications for new transfer requests
- **Urgent alerts** - Immediate alerts for urgent transfers
- **Transfer reminders** - Scheduled reminders for upcoming transfers

### ✅ Robust Error Handling
- **Connection quality monitoring** (excellent, good, poor, disconnected)
- **Automatic reconnection** with retry limits
- **Error state management** with user feedback
- **Fallback mechanisms** for connection failures

## File Structure

```
src/
├── lib/
│   └── global-sse-manager.ts          # Core SSE connection manager
├── contexts/
│   └── SSEContext.tsx                 # React context provider
├── app/
│   ├── layout.tsx                     # SSE provider integration
│   └── api/
│       └── notifications/
│           └── sse/
│               └── route.ts           # Server-side SSE endpoint
└── components/
    └── notifications/
        ├── ConnectionStatusIndicator.tsx  # Visual connection status
        └── SSEDebugger.tsx               # Debug information
```

## Usage Guide

### 1. Basic Component Integration

```tsx
import { useSSE } from '@/contexts/SSEContext';

function MyComponent() {
  const { connected, lastMessage, error } = useSSE();
  
  useEffect(() => {
    if (lastMessage) {
      // Handle incoming SSE message
      console.log('Received:', lastMessage);
    }
  }, [lastMessage]);
  
  return (
    <div>
      Status: {connected ? 'Connected' : 'Disconnected'}
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

### 2. Message Handling

```tsx
const { lastMessage } = useSSE();

useEffect(() => {
  if (!lastMessage) return;
  
  switch (lastMessage.type) {
    case 'transfer_status_change':
      // Handle transfer status update
      break;
    case 'new_transfer':
      // Handle new transfer notification
      break;
    case 'urgent_transfer':
      // Handle urgent transfer alert
      break;
    case 'heartbeat':
      // Connection is alive
      break;
  }
}, [lastMessage]);
```

### 3. Connection Status Monitoring

```tsx
const { 
  connected, 
  connecting, 
  error, 
  connectionQuality, 
  retryCount, 
  subscribers 
} = useSSE();

// Connection quality levels:
// - 'excellent': < 30 seconds since last message
// - 'good': 30-60 seconds since last message  
// - 'poor': > 60 seconds since last message
// - 'disconnected': No active connection
```

## Configuration

### Global SSE Manager Settings

```typescript
// In global-sse-manager.ts
private maxReconnectAttempts: number = 5;
private reconnectDelay: number = 1000; // Base delay in ms
private heartbeatInterval: number = 30000; // 30 seconds
```

### Connection Quality Thresholds

```typescript
// In SSEContext.tsx
if (timeSinceLastMessage < 30000) {
  setConnectionQuality('excellent');
} else if (timeSinceLastMessage < 60000) {
  setConnectionQuality('good');
} else {
  setConnectionQuality('poor');
}
```

## Message Types

### Standard Message Format

```typescript
interface SSEMessage {
  type: string;
  data?: any;
  message?: string;
  userId?: string;
  userType?: string;
  timestamp?: string;
}
```

### Supported Message Types

1. **`connection`** - Initial connection established
2. **`heartbeat`** - Keep-alive message (every 30 seconds)
3. **`transfer_status_change`** - Transfer status updated
4. **`new_transfer`** - New transfer request created
5. **`urgent_transfer`** - Urgent transfer alert
6. **`transfer_reminder`** - Scheduled transfer reminder

## Integration Points

### Components Using SSE

All these components now use the global SSE system:

- `ConnectionStatusIndicator` - Shows connection status
- `SSEDebugger` - Debug information display
- `useDashboardData` - Dashboard data updates
- `useUrgentAlerts` - Urgent transfer alerts
- `useRecentActivity` - Recent activity updates
- `SchedulingNotifications` - Scheduling notifications
- `NotificationPopupManager` - Popup notifications
- `NotificationManager` - Notification management
- `RealtimeNotifications` - Real-time notifications
- `NotificationIntegration` - Dashboard notification bell

### Hooks Using SSE

- `useSSE()` - Main hook for accessing SSE state
- All hooks now use the context instead of individual connections

## Debugging

### Connection Status Indicator

The connection status indicator (bottom center of screen) shows:
- **Connection count** (should always be 1)
- **System health** (healthy/degraded/critical)
- **Last updated** timestamp
- **Issues and recommendations**

### SSE Debugger

The debug panel (bottom right) shows:
- **Connection status** (connected/connecting)
- **Connection quality** (excellent/good/poor/disconnected)
- **Subscriber count** (should be 1)
- **Retry count** (reconnection attempts)
- **Last message** details

### Server Logs

Look for these log patterns:
```
🔗 SSE Context: Subscribing to global SSE manager
📨 SSE Context: Message received
🔗 SSE Endpoint: User [userId] connected to SSE stream
```

## Troubleshooting

### Common Issues

1. **Multiple Connections**
   - **Cause**: Old components still using individual SSE connections
   - **Solution**: Ensure all components use `useSSE()` from context

2. **Connection Not Persisting**
   - **Cause**: Components unmounting and losing connection
   - **Solution**: Connection is managed at layout level, should persist

3. **No Messages Received**
   - **Cause**: Server-side message broadcasting not implemented
   - **Solution**: Implement message broadcasting in transfer operations

4. **High Subscriber Count**
   - **Cause**: Multiple components creating individual subscribers
   - **Solution**: Use SSE context instead of individual hooks

### Debugging Steps

1. **Check Connection Status**
   ```tsx
   const { connected, subscribers } = useSSE();
   console.log('Connected:', connected, 'Subscribers:', subscribers);
   ```

2. **Monitor Server Logs**
   - Look for SSE endpoint requests
   - Check for connection establishment messages
   - Verify single connection per user

3. **Test Message Flow**
   - Trigger a transfer status change
   - Check if message appears in `lastMessage`
   - Verify message type and data structure

## Performance Considerations

### Memory Usage
- **Single connection** per user (not per component)
- **Efficient subscription management** with automatic cleanup
- **Minimal memory footprint** with shared state

### Network Usage
- **One persistent connection** instead of multiple
- **Heartbeat every 30 seconds** to maintain connection
- **Automatic reconnection** with exponential backoff

### CPU Usage
- **Single subscription** instead of multiple
- **Efficient message distribution** through React context
- **Minimal re-renders** with optimized state updates

## Migration from Old System

### What Was Removed
- `useNotificationSSE` hook (deleted)
- `GlobalSSEConnection` component (deleted)
- `useGlobalSSE` hook (deleted)
- Server-side connection tracking
- Multiple individual SSE connections

### What Was Added
- `SSEContext` provider
- `useSSE()` hook
- Global SSE manager
- Single connection architecture
- Context-based state management

## Future Enhancements

### Potential Improvements
1. **Message Queuing** - Queue messages when disconnected
2. **Selective Subscriptions** - Subscribe to specific message types
3. **Connection Pooling** - Multiple connections for high availability
4. **Message Encryption** - Encrypt sensitive notification data
5. **Analytics Integration** - Track connection metrics and usage

### Monitoring
- Connection uptime tracking
- Message delivery success rates
- Reconnection frequency analysis
- Performance metrics collection

## Best Practices

### Do's
- ✅ Use `useSSE()` hook in components
- ✅ Handle connection states gracefully
- ✅ Implement proper error handling
- ✅ Test connection persistence across pages
- ✅ Monitor connection quality indicators

### Don'ts
- ❌ Create individual SSE connections
- ❌ Ignore connection error states
- ❌ Forget to handle message types
- ❌ Skip connection status monitoring
- ❌ Use old SSE hooks or components

## Conclusion

The Global SSE System provides a robust, efficient, and scalable solution for real-time notifications. With a single connection per user, automatic reconnection, and comprehensive error handling, it ensures reliable real-time communication across the entire application.

The system is designed to be:
- **Simple to use** - Single hook for all components
- **Efficient** - One connection shared across all components
- **Reliable** - Automatic reconnection and error handling
- **Scalable** - Can handle multiple users and message types
- **Maintainable** - Clean architecture with clear separation of concerns

For any questions or issues, refer to the debugging section or check the server logs for detailed connection information.
