# Enhanced Timeline Service

## Overview

The Enhanced Timeline Service provides a unified approach to timeline management by directly transforming UnifiedAuditLog data into timeline items for the frontend. This eliminates the need for separate timeline storage while maintaining full audit compliance.

## Architecture

```
UnifiedAuditLog (Source of Truth)
    ↓
Enhanced TimelineService (Data Access + Business Logic + DTO Transformation)
    ↓
Timeline API Controller (Presentation)
    ↓
Frontend Timeline Component
```

## Key Features

### **1. Direct Audit Log Integration**
- **Source of Truth**: UnifiedAuditLog serves as the single source of truth
- **Real-time Data**: Timeline items are generated from live audit logs
- **No Duplication**: Eliminates the need for separate timeline storage

### **2. Comprehensive Timeline Retrieval**
- **Transfer Timeline**: Get timeline for specific transfers
- **User Timeline**: Get timeline for specific users
- **Admin Timeline**: Get system-wide timeline overview
- **Flexible Filtering**: Date ranges, event types, actor types

### **3. Advanced Filtering & Sorting**
- **Event Type Filtering**: Filter by specific timeline event types
- **Actor Type Filtering**: Filter by user roles (admin, manager, employee)
- **Date Range Filtering**: Filter by specific time periods
- **System Event Filtering**: Include/exclude system-generated events
- **Multiple Sort Options**: Sort by timestamp, type, or actor

### **4. Rich Timeline Items**
- **Complete Context**: Actor information, change details, security context
- **Visual Enhancements**: Badges, tags, and status indicators
- **Security Flags**: Sensitive actions and review requirements
- **Change Tracking**: Before/after states and field-level changes

## API Methods

### **TimelineService.getTimelineForTransfer()**
```typescript
const timelineItems = await TimelineService.getTimelineForTransfer(
  transferId: string,
  options: TimelineQueryOptions
): Promise<TimelineItem[]>
```

**Parameters:**
- `transferId`: The transfer ID to get timeline for
- `options`: Query options for filtering and sorting

**Returns:** Array of timeline items for the specified transfer

### **TimelineService.getTimelineForUser()**
```typescript
const timelineItems = await TimelineService.getTimelineForUser(
  userId: string,
  options: TimelineQueryOptions
): Promise<TimelineItem[]>
```

**Parameters:**
- `userId`: The user ID to get timeline for
- `options`: Query options for filtering and sorting

**Returns:** Array of timeline items for the specified user

### **TimelineService.getTimelineForAdmin()**
```typescript
const timelineItems = await TimelineService.getTimelineForAdmin(
  options: TimelineQueryOptions
): Promise<TimelineItem[]>
```

**Parameters:**
- `options`: Query options for filtering and sorting

**Returns:** Array of timeline items for admin overview

## Timeline Query Options

```typescript
interface TimelineQueryOptions {
  page?: number;                    // Page number for pagination
  limit?: number;                   // Number of items per page
  startDate?: Date;                 // Start date for filtering
  endDate?: Date;                   // End date for filtering
  eventTypes?: TimelineEventType[]; // Filter by event types
  actorTypes?: string[];            // Filter by actor types
  includeSystemEvents?: boolean;    // Include system events
  sortBy?: 'timestamp' | 'type' | 'actor'; // Sort field
  sortOrder?: 'asc' | 'desc';       // Sort direction
}
```

## Timeline Item Structure

```typescript
interface TimelineItem {
  // Identifiers
  timelineItemId: string;        // UnifiedAuditLog._id
  transferId: string;           // targetResource.id
  
  // Event Details
  kind: string;                 // derived from action
  title: string;                // human-readable title
  description: string;          // detailed description
  timestamp: Date;              // when it happened
  order: number;                // sequence for stable sorting
  
  // Actor Information
  actor: {
    id: string;                 // actorId
    type: ActorType;            // actorType
    name: string;               // actorName
    email: string;              // actorEmail
    role: string;               // actorRole
  };
  
  // Change Information
  diff?: {
    before: any;                // changes.before
    after: any;                // changes.after
    fields: string[];           // changes.fields
    summary: string;            // changes.changeSummary
  };
  
  // Status Information
  statusAfter?: string;         // new status after this event
  assignedToAfter?: string;     // new assignee after this event
  
  // UI Enhancements
  badges: string[];             // visual tags
  tags: string[];               // filterable tags
  isSensitive: boolean;        // requires special handling
  requiresReview: boolean;     // needs admin review
}
```

## API Endpoints

