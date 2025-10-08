# Real-time Notifications System

This guide covers the implementation and usage of the real-time notifications system for the patient management application.

## Overview

The real-time notifications system provides instant updates to users when transfer statuses change, new transfers are created, or other important events occur. It uses Socket.IO for WebSocket communication and includes persistent notification storage.

## Features

- **Real-time Updates**: Instant notifications via WebSocket connections
- **Persistent Storage**: Notifications are stored in MongoDB for offline access
- **User Targeting**: Notifications can be targeted to specific users or roles
- **Multiple Delivery Methods**: Real-time, email, SMS, and push notifications (extensible)
- **Notification Preferences**: Users can customize their notification settings
- **Toast Notifications**: Non-intrusive popup notifications
- **Notification Panel**: Full notification management interface
- **Sound Alerts**: Audio notifications for urgent events
- **Auto-hide**: Notifications automatically disappear after a set time

## Architecture

### Components

1. **Socket.IO Server** (`src/lib/socket-server.ts`)
   - Handles WebSocket connections
   - Manages user authentication
   - Emits notifications to connected clients

2. **Notification Service** (`src/lib/socket-server.ts`)
   - Creates and sends notifications
   - Manages notification persistence
   - Handles user targeting

3. **Notification Model** (`src/models/Notification.ts`)
   - MongoDB schema for persistent notifications
   - Tracks delivery status and read receipts

4. **React Components**
   - `RealtimeNotifications`: Main notification panel
   - `NotificationToast`: Popup toast notifications
   - `NotificationManager`: Orchestrates the notification system
   - `NotificationIntegration`: Dashboard integration component

5. **API Endpoints**
   - `/api/notifications`: CRUD operations for notifications
   - `/api/notifications/preferences`: User preference management

## Installation

The system is already integrated into the application. Dependencies include:

```json
{
  "socket.io": "^4.x.x",
  "socket.io-client": "^4.x.x"
}
```

## Usage

### Basic Integration

Add the notification system to your dashboard:

```tsx
import NotificationIntegration from '@/components/dashboard/NotificationIntegration';

function Dashboard() {
  return (
    <div>
      {/* Your dashboard content */}
      
      {/* Add notification integration */}
      <NotificationIntegration
        showToasts={true}
        showPanel={false}
        position="top-right"
      />
    </div>
  );
}
```

### Advanced Usage

For more control, use the NotificationManager directly:

```tsx
import NotificationManager from '@/components/notifications/NotificationManager';

function MyComponent() {
  return (
    <NotificationManager
      userId={user._id}
      userType={user.userType}
      token={token}
      showToasts={true}
      showPanel={true}
      maxToasts={5}
      toastAutoHide={true}
      toastHideDelay={7000}
      enableSound={true}
    />
  );
}
```

### Using the Socket Hook

For custom notification handling:

```tsx
import { useSocket } from '@/hooks/useSocket';

function MyComponent() {
  const { socket, connected, on, off } = useSocket({
    token: userToken,
    userId: user._id,
    userType: user.userType
  });

  useEffect(() => {
    if (socket) {
      on('transfer_status_change', (notification) => {
        console.log('Status changed:', notification);
        // Handle the notification
      });

      return () => {
        off('transfer_status_change');
      };
    }
  }, [socket, on, off]);

  return <div>Connected: {connected ? 'Yes' : 'No'}</div>;
}
```

## Notification Types

### Transfer Status Changes
- **Event**: `transfer_status_change`
- **Triggered**: When transfer status changes (pending → accepted → in_progress → completed)
- **Target**: All users involved in the transfer

### New Transfers
- **Event**: `new_transfer`
- **Triggered**: When a new transfer is created
- **Target**: All employees (for assignment)

### Urgent Transfers
- **Event**: `urgent_transfer`
- **Triggered**: When a stat/urgent transfer is created
- **Target**: All managers and employees
- **Special**: Plays sound notification

### Transfer Reminders
- **Event**: `transfer_reminder`
- **Triggered**: Before scheduled transfers
- **Target**: Assigned employee and requesting manager

## API Reference

