# ResponseBuilder System Documentation

## Overview

The ResponseBuilder system provides a standardized way to format API responses across the entire backend. It ensures consistency, proper HTTP status codes, and structured data that clients can reliably consume.

## Core Principles

1. **Consistency**: All API endpoints return the same response structure
2. **Type Safety**: Full TypeScript support with proper typing
3. **HTTP Standards**: Proper status codes and headers
4. **Extensibility**: Easy to add new response types
5. **Client-Friendly**: Structured data that's easy to consume

## Response Structure

### Base Response Format

All API responses follow this structure:

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  timestamp: string;
  data: T;                    // The actual response data
  meta: {
    timestamp: string;
    requestId: string;
    version?: string;
    [key: string]: any;       // Additional metadata
  };
}
```

### Response Structure Breakdown

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Always `true` for successful responses |
| `timestamp` | `string` | ISO 8601 timestamp of response generation |
| `data` | `T` | The actual response payload |
| `meta` | `object` | Response metadata |
| `meta.timestamp` | `string` | ISO 8601 timestamp (same as root timestamp) |
| `meta.requestId` | `string` | Unique UUID for request tracking |
| `meta.version` | `string` | API version (optional) |
| `meta.*` | `any` | Additional custom metadata |

## ResponseBuilder Methods

### 1. Success Response

```typescript
ResponseBuilder.success<T>(
  res: Response,
  data: T,
  meta?: Partial<ResponseMeta>,
  statusCode: number = HTTP_STATUS.OK
): Response
```

**Usage:**
```typescript
// Basic success response
return ResponseBuilder.success(res, { user: userData });

// With custom metadata
return ResponseBuilder.success(res, { user: userData }, {
  version: '1.0.0',
  processingTime: 150
});

// With custom status code
return ResponseBuilder.success(res, { user: userData }, {}, 201);
```

**Response Example:**
```json
{
  "success": true,
  "timestamp": "2025-10-28T15:10:55.183Z",
  "data": {
    "user": {
      "id": "68ee13e35443e309644f9044",
      "email": "user@example.com",
      "userType": "manager"
    }
  },
  "meta": {
    "timestamp": "2025-10-28T15:10:55.183Z",
    "requestId": "d2ff194c-d562-43c7-89d7-02d3180dde75",
    "version": "1.0.0"
  }
}
```

### 2. Paginated Response

```typescript
ResponseBuilder.paginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationInfo,
  meta?: Partial<ResponseMeta>
): Response
```

**Usage:**
```typescript
const pagination = ResponseBuilder.buildPagination(page, limit, total);
return ResponseBuilder.paginated(res, users, pagination);
```

**Response Example:**
```json
{
  "success": true,
  "timestamp": "2025-10-28T15:10:55.183Z",
  "data": [
    { "id": "1", "name": "User 1" },
    { "id": "2", "name": "User 2" }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2025-10-28T15:10:55.183Z",
    "requestId": "d2ff194c-d562-43c7-89d7-02d3180dde75"
  }
}
```

### 3. Created Response (201)

```typescript
ResponseBuilder.created<T>(
  res: Response, 
  data: T, 
  meta?: Partial<ResponseMeta>
): Response
```

**Usage:**
```typescript
return ResponseBuilder.created(res, { user: newUser });
```

### 4. No Content Response (204)

```typescript
ResponseBuilder.noContent(res: Response): Response
```

**Usage:**
```typescript
return ResponseBuilder.noContent(res);
```

### 5. Custom Metadata Response

```typescript
ResponseBuilder.withMeta<T>(
  res: Response,
  data: T,
  meta: Record<string, any>,
  statusCode: number = HTTP_STATUS.OK
): Response
```

**Usage:**
```typescript
return ResponseBuilder.withMeta(res, { result: 'success' }, {
  processingTime: 150,
  cacheHit: true,
  version: '1.0.0'
});
```

### 6. Pagination Helper

```typescript
ResponseBuilder.buildPagination(
  page: number, 
  limit: number, 
  total: number
): PaginationInfo
```

**Usage:**
```typescript
const pagination = ResponseBuilder.buildPagination(1, 10, 100);
// Returns: { page: 1, limit: 10, total: 100, totalPages: 10, hasNext: true, hasPrev: false }
```

## HTTP Status Codes

The ResponseBuilder uses these standard HTTP status codes:

| Code | Constant | Description |
|------|----------|-------------|
| 200 | `HTTP_STATUS.OK` | Success (default) |
| 201 | `HTTP_STATUS.CREATED` | Resource created |
| 204 | `HTTP_STATUS.NO_CONTENT` | No content |
| 400 | `HTTP_STATUS.BAD_REQUEST` | Bad request |
| 401 | `HTTP_STATUS.UNAUTHORIZED` | Unauthorized |
| 403 | `HTTP_STATUS.FORBIDDEN` | Forbidden |
| 404 | `HTTP_STATUS.NOT_FOUND` | Not found |
| 409 | `HTTP_STATUS.CONFLICT` | Conflict |
| 422 | `HTTP_STATUS.UNPROCESSABLE_ENTITY` | Validation error |
| 429 | `HTTP_STATUS.TOO_MANY_REQUESTS` | Rate limited |
| 500 | `HTTP_STATUS.INTERNAL_SERVER_ERROR` | Server error |
| 503 | `HTTP_STATUS.SERVICE_UNAVAILABLE` | Service unavailable |

## Data Access Patterns

### Client-Side Data Access

The response structure means clients should access data like this:

```typescript
// ✅ Correct - Access data through response.data
const user = response.data.user;
const session = response.data.session;

