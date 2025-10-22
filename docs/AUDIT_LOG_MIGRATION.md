# Audit Log System Migration Guide

## Overview

The audit logging system has been consolidated from two separate models (`AuditLog.ts` and `AdminAuditLog.ts`) into a single, comprehensive `UnifiedAuditLog.ts` model.

## What Changed

### Before (Two Separate Models)
- **AuditLog.ts**: Complex model with 64 action types, 2-year retention
- **AdminAuditLog.ts**: Simple model with 9 action types, 1-year retention
- **Issues**: Redundancy, confusion, inconsistent data structure

### After (Unified Model)
- **UnifiedAuditLog.ts**: Single comprehensive model
- **Benefits**: Consistent data structure, better performance, easier maintenance

## New Model Features

### 1. Comprehensive Actor Types
```typescript
enum ActorType {
  ADMIN = 'admin',
  USER = 'user', 
  SYSTEM = 'system',
  API = 'api',
  BATCH = 'batch'
}
```

### 2. Enhanced Action Categories
```typescript
enum AuditCategory {
  USER_MANAGEMENT = 'user_management',
  TRANSFER_MANAGEMENT = 'transfer_management',
  AUTHENTICATION = 'authentication',
  SECURITY = 'security',
  DATA_ACCESS = 'data_access',
  SYSTEM_CONFIGURATION = 'system_configuration',
  NOTIFICATION = 'notification',
  FILE_OPERATION = 'file_operation',
  API_ACCESS = 'api_access'
}
```

### 3. Comprehensive Action Types
- **User Management**: 9 actions (created, updated, deleted, etc.)
- **Transfer Management**: 9 actions (created, approved, rejected, etc.)
- **Authentication**: 8 actions (login, logout, password changes, etc.)
- **Data Access**: 5 actions (viewed, exported, imported, etc.)
- **System Operations**: 5 actions (settings, maintenance, backups, etc.)
- **Notifications**: 2 actions (sent, broadcast)
- **File Operations**: 3 actions (uploaded, downloaded, deleted)
- **API Access**: 3 actions (accessed, rate limited, error)

### 4. Enhanced Security Context
```typescript
securityContext: {
  riskLevel: RiskLevel; // low, medium, high, critical
  isSensitive: boolean;
  requiresReview: boolean;
  securityFlags?: string[];
  riskScore?: number; // 0-100
  complianceFlags?: string[];
}
```

### 5. Rich Change Tracking
```typescript
changes?: {
  before?: any; // State before the change
  after?: any; // State after the change
  fields?: string[]; // List of changed fields
  changeSummary?: string; // Human-readable summary
}
```

### 6. Comprehensive Request Information
```typescript
requestInfo: {
  ipAddress: string;
  userAgent: string;
  method?: string; // HTTP method
  endpoint?: string; // API endpoint
  requestId?: string; // For correlation
  sessionId?: string; // Session identifier
  deviceFingerprint?: string; // Device identification
}
```

## API Changes

### Updated Endpoints

#### 1. `/api/admin/audit/logs`
**New Query Parameters:**
- `category`: Filter by audit category
- `actorType`: Filter by actor type (admin, user, system, etc.)
- `riskLevel`: Filter by risk level (low, medium, high, critical)
- `actorId`: Filter by specific actor
- `isSensitive`: Filter sensitive operations
- `requiresReview`: Filter operations requiring review
- `outcome`: Filter by outcome (success, failure, partial)

**Example:**
```
GET /api/admin/audit/logs?category=user_management&riskLevel=high&isSensitive=true&page=1&limit=50
```

#### 2. `/api/admin/users/activity-logs`
**Enhanced Filtering:**
- `userId`: Filter by user ID (actor or target)
- `category`: Filter by audit category
- `outcome`: Filter by outcome
- Date range filtering with `startDate` and `endDate`

#### 3. `/api/admin/audit/export`
**New Export Formats:**
- CSV export with comprehensive fields
- JSON export for programmatic access
- Filtering support for targeted exports

**Example Request:**
```json
{
  "format": "csv",
  "category": "user_management",
  "riskLevel": "high",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

## Migration Steps

### 1. Update Imports
Replace old imports:
```typescript
// OLD
import AuditLog from '@/models/AuditLog';
import AdminAuditLog from '@/models/AdminAuditLog';

// NEW
import UnifiedAuditLog, { 
  AuditAction, 
  AuditCategory, 
  ActorType, 
  RiskLevel 
} from '@/models/UnifiedAuditLog';
```

### 2. Update Audit Logging Calls
Replace old logging calls:
```typescript
// OLD
await AdminAuditLog.logAdminAction(
  adminId,
  adminEmail,
  action,
  targetUserId,
  targetUserEmail,
  details,
  ipAddress,
  userAgent,
  sessionId,
  riskLevel,
  success,
  errorMessage
);

