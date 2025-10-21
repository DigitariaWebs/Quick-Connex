# Admin API Access Control Fix

## Problem Identified

The error "Access denied. Required roles: manager, super_admin" was occurring because all admin API routes were incorrectly using `requireManager()` instead of `requireAdmin()` for authentication.

## Root Cause

The admin API routes were using the wrong authentication function:
- **Incorrect**: `requireManager()` - allows `manager` and `super_admin` users
- **Correct**: `requireAdmin()` - allows only `admin` and `super_admin` users

## Files Fixed

Fixed **14 admin API routes** that were incorrectly using `requireManager()`:

### Core Admin APIs
- `src/app/api/admin/users/route.ts` - User management
- `src/app/api/admin/users/stats/route.ts` - User statistics
- `src/app/api/admin/transfers/route.ts` - Transfer management
- `src/app/api/admin/transfers/[id]/route.ts` - Individual transfer operations
- `src/app/api/admin/transfers/[id]/actions/route.ts` - Transfer actions
- `src/app/api/admin/transfers/analytics/route.ts` - Transfer analytics

### Monitoring APIs
- `src/app/api/admin/monitoring/test-sse/route.ts` - SSE testing
- `src/app/api/admin/monitoring/sse/route.ts` - SSE monitoring
- `src/app/api/admin/monitoring/sse-stats/route.ts` - SSE statistics
- `src/app/api/admin/monitoring/api/route.ts` - API monitoring
- `src/app/api/admin/monitoring/clear-sse/route.ts` - SSE cleanup
- `src/app/api/admin/monitoring/system-health/route.ts` - System health
- `src/app/api/admin/monitoring/errors/route.ts` - Error monitoring
- `src/app/api/admin/monitoring/database/route.ts` - Database monitoring
- `src/app/api/admin/monitoring/system/route.ts` - System monitoring

## Changes Made

### 1. Import Statement Fix
```typescript
// Before (incorrect)
import { requireManager, handleAuthError, createSuccessResponse } from '@/lib/auth/auth-utils';

// After (correct)
import { requireAdmin, handleAuthError, createSuccessResponse } from '@/lib/auth/auth-utils';
```

### 2. Function Call Fix
```typescript
// Before (incorrect)
const { user } = await requireManager();

// After (correct)
const { user } = await requireAdmin();
```

## Access Control Matrix

| User Type | Admin Pages | Admin APIs | Transfer Creation | Transfer Approval |
|-----------|-------------|------------|-------------------|-------------------|
| **Employee** | ❌ | ❌ | ❌ | ❌ |
| **Manager** | ❌ | ❌ | ✅ | ❌ |
| **Admin** | ✅ | ✅ | ✅ | ✅ |
| **Super Admin** | ✅ | ✅ | ✅ | ✅ |

## Testing Results

✅ **Employee users** - Properly denied access to admin APIs
✅ **Manager users** - Properly denied access to admin APIs  
✅ **Admin users** - Successfully granted access to admin APIs
✅ **Super Admin users** - Successfully granted access to admin APIs

## Scripts Created

- `scripts/fix-admin-api-routes.js` - Automated fix for all admin API routes
- `scripts/test-admin-access.js` - Test script to verify access control

## Verification

The fix has been tested and verified:
- All admin API routes now use `requireAdmin()` instead of `requireManager()`
- Admin and Super Admin users can access admin pages and APIs
- Manager and Employee users are properly denied access to admin APIs
- No linting errors introduced

The admin access control is now properly configured with the correct authentication requirements.