// ❌ Incorrect - Don't access data directly
const user = response.user; // This will be undefined
```

### Response Structure Layers

```
response
├── success: boolean
├── timestamp: string
├── data: T                    ← Your actual data is here
│   ├── user: UserObject
│   ├── session: SessionObject
│   └── ...other fields
└── meta: ResponseMeta
    ├── timestamp: string
    ├── requestId: string
    └── ...custom metadata
```

## Common Usage Patterns

### 1. Authentication Endpoints

```typescript
// Login
export async function login(req: Request, res: Response): Promise<Response> {
  try {
    const result = await AuthService.login(credentials);
    return ResponseBuilder.success(res, {
      user: result.user,
      session: result.session
    });
  } catch (error) {
    // Error handling...
  }
}

// Get current user
export async function getCurrentUser(req: Request, res: Response): Promise<Response> {
  try {
    const user = await AuthService.getCurrentUser(token);
    return ResponseBuilder.success(res, { user });
  } catch (error) {
    // Error handling...
  }
}
```

### 2. CRUD Operations

```typescript
// Create
export async function createUser(req: Request, res: Response): Promise<Response> {
  try {
    const user = await UserService.create(userData);
    return ResponseBuilder.created(res, { user });
  } catch (error) {
    // Error handling...
  }
}

// Read (single)
export async function getUser(req: Request, res: Response): Promise<Response> {
  try {
    const user = await UserService.findById(id);
    return ResponseBuilder.success(res, { user });
  } catch (error) {
    // Error handling...
  }
}

// Read (list)
export async function getUsers(req: Request, res: Response): Promise<Response> {
  try {
    const { users, total } = await UserService.findMany(page, limit);
    const pagination = ResponseBuilder.buildPagination(page, limit, total);
    return ResponseBuilder.paginated(res, users, pagination);
  } catch (error) {
    // Error handling...
  }
}

// Update
export async function updateUser(req: Request, res: Response): Promise<Response> {
  try {
    const user = await UserService.update(id, userData);
    return ResponseBuilder.success(res, { user });
  } catch (error) {
    // Error handling...
  }
}

// Delete
export async function deleteUser(req: Request, res: Response): Promise<Response> {
  try {
    await UserService.delete(id);
    return ResponseBuilder.noContent(res);
  } catch (error) {
    // Error handling...
  }
}
```

### 3. Custom Metadata

```typescript
export async function getUsersWithStats(req: Request, res: Response): Promise<Response> {
  try {
    const { users, total, stats } = await UserService.findManyWithStats(page, limit);
    const pagination = ResponseBuilder.buildPagination(page, limit, total);
    
    return ResponseBuilder.paginated(res, users, pagination, {
      stats: {
        activeUsers: stats.active,
        inactiveUsers: stats.inactive,
        totalSessions: stats.sessions
      },
      processingTime: stats.processingTime
    });
  } catch (error) {
    // Error handling...
  }
}
```

## Type Safety

### TypeScript Support

```typescript
// Define your response data type
interface LoginResponse {
  user: User;
  session: Session;
}

