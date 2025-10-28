# ResponseBuilder Quick Reference

## Quick Start

```typescript
import { ResponseBuilder } from '../utils/response.util';

// Basic success response
return ResponseBuilder.success(res, { user: userData });

// With metadata
return ResponseBuilder.success(res, { user: userData }, {
  version: '1.0.0',
  processingTime: 150
});

// Created response (201)
return ResponseBuilder.created(res, { user: newUser });

// No content (204)
return ResponseBuilder.noContent(res);

// Paginated response
const pagination = ResponseBuilder.buildPagination(page, limit, total);
return ResponseBuilder.paginated(res, users, pagination);
```

## Response Structure

```json
{
  "success": true,
  "timestamp": "2025-10-28T15:10:55.183Z",
  "payload": {
    "user": { "id": "123", "email": "user@example.com" },
    "session": { "id": "456", "expiresAt": "2025-10-29T15:10:55.183Z" }
  },
  "meta": {
    "timestamp": "2025-10-28T15:10:55.183Z",
    "requestId": "d2ff194c-d562-43c7-89d7-02d3180dde75"
  }
}
```

## Data Access

```typescript
// ✅ Correct
const user = response.payload.user;
const session = response.payload.session;

// ❌ Wrong
const user = response.user; // undefined
```

## Common Patterns

### Authentication
```typescript
// Login
return ResponseBuilder.success(res, {
  user: result.user,
  session: result.session
});

// Get current user
return ResponseBuilder.success(res, { user });
```

### CRUD Operations
```typescript
// Create
return ResponseBuilder.created(res, { user: newUser });

// Read single
return ResponseBuilder.success(res, { user });

// Read list
const pagination = ResponseBuilder.buildPagination(page, limit, total);
return ResponseBuilder.paginated(res, users, pagination);

// Update
return ResponseBuilder.success(res, { user: updatedUser });

// Delete
return ResponseBuilder.noContent(res);
```

## HTTP Status Codes

| Method | Status | Use Case |
|--------|--------|----------|
| `success()` | 200 | Default success |
| `created()` | 201 | Resource created |
| `noContent()` | 204 | Delete success |
| `paginated()` | 200 | List with pagination |

## TypeScript Support

```typescript
interface LoginResponse {
  user: User;
  session: Session;
}

return ResponseBuilder.success<LoginResponse>(res, {
  user: result.user,
  session: result.session
});
```

## Error Responses

```typescript
// Error response structure (for reference)
{
  "success": false,
  "timestamp": "2025-10-28T15:10:55.183Z",
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Email is required",
    "details": { "field": "email" }
  },
  "meta": {
    "timestamp": "2025-10-28T15:10:55.183Z",
    "requestId": "d2ff194c-d562-43c7-89d7-02d3180dde75"
  }
}
```

## Best Practices

1. **Always use ResponseBuilder** - Never use `res.json()` directly
2. **Consistent data structure** - Always wrap data in objects
3. **Use appropriate methods** - `created()` for 201, `noContent()` for 204
4. **Add meaningful metadata** - Processing time, version, etc.
5. **Type your responses** - Use TypeScript generics for type safety

## Common Mistakes

❌ **Wrong data access:**
```typescript
const user = response.user; // undefined
```

✅ **Correct data access:**
```typescript
const user = response.data.user; // correct
```

❌ **Direct response:**
```typescript
return res.json({ user }); // inconsistent
```

✅ **Use ResponseBuilder:**
```typescript
return ResponseBuilder.success(res, { user }); // consistent
```

❌ **Wrong status code:**
```typescript
return ResponseBuilder.success(res, { user }, {}, 201); // use created()
```

✅ **Use appropriate method:**
```typescript
return ResponseBuilder.created(res, { user }); // correct
```
