# Real-Time Notifications System

## Overview

The Real-Time Notifications System provides instant, bidirectional communication between the server and clients using Socket.io WebSockets, complemented by Web Push API for native browser notifications. The system supports in-app real-time updates, live dashboard statistics, and native push notifications for urgent events in the patient transfer management system.

## Architecture

### Technology Stack

- **Primary**: Socket.io (WebSockets with fallback)
- **Secondary**: Web Push API (native notifications)
- **Deployment**: Railway (WebSocket-compatible)
- **Fallback**: Database polling for offline users

### Module Structure

```
src/lib/realtime/
├── core/           # Main service, types, config, constants
├── providers/      # Socket.io & Web Push providers
├── server/         # Socket server setup & handlers
├── client/         # React hooks & context
├── utils/          # Targeting, formatting, tracking
└── integrations/   # Transfer/User/System events
```

## Features

### ✅ Implemented Features

1. **Real-time Notifications**
   - Instant delivery via Socket.io
   - Native browser notifications via Web Push API
   - Email/SMS fallback integration
   - Notification persistence and offline delivery

2. **Live Dashboard Updates**
   - Real-time stats updates
   - Live activity feed
   - Urgent transfer alerts
   - User presence indicators

3. **Transfer Lifecycle Integration**
   - Automatic notifications on transfer events
   - Status change alerts
   - Assignment notifications
   - Completion/cancellation alerts

4. **User Management**
   - Role-based targeting
   - User-specific rooms
   - Notification preferences
   - Quiet hours support

5. **Admin Tools**
   - Real-time test panel
   - System health monitoring
   - Notification testing utilities
   - Analytics and statistics

## Quick Start

### 1. Generate VAPID Keys

```bash
npm run generate-vapid-keys
```

This will generate VAPID keys and add them to your `.env.local` file.

### 2. Configure Environment Variables

Add to your `.env.local`:

```env
# VAPID Keys for Web Push
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=mailto:admin@your-domain.com

# Web Push Configuration
ENABLE_WEB_PUSH=true
ENABLE_PRESENCE=true
ENABLE_ANALYTICS=true
ENABLE_RATE_LIMITING=true
```

### 3. Start the Server

```bash
npm run dev:server
```

The Socket.io server will be initialized automatically.

### 4. Test the System

Visit `/admin/realtime-test` to access the admin test panel.

## API Reference

### Socket Events

#### Connection Events
- `connection` - Client connected
- `disconnect` - Client disconnected
- `authenticate` - Authentication request

#### Notification Events
- `notification:new` - New notification created
- `notification:read` - Notification marked as read
- `notification:dismissed` - Notification dismissed
- `notification:deleted` - Notification deleted

#### Transfer Events
- `transfer:created` - New transfer created
- `transfer:updated` - Transfer updated
- `transfer:assigned` - Transfer assigned
- `transfer:completed` - Transfer completed
- `transfer:cancelled` - Transfer cancelled
- `transfer:status_changed` - Transfer status changed

#### Dashboard Events
- `dashboard:stats:update` - Dashboard stats updated
- `dashboard:activity:new` - New activity entry
- `dashboard:urgent:alert` - Urgent transfer alert

#### System Events
- `system:announcement` - Admin broadcast
- `user:presence` - User online/offline status

### REST API Endpoints

#### Notifications
- `GET /api/realtime/notifications` - Get user notifications
- `POST /api/realtime/notifications` - Create notification (admin only)
- `POST /api/realtime/notifications/read` - Mark as read
- `POST /api/realtime/notifications/dismiss` - Dismiss notification

#### Web Push
- `GET /api/realtime/notifications/vapid-key` - Get VAPID public key
- `POST /api/realtime/notifications/subscribe` - Subscribe to push notifications
- `DELETE /api/realtime/notifications/subscribe` - Unsubscribe from push notifications

#### Testing
- `GET /api/realtime/test?action=status` - Get system status
- `GET /api/realtime/test?action=stats` - Get notification statistics
- `GET /api/realtime/test?action=connections` - Get connection statistics
- `POST /api/realtime/test` - Run tests (admin only)