// Use it with ResponseBuilder
export async function login(req: Request, res: Response): Promise<Response> {
  const result = await AuthService.login(credentials);
  return ResponseBuilder.success<LoginResponse>(res, {
    user: result.user,
    session: result.session
  });
}
```

### Response Type Inference

```typescript
// The response will be typed as ApiResponse<LoginResponse>
const response = await login(credentials);
const user: User = response.data.user;        // ✅ Type safe
const session: Session = response.data.session; // ✅ Type safe
```

## Error Handling

While ResponseBuilder focuses on success responses, error responses should follow a similar structure:

```typescript
// Error response structure (for reference)
interface ErrorResponse {
  success: false;
  timestamp: string;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}
```

## Best Practices

### 1. Always Use ResponseBuilder

```typescript
// ✅ Good
return ResponseBuilder.success(res, { user });

// ❌ Bad
return res.json({ user });
```

### 2. Consistent Data Structure

```typescript
// ✅ Good - Consistent structure
return ResponseBuilder.success(res, {
  user: userData,
  session: sessionData
});

// ❌ Bad - Inconsistent structure
return ResponseBuilder.success(res, userData);
```

### 3. Use Appropriate Status Codes

```typescript
// ✅ Good
return ResponseBuilder.created(res, { user });        // 201
return ResponseBuilder.success(res, { user });        // 200
return ResponseBuilder.noContent(res);                // 204

// ❌ Bad
return ResponseBuilder.success(res, { user }, {}, 201); // Use created() instead
```

### 4. Add Meaningful Metadata

```typescript
// ✅ Good - Useful metadata
return ResponseBuilder.success(res, { users }, {
  version: '1.0.0',
  processingTime: 150,
  cacheHit: true
});

// ❌ Bad - Unnecessary metadata
return ResponseBuilder.success(res, { users }, {
  randomData: 'not useful'
});
```

## Migration Guide

### From Direct Response

```typescript
// Before
return res.json({ user: userData });

// After
return ResponseBuilder.success(res, { user: userData });
```

### From Custom Response Format

```typescript
// Before
return res.json({
  status: 'success',
  payload: { user: userData },
  timestamp: new Date().toISOString()
});

// After
return ResponseBuilder.success(res, { user: userData });
```

## Testing

### Unit Testing ResponseBuilder

```typescript
import { ResponseBuilder } from '../utils/response.util';

describe('ResponseBuilder', () => {
  it('should create success response', () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    const data = { user: { id: 1, name: 'Test' } };
    ResponseBuilder.success(mockRes as any, data);
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      timestamp: expect.any(String),
      data,
      meta: {
        timestamp: expect.any(String),
        requestId: expect.any(String)
      }
    });
  });
});
```

### Integration Testing

```typescript
describe('Auth API', () => {
  it('should return proper response structure', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('meta');
    expect(response.body.data).toHaveProperty('user');
    expect(response.body.data).toHaveProperty('session');
  });
});
```

## Troubleshooting

### Common Issues

1. **Data not accessible**: Remember to use `response.data.field` not `response.field`
2. **Type errors**: Ensure you're using the correct generic type with ResponseBuilder
3. **Missing metadata**: Check if you're passing the correct meta object structure

### Debug Response Structure

```typescript
// Add this to debug response structure
console.log('Response structure:', JSON.stringify(response.body, null, 2));
console.log('Data access:', response.body.data);
console.log('Meta access:', response.body.meta);
```

## Future Enhancements

Potential future improvements to the ResponseBuilder system:

1. **Error Response Support**: Built-in error response formatting
2. **Caching Headers**: Automatic cache control headers
3. **Rate Limiting Info**: Built-in rate limit metadata
4. **Performance Metrics**: Automatic performance tracking
5. **Response Compression**: Automatic response compression
6. **Content Negotiation**: Support for different response formats

---

This documentation should be updated as the ResponseBuilder system evolves. For questions or suggestions, please refer to the development team.
