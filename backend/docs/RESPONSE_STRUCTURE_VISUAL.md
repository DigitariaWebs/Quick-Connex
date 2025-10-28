# Response Structure Visual Guide

## Response Hierarchy

```
📦 API Response
├── ✅ success: boolean
├── 🕐 timestamp: string
├── 📦 payload: T
│   ├── 👤 user: UserObject
│   ├── 🔐 session: SessionObject
│   ├── 📋 permissions: Permission[]
│   └── ... other fields
└── 📋 meta: ResponseMeta
    ├── 🕐 timestamp: string
    ├── 🆔 requestId: string
    ├── 📝 version?: string
    └── ... custom metadata
```

## Data Access Flow

```
Client Request
     ↓
ResponseBuilder.success(res, { user, session })
     ↓
Express Response
     ↓
JSON Structure
     ↓
Client Access: response.payload.user
```

## Response Layers

### Layer 1: Express Response
```typescript
res.status(200).json(responseObject)
```

### Layer 2: ResponseBuilder Wrapper
```typescript
{
  success: true,
  timestamp: "2025-10-28T15:10:55.183Z",
  payload: { ... },   // ← Your data goes here
  meta: { ... }
}
```

### Layer 3: Your Data
```typescript
{
  user: { id: "123", email: "user@example.com" },
  session: { id: "456", expiresAt: "..." }
}
```

## Client-Side Access Patterns

### ✅ Correct Access
```typescript
// Login response
const user = response.data.user;
const session = response.data.session;

// User list response
const users = response.data; // Array of users
const pagination = response.pagination;

// Single user response
const user = response.data.user;
```

### ❌ Incorrect Access
```typescript
// These will be undefined
const user = response.user;
const session = response.session;
const users = response.users;
```

## Response Types by Endpoint

### Authentication Endpoints
```typescript
// POST /api/auth/login
{
  "success": true,
  "data": {
    "user": { "id": "123", "email": "user@example.com" },
    "session": { "id": "456", "expiresAt": "..." }
  }
}

// GET /api/auth/me
{
  "success": true,
  "data": {
    "user": { "id": "123", "email": "user@example.com" }
  }
}
```

### CRUD Endpoints
```typescript
// GET /api/users (list)
{
  "success": true,
  "data": [
    { "id": "1", "name": "User 1" },
    { "id": "2", "name": "User 2" }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}

// GET /api/users/:id (single)
{
  "success": true,
  "data": {
    "user": { "id": "123", "name": "User 1" }
  }
}

// POST /api/users (create)
{
  "success": true,
  "data": {
    "user": { "id": "123", "name": "New User" }
  }
}

// DELETE /api/users/:id (delete)
// Returns 204 No Content (no body)
```

## Error Response Structure

```typescript
{
  "success": false,
  "timestamp": "2025-10-28T15:10:55.183Z",
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Email is required",
    "details": {
      "field": "email",
      "value": "",
      "constraint": "required"
    }
  },
  "meta": {
    "timestamp": "2025-10-28T15:10:55.183Z",
    "requestId": "d2ff194c-d562-43c7-89d7-02d3180dde75"
  }
}
```

## ResponseBuilder Method Mapping

| Method | Status Code | Use Case | Data Structure |
|--------|-------------|----------|----------------|
| `success()` | 200 | Default success | `{ data: T }` |
| `created()` | 201 | Resource created | `{ data: T }` |
| `noContent()` | 204 | Delete success | No body |
| `paginated()` | 200 | List with pagination | `{ data: T[], pagination: PaginationInfo }` |

## TypeScript Type Flow

```typescript
// 1. Define your data type
interface LoginData {
  user: User;
  session: Session;
}

// 2. Use with ResponseBuilder
return ResponseBuilder.success<LoginData>(res, {
  user: result.user,
  session: result.session
});

// 3. Client receives typed response
const response: ApiResponse<LoginData> = await login(credentials);
const user: User = response.data.user;        // Type safe!
const session: Session = response.data.session; // Type safe!
```

## Debugging Response Structure

### Server-Side Debugging
```typescript
// Log the response structure
console.log('Response structure:', JSON.stringify(response, null, 2));
console.log('Data access:', response.data);
console.log('Meta access:', response.meta);
```

### Client-Side Debugging
```typescript
// Log the response structure
console.log('Response structure:', JSON.stringify(response.body, null, 2));
console.log('Data access:', response.body.data);
console.log('Meta access:', response.body.meta);
```

## Common Response Patterns

### Pattern 1: Single Resource
```typescript
// Server
return ResponseBuilder.success(res, { user: userData });

// Client
const user = response.data.user;
```

### Pattern 2: Multiple Resources
```typescript
// Server
return ResponseBuilder.success(res, { 
  user: userData, 
  session: sessionData 
});

// Client
const user = response.data.user;
const session = response.data.session;
```

### Pattern 3: List with Pagination
```typescript
// Server
const pagination = ResponseBuilder.buildPagination(page, limit, total);
return ResponseBuilder.paginated(res, users, pagination);

// Client
const users = response.data; // Array
const pagination = response.pagination;
```

### Pattern 4: Custom Metadata
```typescript
// Server
return ResponseBuilder.success(res, { users }, {
  version: '1.0.0',
  processingTime: 150,
  cacheHit: true
});

// Client
const users = response.data;
const version = response.meta.version;
const processingTime = response.meta.processingTime;
```

This visual guide should help developers quickly understand how the ResponseBuilder system works and how to properly access response data on both server and client sides.
