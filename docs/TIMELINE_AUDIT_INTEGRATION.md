# Timeline-Audit Integration

## Overview

The timeline system has been enhanced to automatically log all timeline events to the UnifiedAuditLog system, providing comprehensive audit trails for compliance and security purposes.

## Architecture

### Dual-Layer Approach
- **Timeline Service**: Handles user-facing activity feeds and real-time updates
- **UnifiedAuditLog**: Provides comprehensive audit trails for compliance and security
- **Automatic Sync**: Timeline events are automatically logged to the audit system

### Integration Flow
```
User Action → Timeline Event → Audit Log Entry
     ↓              ↓              ↓
  UI Updates    Real-time      Compliance
  Notifications   Display        Reporting
```

## Enhanced TimelineService

### New Methods

#### `createEventWithAudit()`
Creates a timeline event and automatically logs it to the audit system.

```typescript
const timelineEvent = await TimelineService.createEventWithAudit(
  eventData,
  transferId,
  requestInfo
);
```

#### `createTransferCreatedEventWithAudit()`
Creates a transfer creation event with audit logging.

```typescript
const creationEvent = await TimelineService.createTransferCreatedEventWithAudit(
  actor,
  transferData,
  transferId,
  requestInfo
);
```

#### `createStatusChangeEventWithAudit()`
Creates a status change event with audit logging.

```typescript
const statusEvent = await TimelineService.createStatusChangeEventWithAudit(
  actor,
  oldStatus,
  newStatus,
  transferId,
  reason,
  requestInfo
);
```

## Audit Log Mapping

### Timeline Event Types → Audit Actions

| Timeline Type | Audit Action | Category | Risk Level |
|---------------|--------------|----------|------------|
| `created` | `TRANSFER_CREATED` | Transfer Management | LOW |
| `status_changed` | `TRANSFER_UPDATED` | Transfer Management | LOW |
| `assigned` | `TRANSFER_REASSIGNED` | Transfer Management | MEDIUM |
| `cancelled` | `TRANSFER_CANCELLED` | Transfer Management | HIGH |
| `rejected` | `TRANSFER_REJECTED` | Transfer Management | HIGH |
| `completed` | `TRANSFER_COMPLETED` | Transfer Management | MEDIUM |
| `admin_action` | `TRANSFER_UPDATED` | Transfer Management | HIGH |
| `document_uploaded` | `FILE_UPLOADED` | File Operation | LOW |
| `communication` | `NOTIFICATION_SENT` | Notification | LOW |

### Security Assessment

#### Risk Levels
- **LOW**: Routine operations (status updates, notes)
- **MEDIUM**: Important changes (assignments, completions)
- **HIGH**: Sensitive operations (cancellations, admin actions)

#### Security Flags
- `file_operation`: Document uploads/downloads
- `privileged_action`: Admin/manager actions
- `status_change`: Status transitions
- `data_modification`: Data updates

#### Sensitive Actions
- Transfer cancellations
- Rejections
- Admin actions
- Patient data updates

## Implementation Details

### Request Information Extraction
```typescript
const requestInfo = {
  ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
  userAgent: request.headers.get('user-agent') || 'unknown',
  method: request.method,
  endpoint: request.url
};
```

### Metadata Processing
- **Before/After States**: Captured in `changes.before` and `changes.after`
- **Changed Fields**: Automatically extracted and listed in `changes.fields`
- **Reason**: Stored in `context.reason`
- **Details**: Additional context in `context.details`

### Risk Scoring
- **Base Score**: 20 points
- **Cancellation/Rejection**: +40 points
- **Admin Actions**: +30 points
- **Patient Updates**: +25 points
- **Data Changes**: +15 points
- **Maximum**: 100 points

## Updated API Endpoints

### Timeline Creation
- **Endpoint**: `POST /api/transfers/[transferId]/timeline`
- **Enhancement**: Now automatically logs to audit system
- **Request Info**: Extracted from request headers

### Transfer Creation
- **Endpoint**: `POST /api/transfers`
- **Enhancement**: Uses `createTransferCreatedEventWithAudit()`
- **Audit Log**: Automatically created for transfer creation

## Benefits

### For Users
- **Real-time Updates**: Timeline events still provide immediate UI updates
- **Performance**: Embedded timeline arrays remain fast for queries
- **User Experience**: No changes to existing timeline functionality

### For Administrators
- **Compliance**: Complete audit trail for all transfer changes
- **Security**: Risk assessment and security flagging
- **Reporting**: Comprehensive audit logs for administrative oversight
- **Export**: Audit data can be exported for compliance reporting

### For System
- **Dual Purpose**: Timeline for UX, AuditLog for compliance
- **No Breaking Changes**: Existing timeline functionality preserved
- **Future-Proof**: Can add more audit features without affecting UI
- **Separation of Concerns**: Each system optimized for its purpose

## Testing

### Test Script
Run the integration test to verify functionality:

```bash
node scripts/test-timeline-audit-integration.js
```

### Test Coverage
- ✅ Timeline event creation
- ✅ Audit log generation
- ✅ Risk assessment
- ✅ Metadata extraction
- ✅ Security flagging
- ✅ Different event types

## Usage Examples

### Creating a Timeline Event with Audit
```typescript
const eventData = {
  type: 'status_changed',
  title: 'Status Updated',
  description: 'Transfer status changed to in_progress',
  actor: {
    id: user._id,
    name: user.name,
    email: user.email,
    userType: 'employee'
  },
  metadata: {
    oldValue: 'pending',
    newValue: 'in_progress',
    reason: 'Employee accepted transfer'
  }
};

const timelineEvent = await TimelineService.createEventWithAudit(
  eventData,
  transferId,
  requestInfo
);
```

### Querying Audit Logs
```typescript
// Get all transfer-related audit logs
const auditLogs = await UnifiedAuditLog.find({
  category: AuditCategory.TRANSFER_MANAGEMENT,
  'targetResource.id': transferId
}).sort({ timestamp: -1 });

// Get high-risk actions
const highRiskLogs = await UnifiedAuditLog.find({
  'securityContext.riskLevel': RiskLevel.HIGH
});
```

## Migration Guide

### For Existing Code
1. **Timeline Events**: Continue using existing timeline methods (backward compatible)
2. **New Features**: Use `*WithAudit` methods for new implementations
3. **API Endpoints**: Updated endpoints automatically use audit logging

### For New Implementations
1. **Use Enhanced Methods**: Always use `*WithAudit` methods
2. **Provide Request Info**: Include request information for audit context
3. **Handle Errors**: Audit logging failures don't break timeline functionality

## Monitoring

### Audit Log Queries
```typescript
// Get recent audit activity
const recentActivity = await UnifiedAuditLog.getRecentActivity(50);

// Get high-risk activities
const highRiskActivities = await UnifiedAuditLog.getHighRiskActivities(100);

// Get actions requiring review
const reviewActions = await UnifiedAuditLog.getActionsRequiringReview(100);
```

### Export Capabilities
```typescript
// Export audit logs
const exportData = await UnifiedAuditLog.find({
  category: AuditCategory.TRANSFER_MANAGEMENT,
  timestamp: { $gte: startDate, $lte: endDate }
});
```

## Conclusion

The enhanced timeline-audit integration provides:
- **Complete Audit Trails** for compliance
- **Real-time Timeline Updates** for users
- **Security Assessment** for risk management
- **Administrative Oversight** for system monitoring
- **No Breaking Changes** to existing functionality

This dual-layer approach ensures both user experience and compliance requirements are met effectively.