### **GET /api/transfers/[transferId]/timeline**

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `startDate`: Start date filter (ISO string)
- `endDate`: End date filter (ISO string)
- `eventTypes`: Comma-separated event types
- `actorTypes`: Comma-separated actor types
- `includeSystemEvents`: Include system events (default: true)
- `sortBy`: Sort field (timestamp, type, actor)
- `sortOrder`: Sort direction (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "transfer": { /* transfer details */ },
    "timeline": [ /* timeline items */ ],
    "totalEvents": 10,
    "pagination": {
      "page": 1,
      "limit": 50,
      "hasMore": false
    },
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

## Usage Examples

### **Basic Timeline Retrieval**
```typescript
// Get timeline for a transfer
const timeline = await TimelineService.getTimelineForTransfer('TRANSFER_123');

// Get timeline with filtering
const filteredTimeline = await TimelineService.getTimelineForTransfer('TRANSFER_123', {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  eventTypes: ['status_changed', 'completed'],
  limit: 20
});
```

### **User Timeline**
```typescript
// Get timeline for a specific user
const userTimeline = await TimelineService.getTimelineForUser('USER_123', {
  sortBy: 'timestamp',
  sortOrder: 'desc',
  limit: 50
});
```

### **Admin Overview**
```typescript
// Get system-wide timeline for admin
const adminTimeline = await TimelineService.getTimelineForAdmin({
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  actorTypes: ['admin', 'manager'],
  limit: 100
});
```

### **API Usage**
```typescript
// GET /api/transfers/TRANSFER_123/timeline?page=1&limit=20&sortBy=timestamp&sortOrder=desc
const response = await fetch('/api/transfers/TRANSFER_123/timeline?page=1&limit=20');
const data = await response.json();
```

## Benefits

### **For Developers**
- **Single Source of Truth**: No data duplication between timeline and audit logs
- **Consistent Data**: Timeline always reflects current audit state
- **Simplified Architecture**: Fewer components to maintain
- **Better Performance**: Direct queries to audit logs

### **For Users**
- **Real-time Updates**: Timeline reflects latest audit information
- **Rich Context**: Complete actor and change information
- **Visual Indicators**: Badges and tags for quick understanding
- **Flexible Filtering**: Find specific events easily

### **For Administrators**
- **Complete Audit Trail**: Every timeline event is audited
- **Security Context**: Risk levels and sensitivity flags
- **Compliance Ready**: Export capabilities for audit reports
- **System Overview**: Admin timeline for system monitoring

## Migration from Legacy Timeline

### **Backward Compatibility**
- **Existing APIs**: Continue to work with enhanced data
- **Timeline Events**: Still created for immediate UI updates
- **Gradual Migration**: Can migrate endpoints one by one

### **Data Consistency**
- **Audit Logs**: Primary source of truth
- **Timeline Events**: Still created for real-time updates
- **Synchronization**: Timeline events automatically log to audit system

## Testing

### **Test Script**
```bash
node scripts/test-enhanced-timeline.js
```

### **Test Coverage**
- ✅ Timeline retrieval from audit logs
- ✅ User timeline filtering
- ✅ Admin timeline overview
- ✅ Date and event filtering
- ✅ Timeline item structure
- ✅ Audit log transformation

## Performance Considerations

### **Database Indexes**
- **Audit Log Queries**: Optimized with compound indexes
- **Timeline Sorting**: Efficient sorting by timestamp
- **Filtering**: Indexed fields for fast filtering

### **Caching Strategy**
- **Future Enhancement**: Can add caching layer if needed
- **Current Performance**: Direct queries are fast with proper indexes
- **Scalability**: Can handle large audit log volumes

## Security Features

### **Access Control**
- **User Permissions**: Timeline access based on user roles
- **Transfer Access**: Users can only see assigned transfers
- **Admin Access**: Full system timeline for administrators

### **Sensitive Data**
- **Sensitive Actions**: Flagged for special handling
- **Review Requirements**: Actions requiring admin review
- **Security Flags**: Additional security context

## Conclusion

The Enhanced Timeline Service provides a clean, efficient, and compliant approach to timeline management. By using UnifiedAuditLog as the source of truth and providing rich transformation capabilities, it eliminates data duplication while maintaining full audit compliance and providing excellent user experience.

This architecture is:
- **Simple**: Fewer components to maintain
- **Efficient**: Direct data access without duplication
- **Compliant**: Full audit trail for compliance
- **Scalable**: Can handle growing audit log volumes
- **User-Friendly**: Rich timeline items with visual enhancements