## React Integration

### Context Provider

Wrap your app with the `RealtimeProvider`:

```tsx
import { RealtimeProvider } from '@/contexts/RealtimeContext';

function App() {
  return (
    <RealtimeProvider>
      {/* Your app components */}
    </RealtimeProvider>
  );
}
```

### Hooks

#### useRealtime()
Main hook for accessing real-time functionality:

```tsx
import { useRealtime } from '@/contexts/RealtimeContext';

function MyComponent() {
  const { 
    isConnected, 
    notifications, 
    unreadCount,
    markAsRead,
    subscribeToPush 
  } = useRealtime();

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>Unread: {unreadCount}</p>
    </div>
  );
}
```

#### useNotifications()
Hook for managing notifications:

```tsx
import { useNotifications } from '@/hooks/realtime';

function NotificationList() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAsDismissed 
  } = useNotifications({
    unreadOnly: false,
    limit: 20
  });

  return (
    <div>
      {notifications.map(notification => (
        <div key={notification.id}>
          <h3>{notification.title}</h3>
          <p>{notification.message}</p>
          <button onClick={() => markAsRead(notification.id)}>
            Mark as Read
          </button>
        </div>
      ))}
    </div>
  );
}
```

#### useWebPush()
Hook for Web Push functionality:

```tsx
import { useWebPush } from '@/hooks/realtime';

function PushSettings() {
  const { 
    isSupported, 
    isSubscribed, 
    subscribe, 
    unsubscribe 
  } = useWebPush();

  return (
    <div>
      {isSupported && (
        <button onClick={isSubscribed ? unsubscribe : subscribe}>
          {isSubscribed ? 'Unsubscribe' : 'Subscribe'} to Push Notifications
        </button>
      )}
    </div>
  );
}
```

### Components

#### NotificationBell
Enhanced notification bell with real-time updates:

```tsx
import NotificationBell from '@/components/dashboard/widgets/NotificationBell';

function Header() {
  return (
    <div className="header">
      <NotificationBell 
        showToasts={true}
        showPanel={true}
        position="top-right"
      />
    </div>
  );
}
```

#### NotificationPanel
Dropdown panel for notifications:

```tsx
import { NotificationPanel } from '@/components/realtime';

function NotificationDropdown() {
  return (
    <NotificationPanel
      notifications={notifications}
      unreadCount={unreadCount}
      isLoading={isLoading}
      error={error}
      onClose={() => setShowPanel(false)}
      position="top-right"
    />
  );
}
```

## Server Integration

### Transfer Events

Integrate with transfer lifecycle events:

```typescript
import { TransferIntegrationService } from '@/lib/realtime/integrations';

const transferIntegration = TransferIntegrationService.getInstance();

// In your transfer service
async function updateTransferStatus(transferId: string, newStatus: string, userId: string) {
  const transfer = await getTransfer(transferId);
  const user = await getUser(userId);
  
  // Update transfer in database
  await updateTransfer(transferId, { status: newStatus });
  
  // Emit real-time events
  await transferIntegration.handleTransferStatusChange(
    transfer, 
    transfer.status, 
    newStatus, 
    user
  );
}
```

### Dashboard Updates

Emit dashboard updates:

```typescript
import { DashboardIntegrationService } from '@/lib/realtime/integrations';

const dashboardIntegration = DashboardIntegrationService.getInstance();

// When stats change
await dashboardIntegration.emitStatsUpdate({
  totalPending: 5,
  totalCompleted: 10,
  // ... other stats
});

// When new activity occurs
await dashboardIntegration.emitActivityUpdate({
  type: 'transfer_created',
  description: 'New transfer created',
  timestamp: new Date()
});
```

## Configuration

### Socket.io Configuration

```typescript
// src/lib/realtime/core/config.ts
export const REALTIME_CONFIG = {
  socket: {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000,
    cors: {
      origin: process.env.BASE_URL,
      credentials: true
    }
  },
  notifications: {
    maxRetries: 3,
    retryDelay: 5000,
    expirationTime: 24 * 60 * 60 * 1000, // 24 hours
    batchSize: 100
  },
  webPush: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    vapidEmail: process.env.VAPID_EMAIL
  }
};
```

