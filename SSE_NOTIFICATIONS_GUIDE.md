# Server-Sent Events (SSE) Notifications System

## Overview

This document describes the implementation of Server-Sent Events (SSE) for real-time notifications in the patient management system. The SSE implementation replaces the previous polling-based system, providing more efficient real-time communication.

## Architecture

### Components

1. **SSE Server Endpoint** (`/api/notifications/sse`)
   - Handles SSE connections
   - Manages user authentication
   - Sends real-time notifications

2. **NotificationSSEService** (`src/lib/notification-sse-service.ts`)
   - Singleton service for managing SSE connections
   - Handles notification broadcasting
   - Manages connection cleanup

3. **useNotificationSSE Hook** (`src/hooks/useNotificationSSE.ts`)
   - React hook for SSE connections
   - Handles reconnection logic
   - Provides connection state

4. **Updated Components**
   - `SchedulingNotifications.tsx` - No more polling intervals
   - `NotificationIntegration.tsx` - Real-time unread count updates
   - `NotificationManager.tsx` - SSE-based notification handling
   - `RealtimeNotifications.tsx` - SSE instead of Socket.IO
   - `useUrgentAlerts.ts` - Real-time urgent alerts
   - `useDashboardData.ts` - Real-time dashboard updates
   - `useRecentActivity.ts` - Real-time activity updates

## Key Features

### Real-time Notifications
- **Transfer Status Changes**: Instant updates when transfer status changes
- **New Transfers**: Real-time notifications for new transfer requests
- **Urgent Alerts**: Immediate alerts for urgent transfers
- **Transfer Reminders**: Scheduled reminders for upcoming transfers

### Connection Management
- **Automatic Reconnection**: Handles connection drops with exponential backoff
- **Heartbeat System**: Keeps connections alive with 30-second heartbeats
- **Connection Cleanup**: Removes stale connections automatically

### Authentication
- **JWT-based**: Uses existing authentication system
- **User-specific**: Each connection is tied to a specific user
- **Role-based**: Supports different user types (manager, employee, admin)

## Implementation Details

### SSE Endpoint (`/api/notifications/sse`)

```typescript
// GET /api/notifications/sse
export async function GET(request: NextRequest) {
  // Authenticate user
  const authResult = await requireEmployeeOrManager(request);
  
  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      // Register connection with service
      // Set up heartbeat
    }
  });
  
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Notification Service

```typescript
export class NotificationSSEService {
  private connections: Map<string, SSEConnection> = new Map();
  
  // Send to specific user
  sendToUser(userId: string, notification: NotificationData)
  
  // Send to role-based users
  sendToRole(userType: string, notification: NotificationData)
  
  // Send to all users
  sendToAll(notification: NotificationData)
  
  // Transfer-specific notifications
  sendTransferStatusChange(transfer, oldStatus, newStatus, changedBy)
  sendUrgentTransferNotification(transfer, urgency)
  sendTransferReminder(transfer, reminderType)
}
```

### SSE Hook

```typescript
export function useNotificationSSE() {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<NotificationData | null>(null);
  
  // Connection management
  // Reconnection logic
  // Message handling
}
```

## Message Types

### Connection Messages
- `connection` - Initial connection confirmation
- `heartbeat` - Keep-alive messages (every 30 seconds)

### Notification Messages
- `transfer_status_change` - Transfer status updates
- `new_transfer` - New transfer requests
- `urgent_transfer` - Urgent transfer alerts
- `transfer_reminder` - Transfer reminders
- `notification_count_update` - Unread count updates
- `urgent_alerts_update` - Urgent alerts updates
- `dashboard_update` - Dashboard data updates
- `activity_update` - Recent activity updates

## Migration from Polling

### Removed Polling Code
- ❌ `setInterval(fetchNotifications, refreshInterval)` in SchedulingNotifications
- ❌ `setInterval(fetchUnreadCount, 30000)` in NotificationIntegration
- ❌ `setInterval(() => fetchUrgentTransfers(false), 15000)` in useUrgentAlerts
- ❌ `setInterval(() => fetchDashboardData(false), 30000)` in useDashboardData
- ❌ `setInterval(() => fetchRecentActivity(false), 60000)` in useRecentActivity

### Replaced with SSE
- ✅ Real-time notifications via SSE
- ✅ Automatic reconnection handling
- ✅ Efficient one-way communication
- ✅ Better performance and reduced server load

## Benefits

### Performance
- **Reduced Server Load**: No more constant polling requests
- **Lower Bandwidth**: Only sends data when there are updates
- **Better Scalability**: SSE connections are more efficient than polling

### User Experience
- **Instant Updates**: Notifications appear immediately
- **Real-time Feel**: No delays or refresh intervals
- **Better Reliability**: Automatic reconnection on connection loss

### Development
- **Simpler Code**: No more interval management
- **Better Error Handling**: Built-in reconnection logic
- **Easier Testing**: SSE connections are easier to test than polling

## Testing

### Manual Testing
1. Open browser developer tools
2. Navigate to `/api/notifications/sse` (requires authentication)
3. Check for SSE connection establishment
4. Trigger notifications and verify real-time delivery

### Automated Testing
```bash
# Run the SSE test script
node scripts/test-sse-notifications.js
```

## Configuration

### Environment Variables
- `NEXT_PUBLIC_APP_URL` - Base URL for SSE connections
- `JWT_SECRET` - For authentication (existing)

### SSE Settings
- **Heartbeat Interval**: 30 seconds
- **Reconnection Attempts**: 5 attempts
- **Reconnection Delay**: Exponential backoff starting at 1 second
- **Connection Cleanup**: 5 minutes for stale connections

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check authentication token
   - Verify user permissions
   - Ensure SSE endpoint is accessible

2. **No Notifications Received**
   - Check browser console for errors
   - Verify SSE connection is established
   - Check notification service is running

3. **Frequent Disconnections**
   - Check network stability
   - Verify server is not overloaded
   - Check for proxy/firewall issues

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` to see detailed SSE connection logs.

## Future Enhancements

### Planned Features
- **Message Queuing**: Store messages for offline users
- **Push Notifications**: Browser push notifications for urgent alerts
- **Message History**: Store and retrieve notification history
- **User Preferences**: Granular notification preferences

### Performance Optimizations
- **Connection Pooling**: Optimize connection management
- **Message Batching**: Batch multiple notifications
- **Compression**: Compress large notification payloads

## Conclusion

The SSE implementation provides a robust, efficient, and scalable solution for real-time notifications. It eliminates the need for polling, reduces server load, and provides a better user experience with instant updates.

The migration from polling to SSE is complete, and all notification components now use the new SSE-based system for real-time communication.