### GET /api/notifications

Get notifications for the authenticated user.

**Query Parameters:**
- `type`: Filter by notification type
- `priority`: Filter by priority (low, medium, high)
- `status`: Filter by read status (unread, read, all)
- `limit`: Number of notifications to return
- `offset`: Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "summary": {
      "total": 10,
      "unread": 3,
      "high": 1,
      "medium": 5,
      "low": 4
    },
    "pagination": {
      "total": 10,
      "limit": 20,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

### POST /api/notifications

Mark notifications as read or dismissed.

**Body:**
```json
{
  "action": "mark_read", // or "mark_dismissed", "clear_all"
  "notificationIds": ["id1", "id2"], // optional
  "notificationId": "id", // optional
  "all": true // optional
}
```

### GET /api/notifications/preferences

Get user's notification preferences.

**Response:**
```json
{
  "success": true,
  "data": {
    "preferences": {
      "realtime": {
        "enabled": true,
        "sound": true,
        "desktop": true,
        "types": {
          "transfer_status_change": true,
          "new_transfer": true,
          "urgent_transfer": true,
          "transfer_reminder": true,
          "system": true,
          "scheduling": true
        }
      },
      "email": { ... },
      "sms": { ... },
      "push": { ... },
      "quietHours": {
        "enabled": false,
        "start": "22:00",
        "end": "08:00",
        "timezone": "UTC"
      }
    }
  }
}
```

### PUT /api/notifications/preferences

Update user's notification preferences.

**Body:**
```json
{
  "preferences": {
    "realtime": {
      "enabled": true,
      "sound": false,
      "types": {
        "transfer_status_change": true,
        "new_transfer": false
      }
    }
  }
}
```

## Configuration

### Environment Variables

```env
# Socket.IO Configuration
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
NODE_ENV=development

# JWT Secret (for socket authentication)
JWT_SECRET=your-jwt-secret
```

### Server Configuration

The Socket.IO server is automatically initialized in `server.js`:

```javascript
const { initializeSocketServer } = require('./src/lib/socket-server');

// Initialize Socket.IO server
const io = initializeSocketServer(httpServer);
```

## Testing

Run the comprehensive test suite:

```bash
node scripts/test-realtime-notifications.js
```

The test suite covers:
- Authentication
- Socket.IO connections
- Transfer creation and status changes
- Notification delivery
- API endpoints
- Room management

## Troubleshooting

### Common Issues

1. **Socket Connection Failed**
   - Check if the server is running
   - Verify JWT token is valid
   - Check CORS configuration

2. **Notifications Not Received**
   - Verify user is authenticated
   - Check notification preferences
   - Ensure user has correct role permissions

3. **Sound Not Playing**
   - Check browser audio permissions
   - Verify sound file exists at `/notification-sound.mp3`
   - Check user's sound preferences

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=socket.io:*
```

### Browser Console

Check browser console for Socket.IO connection status and any errors.

## Security Considerations

1. **Authentication**: All socket connections require valid JWT tokens
2. **Authorization**: Users only receive notifications they're authorized to see
3. **Rate Limiting**: Consider implementing rate limiting for notification creation
4. **Data Validation**: All notification data is validated before storage

## Performance

1. **Connection Limits**: Monitor concurrent socket connections
2. **Memory Usage**: Notifications are automatically cleaned up after expiration
3. **Database Indexes**: Proper indexes are in place for efficient queries
4. **Pagination**: API endpoints support pagination for large notification lists

## Future Enhancements

1. **Email Notifications**: Integrate with email service providers
2. **SMS Notifications**: Add SMS delivery via services like Twilio
3. **Push Notifications**: Implement browser push notifications
4. **Notification Templates**: Customizable notification templates
5. **Analytics**: Track notification engagement and delivery rates
6. **Bulk Operations**: Support for bulk notification management
7. **Notification Scheduling**: Schedule notifications for future delivery

## Support

For issues or questions about the real-time notifications system:

1. Check the troubleshooting section above
2. Review the test suite for expected behavior
3. Check server logs for error messages
4. Verify all dependencies are properly installed