### Environment Variables

```env
# Required
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:admin@your-domain.com

# Optional
ENABLE_WEB_PUSH=true
ENABLE_PRESENCE=true
ENABLE_ANALYTICS=true
ENABLE_RATE_LIMITING=true
BASE_URL=https://your-domain.com
```

## Testing

### Automated Testing

Run the test suite:

```bash
# Run all tests
npm run test:realtime

# Run health check only
npm run test:realtime:health
```

### Manual Testing

1. Visit `/admin/realtime-test` (admin access required)
2. Use the test panel to:
   - Test socket connections
   - Send test notifications
   - Test Web Push functionality
   - Run comprehensive system tests

### Test Scripts

```bash
# Generate VAPID keys
npm run generate-vapid-keys

# Validate VAPID keys
npm run validate-vapid-keys

# Test real-time system
npm run test:realtime
```

## Deployment

### Railway Deployment

The system is optimized for Railway deployment:

1. Set environment variables in Railway dashboard
2. Deploy using `npm run deploy:railway`
3. Monitor logs with `npm run logs:railway`

### Environment Setup

```bash
# Production environment variables
VAPID_PUBLIC_KEY=your_production_vapid_public_key
VAPID_PRIVATE_KEY=your_production_vapid_private_key
VAPID_EMAIL=mailto:admin@your-production-domain.com
BASE_URL=https://your-production-domain.com
NODE_ENV=production
```

## Monitoring and Analytics

### Health Checks

The system provides comprehensive health monitoring:

- Socket connection status
- Notification delivery rates
- Web Push subscription statistics
- System performance metrics

### Logging

All real-time events are logged with structured data:

```typescript
log.info('Notification sent successfully', {
  notificationId,
  targetUsers: targetUsers.length,
  channels: channels.length,
  successfulDeliveries: results.filter(r => r.success).length
});
```

### Analytics

Access analytics through the admin panel or API:

```typescript
// Get notification statistics
const stats = await notificationService.getNotificationStats();

// Get connection statistics
const connections = socketProvider.getConnectionStats();

// Get Web Push statistics
const pushStats = await pushProvider.getSubscriptionStats();
```

## Troubleshooting

### Common Issues

#### Socket Connection Failed
- Check if Socket.io server is running
- Verify CORS configuration
- Check authentication token

#### Web Push Not Working
- Verify VAPID keys are configured
- Check browser support
- Ensure HTTPS in production

#### Notifications Not Delivered
- Check user targeting
- Verify notification preferences
- Check delivery method configuration

### Debug Mode

Enable debug logging:

```env
NODE_ENV=development
DEBUG=socket.io:*
```

### Health Check

Check system health:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/realtime/test?action=status
```

## Security Considerations

### Authentication
- All Socket.io connections require JWT authentication
- API endpoints are protected with session-based auth
- Admin functions require admin/super_admin roles

### Rate Limiting
- Socket events are rate-limited per user
- API endpoints have rate limiting
- Notification delivery is throttled

### Data Privacy
- User notifications are encrypted in transit
- Push subscriptions are stored securely
- Audit logs track all notification events

## Performance Optimization

### Connection Management
- Automatic reconnection with exponential backoff
- Connection pooling and scaling
- Room-based message targeting

### Notification Delivery
- Batch processing for multiple notifications
- Priority-based delivery queues
- Retry mechanisms with backoff

### Memory Management
- Notification cleanup for expired items
- Connection cleanup for disconnected users
- Efficient data structures for real-time updates

## Future Enhancements

### Planned Features
- Redis adapter for multi-instance scaling
- Advanced notification scheduling
- Rich notification templates
- Mobile app integration
- Advanced analytics dashboard

### Integration Opportunities
- Slack/Teams notifications
- SMS gateway integration
- Email template system
- Advanced user preferences
- Notification analytics

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review the test panel at `/admin/realtime-test`
3. Check system logs
4. Run health checks
5. Contact the development team

## License

This real-time notification system is part of the Patient Management System and follows the same licensing terms.
