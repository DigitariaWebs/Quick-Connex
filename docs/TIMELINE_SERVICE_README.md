# Timeline Service Documentation

## Overview

The Timeline Service provides a clean, simple approach to displaying chronological activity data by reading and formatting UnifiedAuditLog entries into timeline-friendly DTOs for UI display.

## Architecture

```
UnifiedAuditLog (Source of Truth)
    ↓
Timeline Service (Read Model)
    ↓
Timeline DTO (UI Format)
    ↓
Frontend Timeline Component
```

## Key Features

- **Single Source of Truth**: Uses UnifiedAuditLog as the only data store
- **No Data Duplication**: Timeline data is derived, not stored
- **Rich Filtering**: Filter by actor, event type, date range, sensitivity
- **Pagination Support**: Efficient pagination for large timelines
- **Real-time Ready**: Optimized for live updates
- **Type Safe**: Full TypeScript support with comprehensive interfaces

## Components

### 1. Timeline Types (`src/types/timeline.ts`)

#### TimelineItem Interface
```typescript
interface TimelineItem {
  timelineItemId: string;        // UnifiedAuditLog._id
  transferId: string;           // targetResource.id
  kind: string;                 // derived from action
  title: string;                // human-readable title
  description: string;          // detailed description
  timestamp: Date;              // when it happened
  order: number;                // sequence for stable sorting
  actor: {                      // who performed the action
    id: string;
    type: ActorType;
    name: string;
    email: string;
    role: string;
  };
  diff?: {                     // change information
    before: any;
    after: any;
    fields: string[];
    summary: string;
  };
  statusAfter?: string;         // new status after this event
  assignedToAfter?: string;     // new assignee after this event
  attachments?: any[];         // document attachments
  badges: string[];            // visual tags
  tags: string[];              // filterable tags
  isSensitive: boolean;        // requires special handling
  requiresReview: boolean;     // needs admin review
}
```

#### Event Kind Mapping
- **Transfer Events**: `transfer_created`, `transfer_approved`, `transfer_rejected`, etc.
- **Document Events**: `document_added`, `document_downloaded`, `document_deleted`
- **User Events**: `user_login`, `user_logout`, `user_updated`
- **System Events**: `system_maintenance`, `notification_sent`

### 2. Timeline Service (`src/lib/timeline/TimelineService.ts`)

#### Core Methods

##### `getTransferTimeline(transferId, options)`
Get timeline for a specific transfer with filtering and pagination.

**Parameters:**
- `transferId`: The transfer ID to get timeline for
- `options`: Query options including page, limit, and filters

**Filters:**
- `actorId`: Filter by specific actor
- `kind`: Filter by event kind
- `startDate/endDate`: Date range filtering
- `isSensitive`: Filter sensitive operations
- `requiresReview`: Filter operations requiring review

**Returns:**
```typescript
{
  items: TimelineItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

##### `getRecentActivity(options)`
Get recent activity across all transfers.

**Parameters:**
- `options`: Query options including limit and filters

**Returns:**
```typescript
TimelineItem[]
```

##### `getTimelineStats(transferId)`
Get timeline statistics for a transfer.

**Returns:**
```typescript
{
  totalEvents: number;
  statusChanges: number;
  documentUploads: number;
  lastActivity: Date;
  actors: {
    id: string;
    name: string;
    eventCount: number;
  }[];
}
```

### 3. Timeline Utils (`src/lib/timeline/TimelineUtils.ts`)

#### Utility Functions

##### Content Generation
- `generateEventTitle(action, actorName, targetName)`: Generate human-readable titles
- `generateEventDescription(action, actorName, targetName, changes)`: Generate descriptions
- `getEventKind(action)`: Get event kind from audit action
- `getEventBadges(kind)`: Get badges for event kind
- `getEventTags(kind)`: Get tags for event kind

##### Formatting
- `formatTimestamp(timestamp)`: Format timestamp for display ("2 hours ago")
- `getActorDisplayName(actor)`: Get display name for actor
- `getActorIcon(actorType)`: Get icon for actor type
- `getEventIcon(kind)`: Get icon for event kind
- `getRiskLevelColor(riskLevel)`: Get color for risk level

##### Filtering and Sorting
- `filterTimelineItems(items, searchQuery)`: Filter items by search query
- `groupTimelineItemsByDate(items)`: Group items by date
- `sortTimelineItems(items, ascending)`: Sort items by timestamp

### 4. API Endpoints

#### `GET /api/timeline/transfer/[transferId]`
Get timeline for a specific transfer.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)
- `actorId`: Filter by actor ID
- `kind`: Filter by event kind
- `startDate`: Start date filter (ISO string)
- `endDate`: End date filter (ISO string)
- `isSensitive`: Filter sensitive operations (true/false)
- `requiresReview`: Filter operations requiring review (true/false)

**Example:**
```
GET /api/timeline/transfer/transfer-123?page=1&limit=20&kind=transfer_approved&startDate=2024-01-01
```

#### `GET /api/timeline/transfer/[transferId]/stats`
Get timeline statistics for a transfer.

**Example:**
```
GET /api/timeline/transfer/transfer-123/stats
```

#### `GET /api/timeline/recent`
Get recent activity across all transfers.

**Query Parameters:**
- `limit`: Number of items (default: 50, max: 100)
- `actorId`: Filter by actor ID
- `category`: Filter by audit category
- `isSensitive`: Filter sensitive operations (true/false)

**Example:**
```
GET /api/timeline/recent?limit=10&category=transfer_management
```

## Usage Examples

### 1. Get Transfer Timeline
```typescript
import { TimelineService } from '@/lib/timeline/TimelineService';