// NEW
await UnifiedAuditLog.logAction({
  actorId: adminId,
  actorType: ActorType.ADMIN,
  actorEmail: adminEmail,
  action: AuditAction.USER_UPDATED,
  category: AuditCategory.USER_MANAGEMENT,
  description: 'User account updated',
  targetResource: {
    type: TargetResourceType.USER,
    id: targetUserId,
    name: targetUserEmail
  },
  requestInfo: {
    ipAddress,
    userAgent,
    sessionId
  },
  securityContext: {
    riskLevel: RiskLevel.MEDIUM,
    isSensitive: true,
    requiresReview: false
  },
  outcome: success ? 'success' : 'failure',
  errorMessage
});
```

### 3. Update Query Methods
Replace old query methods:
```typescript
// OLD
const logs = await AuditLog.getRecentActivity(50, adminId);
const adminLogs = await AdminAuditLog.getAdminAuditLogs(adminId, 50, 0);

// NEW
const logs = await UnifiedAuditLog.getRecentActivity(50, adminId);
const adminLogs = await UnifiedAuditLog.getAdminActivity(adminId, 50);
```

## Data Migration

### 1. Backup Existing Data
```bash
# Backup existing audit collections
mongodump --db your_database --collection auditlogs --out backup/
mongodump --db your_database --collection adminauditlogs --out backup/
```

### 2. Migrate Data Structure
Create a migration script to transform old data:

```typescript
// Migration script example
async function migrateAuditLogs() {
  const oldAuditLogs = await AuditLog.find({});
  const oldAdminLogs = await AdminAuditLog.find({});
  
  // Transform and insert into new model
  for (const log of oldAuditLogs) {
    await UnifiedAuditLog.logAction({
      actorId: log.adminId.toString(),
      actorType: ActorType.ADMIN,
      actorEmail: log.adminEmail,
      actorName: log.adminName,
      actorRole: log.adminRole,
      action: log.action as AuditAction,
      category: log.category as AuditCategory,
      description: log.description,
      targetResource: log.targetResource,
      changes: log.changes,
      context: log.metadata,
      requestInfo: log.requestInfo,
      securityContext: {
        riskLevel: log.isSensitive ? RiskLevel.HIGH : RiskLevel.LOW,
        isSensitive: log.isSensitive,
        requiresReview: log.requiresReview
      },
      outcome: log.outcome,
      errorMessage: log.errorMessage,
      timestamp: log.timestamp,
      duration: log.duration
    });
  }
  
  // Similar transformation for AdminAuditLog...
}
```

## Benefits of the New System

### 1. **Unified Data Structure**
- Single source of truth for all audit data
- Consistent schema across all operations
- Better data integrity

### 2. **Enhanced Security**
- Risk level assessment (low, medium, high, critical)
- Security flags and compliance tracking
- Sensitive operation flagging

### 3. **Better Performance**
- Optimized indexes for common queries
- Single collection reduces joins
- Efficient pagination and filtering

### 4. **Improved Maintainability**
- Single model to maintain
- Consistent API patterns
- Better error handling

### 5. **Enhanced Reporting**
- Rich filtering capabilities
- Multiple export formats
- Better analytics and insights

## Testing the Migration

### 1. Test Audit Logging
```typescript
// Test basic logging
const log = await UnifiedAuditLog.logAction({
  actorId: 'admin123',
  actorType: ActorType.ADMIN,
  actorEmail: 'admin@example.com',
  action: AuditAction.USER_CREATED,
  category: AuditCategory.USER_MANAGEMENT,
  description: 'User account created',
  requestInfo: {
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0...'
  },
  securityContext: {
    riskLevel: RiskLevel.LOW,
    isSensitive: false,
    requiresReview: false
  },
  outcome: 'success'
});
```

### 2. Test API Endpoints
```bash
# Test audit logs endpoint
curl "http://localhost:3000/api/admin/audit/logs?category=user_management&limit=10"

# Test export endpoint
curl -X POST "http://localhost:3000/api/admin/audit/export" \
  -H "Content-Type: application/json" \
  -d '{"format": "csv", "category": "user_management"}'
```

### 3. Test Filtering and Pagination
```typescript
// Test various filters
const highRiskLogs = await UnifiedAuditLog.getHighRiskActivities(100);
const sensitiveLogs = await UnifiedAuditLog.getSensitiveActions(100);
const reviewLogs = await UnifiedAuditLog.getActionsRequiringReview();
```

## Rollback Plan

If issues arise, you can rollback by:

1. **Restore old models** from backup
2. **Revert API endpoints** to use old models
3. **Update imports** back to old models
4. **Restore data** from backup collections

## Conclusion

The unified audit log system provides:
- **Better data consistency**
- **Enhanced security features**
- **Improved performance**
- **Easier maintenance**
- **Rich reporting capabilities**

The migration is designed to be backward-compatible where possible, with clear migration paths for existing data and code.



