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
  payload: T;                 // The actual response data
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
| `payload` | `T` | The actual response payload |
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
  payload: T,
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
  "payload": {
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
  payload: T[],
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
  "payload": [
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
  payload: T, 
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
  payload: T,
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
// ✅ Correct - Access data through response.payload
const user = response.payload.user;
const session = response.payload.session;

// ❌ Incorrect - Don't access data directly
const user = response.user; // This will be undefined
```

### Response Structure Layers

```
response
├── success: boolean
├── timestamp: string
├── payload: T                 ← Your actual data is here
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

ResponseBuilder now includes comprehensive error response methods that follow the same structure as success responses:

### Error Response Methods

```typescript
// Generic error response
ResponseBuilder.error(res, 'ERROR_CODE', 'Error message', details?, statusCode?, meta?)

// Specific error methods
ResponseBuilder.badRequest(res, 'Bad request message', details?, meta?)
ResponseBuilder.unauthorized(res, 'Unauthorized message', details?, meta?)
ResponseBuilder.forbidden(res, 'Forbidden message', details?, meta?)
ResponseBuilder.notFound(res, 'Not found message', details?, meta?)
ResponseBuilder.conflict(res, 'Conflict message', details?, meta?)
ResponseBuilder.validationError(res, 'Validation failed', errors, meta?)
ResponseBuilder.rateLimited(res, 'Too many requests', retryAfter?, meta?)
ResponseBuilder.serverError(res, 'Server error message', details?, meta?)
ResponseBuilder.serviceUnavailable(res, 'Service unavailable', details?, meta?)
```

### Error Response Structure

All error responses follow this consistent structure:

```typescript
interface ErrorResponse {
  success: false;
  timestamp: string;
  error: {
    code: string;
    message: string;
    details?: any;
    retryable?: boolean;
    retryAfter?: number;
  };
  meta: {
    timestamp: string;
    requestId: string;
    [key: string]: any;
  };
}
```

### Error Handling Examples

#### Authentication Errors

```typescript
// Login endpoint
export async function login(req: Request, res: Response): Promise<Response> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return ResponseBuilder.badRequest(res, 'Email and password are required');
    }

    const loginResult = await AuthService.login({ email, password }, req);
    return ResponseBuilder.success(res, {
      user: loginResult.user,
      session: loginResult.session
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        return ResponseBuilder.rateLimited(res, error.message);
      }
      if (error.message.includes('locked')) {
        return ResponseBuilder.error(res, 'ACCOUNT_LOCKED', error.message, undefined, 423);
      }
      if (error.message.includes('Invalid credentials')) {
        return ResponseBuilder.unauthorized(res, 'Invalid credentials');
      }
    }

    return ResponseBuilder.serverError(res, 'Login failed');
  }
}
```

#### Validation Errors

```typescript
// User registration endpoint
export async function signup(req: Request, res: Response): Promise<Response> {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate input
    const validationErrors: ValidationErrorDetail[] = [];
    
    if (!email || !isValidEmail(email)) {
      validationErrors.push({
        field: 'email',
        message: 'Valid email is required',
        code: 'INVALID_EMAIL'
      });
    }

    if (!password || password.length < 8) {
      validationErrors.push({
        field: 'password',
        message: 'Password must be at least 8 characters',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    if (validationErrors.length > 0) {
      return ResponseBuilder.validationError(res, 'Validation failed', validationErrors);
    }

    const user = await UserService.create({ email, password, firstName, lastName });
    return ResponseBuilder.created(res, { user });

  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return ResponseBuilder.conflict(res, 'Email already exists');
    }
    
    return ResponseBuilder.serverError(res, 'Registration failed');
  }
}
```

#### Resource Not Found

```typescript
// Get user by ID endpoint
export async function getUser(req: Request, res: Response): Promise<Response> {
  try {
    const { id } = req.params;
    const user = await UserService.findById(id);

    if (!user) {
      return ResponseBuilder.notFound(res, 'User not found');
    }

    return ResponseBuilder.success(res, { user });

  } catch (error) {
    return ResponseBuilder.serverError(res, 'Failed to fetch user');
  }
}
```

### Error Response Examples

#### Bad Request (400)
```json
{
  "success": false,
  "timestamp": "2025-10-28T15:10:55.183Z",
  "error": {
    "code": "BAD_REQUEST",
    "message": "Email and password are required"
  },
  "meta": {
    "timestamp": "2025-10-28T15:10:55.183Z",
    "requestId": "d2ff194c-d562-43c7-89d7-02d3180dde75"
  }
}
```

#### Validation Error (422)
```json
{
  "success": false,
  "timestamp": "2025-10-28T15:10:55.183Z",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Valid email is required",
        "code": "INVALID_EMAIL"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters",
        "code": "PASSWORD_TOO_SHORT"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-10-28T15:10:55.183Z",
    "requestId": "d2ff194c-d562-43c7-89d7-02d3180dde75"
  }
}
```

#### Rate Limited (429)
```json
{
  "success": false,
  "timestamp": "2025-10-28T15:10:55.183Z",
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "details": {
      "retryAfter": 60
    }
  },
  "meta": {
    "timestamp": "2025-10-28T15:10:55.183Z",
    "requestId": "d2ff194c-d562-43c7-89d7-02d3180dde75"
  }
}
```

### Best Practices for Error Handling

#### 1. Use Appropriate Error Methods

```typescript
// ✅ Good - Use specific error methods
return ResponseBuilder.unauthorized(res, 'Invalid credentials');
return ResponseBuilder.notFound(res, 'User not found');
return ResponseBuilder.validationError(res, 'Validation failed', errors);

// ❌ Bad - Don't use success for errors
return ResponseBuilder.success(res, { error: 'Invalid credentials' }, { errorCode: 'UNAUTHORIZED' }, 401);
```

#### 2. Provide Meaningful Error Messages

```typescript
// ✅ Good - Clear, actionable messages
return ResponseBuilder.badRequest(res, 'Email and password are required');
return ResponseBuilder.unauthorized(res, 'Invalid or expired token');

// ❌ Bad - Vague messages
return ResponseBuilder.badRequest(res, 'Error');
return ResponseBuilder.unauthorized(res, 'Unauthorized');
```

#### 3. Include Relevant Details

```typescript
// ✅ Good - Include helpful details
return ResponseBuilder.validationError(res, 'Validation failed', [
  { field: 'email', message: 'Valid email is required', code: 'INVALID_EMAIL' }
]);

// ✅ Good - Include retry information
return ResponseBuilder.rateLimited(res, 'Too many requests', 60);
```

#### 4. Handle Different Error Types Appropriately

```typescript
export async function handleRequest(req: Request, res: Response): Promise<Response> {
  try {
    // Business logic here
    return ResponseBuilder.success(res, { data: result });
    
  } catch (error) {
    // Handle specific error types
    if (error instanceof ValidationError) {
      return ResponseBuilder.validationError(res, error.message, error.details);
    }
    
    if (error instanceof UnauthorizedError) {
      return ResponseBuilder.unauthorized(res, error.message);
    }
    
    if (error instanceof NotFoundError) {
      return ResponseBuilder.notFound(res, error.message);
    }
    
    if (error instanceof ConflictError) {
      return ResponseBuilder.conflict(res, error.message, error.details);
    }
    
    // Log unexpected errors
    log.error('Unexpected error', error);
    return ResponseBuilder.serverError(res, 'An unexpected error occurred');
  }
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
// ✅ Good - Use specific methods for status codes
return ResponseBuilder.created(res, { user });        // 201
return ResponseBuilder.success(res, { user });        // 200
return ResponseBuilder.noContent(res);                // 204

// ✅ Good - Use error methods for error status codes
return ResponseBuilder.badRequest(res, 'Invalid input');           // 400
return ResponseBuilder.unauthorized(res, 'Invalid token');         // 401
return ResponseBuilder.notFound(res, 'Resource not found');        // 404
return ResponseBuilder.serverError(res, 'Internal error');         // 500

// ❌ Bad - Don't use success for error status codes
return ResponseBuilder.success(res, { user }, {}, 201); // Use created() instead
return ResponseBuilder.success(res, { error: 'Bad request' }, {}, 400); // Use badRequest() instead
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

### 5. Proper Error Handling

```typescript
// ✅ Good - Use specific error methods
return ResponseBuilder.unauthorized(res, 'Invalid credentials');
return ResponseBuilder.validationError(res, 'Validation failed', errors);
return ResponseBuilder.rateLimited(res, 'Too many requests', 60);

// ❌ Bad - Don't use success for errors
return ResponseBuilder.success(res, { error: 'Invalid credentials' }, { errorCode: 'UNAUTHORIZED' }, 401);

// ✅ Good - Handle different error types appropriately
if (error instanceof ValidationError) {
  return ResponseBuilder.validationError(res, error.message, error.details);
}
if (error instanceof UnauthorizedError) {
  return ResponseBuilder.unauthorized(res, error.message);
}

// ❌ Bad - Generic error handling
return ResponseBuilder.serverError(res, 'Something went wrong');
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

### From Error Response Anti-patterns

```typescript
// Before - Using success for errors (anti-pattern)
return ResponseBuilder.success(res, { error: 'Invalid credentials' }, { errorCode: 'UNAUTHORIZED' }, 401);
return ResponseBuilder.success(res, { error: 'User not found' }, { errorCode: 'NOT_FOUND' }, 404);
return ResponseBuilder.success(res, { error: 'Validation failed' }, { errorCode: 'VALIDATION_ERROR' }, 422);

// After - Using proper error methods
return ResponseBuilder.unauthorized(res, 'Invalid credentials');
return ResponseBuilder.notFound(res, 'User not found');
return ResponseBuilder.validationError(res, 'Validation failed', validationErrors);
```

### From Direct Error Responses

```typescript
// Before
return res.status(401).json({
  error: 'Unauthorized',
  message: 'Invalid token'
});

// After
return ResponseBuilder.unauthorized(res, 'Invalid token');
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