// Get timeline for a transfer
const timeline = await TimelineService.getTransferTimeline('transfer-123', {
  page: 1,
  limit: 20,
  filters: {
    kind: 'transfer_approved',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31')
  }
});

console.log(`Found ${timeline.items.length} events`);
console.log(`Total: ${timeline.pagination.total}`);
```

### 2. Get Recent Activity
```typescript
// Get recent activity
const activity = await TimelineService.getRecentActivity({
  limit: 10,
  filters: {
    category: 'transfer_management' as any
  }
});

activity.forEach(item => {
  console.log(`${item.timestamp}: ${item.title}`);
});
```

### 3. Get Timeline Statistics
```typescript
// Get timeline stats
const stats = await TimelineService.getTimelineStats('transfer-123');

console.log(`Total events: ${stats.totalEvents}`);
console.log(`Status changes: ${stats.statusChanges}`);
console.log(`Document uploads: ${stats.documentUploads}`);
```

### 4. Use Utility Functions
```typescript
import { TimelineUtils } from '@/lib/timeline/TimelineUtils';

// Generate event title
const title = TimelineUtils.generateEventTitle(
  AuditAction.TRANSFER_CREATED,
  'John Doe',
  'Patient X'
);
// Result: "Transfer created by John Doe"

// Format timestamp
const formatted = TimelineUtils.formatTimestamp(new Date());
// Result: "2 hours ago"

// Get event icon
const icon = TimelineUtils.getEventIcon('transfer_created');
// Result: "📝"

// Filter timeline items
const filtered = TimelineUtils.filterTimelineItems(items, 'transfer');
```

## Event Types and Mapping

### Transfer Events
- `transfer_created`: Transfer request created
- `transfer_approved`: Transfer approved by manager
- `transfer_rejected`: Transfer rejected by manager
- `transfer_completed`: Transfer completed successfully
- `transfer_cancelled`: Transfer cancelled
- `transfer_reassigned`: Transfer reassigned to different manager

### Document Events
- `document_added`: Document uploaded
- `document_downloaded`: Document downloaded
- `document_deleted`: Document deleted

### User Events
- `user_login`: User logged in
- `user_logout`: User logged out
- `user_updated`: User profile updated

### System Events
- `system_maintenance`: System maintenance performed
- `notification_sent`: Notification sent
- `api_error`: API error occurred

## Badge and Tag System

### Badges (Visual Tags)
- `new`: New items
- `transfer`: Transfer-related
- `approved`: Approved status
- `rejected`: Rejected status
- `document`: Document-related
- `upload`: Upload action
- `download`: Download action
- `security`: Security-related
- `alert`: Alert/notification

### Tags (Filterable)
- `transfer`: Transfer operations
- `creation`: Creation events
- `approval`: Approval events
- `rejection`: Rejection events
- `status`: Status changes
- `document`: Document operations
- `file`: File operations
- `authentication`: Login/logout
- `security`: Security events
- `communication`: Notifications
- `system`: System operations
- `error`: Error events

## Performance Considerations

### Database Indexes
The service relies on these indexes in UnifiedAuditLog:
- `{'targetResource.type': 1, 'targetResource.id': 1, timestamp: -1}`
- `{actorId: 1, timestamp: -1}`
- `{category: 1, timestamp: -1}`
- `{'securityContext.riskLevel': 1, timestamp: -1}`

### Caching Strategy
- Optional Redis caching for hot transfers
- Cache keys: `timeline:${transferId}:${page}`
- TTL: 15 minutes
- Invalidate on new events

### Query Optimization
- Efficient pagination with skip/limit
- Compound indexes for common queries
- Lean queries to reduce memory usage
- Proper sorting for consistent ordering

## Error Handling

The service includes comprehensive error handling:
- Database connection errors
- Invalid query parameters
- Missing data scenarios
- Type safety with TypeScript

## Testing

Run the test suite:
```typescript
import { testTimelineService, testTimelineServiceWithMockData } from '@/lib/timeline/TimelineService.test';

// Test with real data
await testTimelineService();

// Test with mock data
await testTimelineServiceWithMockData();
```

## Future Enhancements

### Potential Improvements
1. **Real-time Updates**: SSE integration for live timeline updates
2. **Advanced Filtering**: More sophisticated filter combinations
3. **Timeline Aggregation**: Group related events together
4. **Export Functionality**: Export timeline data to CSV/PDF
5. **Timeline Analytics**: Advanced analytics and insights
6. **Custom Views**: User-defined timeline views
7. **Timeline Search**: Full-text search across timeline data

### Performance Optimizations
1. **Read Replicas**: Use read replicas for timeline queries
2. **Materialized Views**: Pre-computed timeline aggregations
3. **CDN Caching**: Cache static timeline data
4. **Database Sharding**: Shard by transfer ID for large datasets

## Conclusion

The Timeline Service provides a clean, efficient way to display chronological activity data without adding storage complexity. It leverages the existing UnifiedAuditLog as the single source of truth while providing rich formatting and filtering capabilities for the UI.

The service is designed to be:
- **Simple**: Easy to understand and maintain
- **Efficient**: Optimized queries and minimal overhead
- **Flexible**: Rich filtering and formatting options
- **Scalable**: Ready for high-volume usage
- **Type Safe**: Full TypeScript support

