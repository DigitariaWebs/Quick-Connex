# LogService Documentation

## Overview

The LogService provides comprehensive, structured logging capabilities for the patients management application. It replaces scattered `console.*` calls with a centralized, feature-rich logging system.

## Key Features

- **Structured Logging**: Consistent JSON format with metadata
- **Context Enrichment**: Automatic request correlation, user context, session info
- **PII Sanitization**: Auto-mask emails, passwords, tokens, phone numbers
- **Performance Tracking**: Log operation duration and performance metrics
- **Environment-Based Formatting**: Pretty-printed development logs, compact production logs
- **Log Levels**: trace, debug, info, warn, error with filtering

## Quick Start

```typescript
import { log } from '@/lib/services/log-service';

// Basic logging
log.info('User logged in', { userId: '123', email: 'user@example.com' });
log.error('Database connection failed', error, { operation: 'connect' });

// Specialized logging
log.auth('Authentication successful', { userId: '123' });
log.database('Query executed', { query: 'findUsers', duration: 45 });
log.security('Suspicious activity detected', { ipAddress: '192.168.1.1' });
log.performance('Slow operation', 1500, { operation: 'dataProcessing' });
```

## Log Levels

### Development Environment
- **trace**: Detailed debugging information
- **debug**: General debugging information  
- **info**: Important information about application flow
- **warn**: Warning messages for potential issues
- **error**: Error messages for failures

### Production Environment
- **info**: Important information (default minimum level)
- **warn**: Warning messages
- **error**: Error messages

## Usage Patterns

### 1. Basic Logging

```typescript
import { log } from '@/lib/services/log-service';

// Simple messages
log.info('Operation completed');
log.warn('Deprecated function used');
log.error('Critical error occurred', error);

// With context
log.info('User action', {
  userId: '123',
  action: 'profile_update',
  timestamp: new Date()
});
```

### 2. Error Logging

```typescript
try {
  await riskyOperation();
} catch (error) {
  log.error('Operation failed', error, {
    operation: 'riskyOperation',
    userId: user.id,
    context: 'user_profile'
  });
}
```

### 3. Performance Tracking

```typescript
// Manual timing
const startTime = Date.now();
await processData();
const duration = Date.now() - startTime;

log.performance('Data processing completed', duration, {
  recordCount: 1000,
  operation: 'processData'
});

// Using built-in timers
log.startTimer('databaseQuery');
await database.query();
const duration = log.endTimer('databaseQuery');
```

### 4. Specialized Logging

```typescript
// Authentication events
log.auth('Login successful', {
  userId: user.id,
  ipAddress: request.ip,
  userAgent: request.headers['user-agent']
});

// Database operations
log.database('Query executed', {
  query: 'findUsers',
  duration: 45,
  recordCount: 100
});

// Security events
log.security('Failed login attempt', {
  email: 'user@example.com',
  ipAddress: '192.168.1.1',
  attemptCount: 3
});
```

### 5. Context Management

```typescript
// Set global context
log.setContext({
  requestId: 'req-123',
  userId: 'user-456',
  sessionId: 'session-789'
});

// All subsequent logs will include this context
log.info('Processing request'); // Will include requestId, userId, sessionId

// Clear context
log.clearContext();
```

## Configuration

### Environment-Based Behavior

**Development Mode:**
```json
{
  "timestamp": "2025-10-24T10:30:45.123Z",
  "level": "info",
  "message": "User logged in",
  "context": {
    "userId": "123",
    "email": "u***@example.com",
    "ipAddress": "192.168.1.1"
  }
}
```

**Production Mode:**
```json
{"timestamp":"2025-10-24T10:30:45.123Z","level":"info","message":"User logged in","context":{"userId":"123","email":"u***@example.com","ipAddress":"192.168.1.1"}}
```

### Custom Configuration

```typescript
import { logService } from '@/lib/services/log-service';

// Update configuration
logService.setConfig({
  minLevel: 'warn',
  enableColors: false,
  enableSanitization: true,
  slowOperationThreshold: 500
});
```

## PII Sanitization

The LogService automatically sanitizes sensitive data:

```typescript
// Input
log.info('User data', {
  email: 'john.doe@example.com',
  phone: '+1-555-123-4567',
  password: 'secret123',
  ssn: '123-45-6789'
});

// Output (sanitized)
{
  "email": "jo***@example.com",
  "phone": "***-***-4567", 
  "password": "***",
  "ssn": "***"
}
```

## Migration Guide

### From console.* calls

**Before:**
```typescript
console.log('User logged in:', user);
console.error('Database error:', error);
console.warn('Deprecated function used');
```

**After:**
```typescript
import { log } from '@/lib/services/log-service';

log.info('User logged in', { userId: user.id, email: user.email });
log.error('Database error', error, { operation: 'database' });
log.warn('Deprecated function used', { function: 'oldFunction' });
```

### From error-handling utilities

**Before:**
```typescript
import { logErrorWithContext, logInfo } from '@/lib/utils/error-handling';

logErrorWithContext(error, { operation: 'login' });
logInfo('Operation completed', { userId: '123' });
```

**After:**
```typescript
import { log } from '@/lib/services/log-service';

log.error('Operation failed', error, { operation: 'login' });
log.info('Operation completed', { userId: '123' });
```

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// ✅ Good
log.debug('Processing item', { itemId: '123' }); // Detailed debugging
log.info('User action completed', { action: 'update_profile' }); // Important flow
log.warn('Rate limit approaching', { current: 90, limit: 100 }); // Potential issue
log.error('Database connection lost', error, { operation: 'connect' }); // Error

// ❌ Avoid
log.error('User clicked button'); // Not an error
log.info('Debug: variable value is 42'); // Use debug level
```

### 2. Include Relevant Context

```typescript
// ✅ Good
log.info('Transfer created', {
  transferId: transfer.id,
  fromHospital: transfer.fromHospital,
  toHospital: transfer.toHospital,
  patientId: transfer.patientId,
  createdBy: user.id
});

// ❌ Avoid
log.info('Transfer created'); // No context
```

### 3. Use Specialized Methods

```typescript
// ✅ Good
log.auth('Login successful', { userId: user.id });
log.database('Query executed', { query: 'findUsers', duration: 45 });
log.security('Suspicious activity', { ipAddress: '192.168.1.1' });

// ❌ Avoid
log.info('Login successful', { category: 'auth' }); // Use log.auth instead
```

### 4. Performance Tracking

```typescript
// ✅ Good
const startTime = Date.now();
await processData();
const duration = Date.now() - startTime;

if (duration > 1000) {
  log.performance('Slow operation detected', duration, {
    operation: 'processData',
    recordCount: data.length
  });
}

// Or use built-in timers
log.startTimer('dataProcessing');
await processData();
const duration = log.endTimer('dataProcessing');
```

### 5. Error Context

```typescript
// ✅ Good
try {
  await riskyOperation();
} catch (error) {
  log.error('Operation failed', error, {
    operation: 'riskyOperation',
    userId: user.id,
    inputData: sanitizeInput(inputData)
  });
}

// ❌ Avoid
try {
  await riskyOperation();
} catch (error) {
  log.error('Operation failed', error); // No context
}
```

## Integration Examples

### API Routes

```typescript
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || 'unknown';
  
  try {
    log.info('API request started', {
      operation: 'createTransfer',
      requestId,
      ipAddress: request.headers.get('x-forwarded-for')
    });

    const result = await createTransfer(await request.json());
    
    const duration = Date.now() - startTime;
    log.info('API request completed', {
      operation: 'createTransfer',
      requestId,
      duration,
      transferId: result.id
    });
    
    return NextResponse.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('API request failed', error, {
      operation: 'createTransfer',
      requestId,
      duration
    });
    
    return handleError(error);
  }
}
```

### Service Methods

```typescript
export class UserService {
  static async createUser(userData: CreateUserData): Promise<User> {
    log.startTimer('createUser');
    
    try {
      log.info('Creating user', { email: userData.email });
      
      const user = await DatabaseService.create(User, userData);
      
      const duration = log.endTimer('createUser');
      log.info('User created successfully', {
        userId: user.id,
        email: user.email,
        duration
      });
      
      return user;
    } catch (error) {
      log.error('User creation failed', error, {
        email: userData.email,
        operation: 'createUser'
      });
      throw error;
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Logs not appearing**: Check log level configuration
2. **Sensitive data in logs**: Ensure PII sanitization is enabled
3. **Performance impact**: Use appropriate log levels for production
4. **Context missing**: Set global context or include in each log call

### Debug Configuration

```typescript
// Enable debug logging
log.setConfig({ minLevel: 'debug' });

// Check current configuration
console.log(log.getConfig());
```

## Performance Considerations

- LogService is designed for minimal performance impact
- Use appropriate log levels (avoid debug/trace in production)
- PII sanitization adds minimal overhead
- Performance tracking is optional and lightweight

## Future Enhancements

- External service integration (Sentry, DataDog, etc.)
- Log aggregation and search
- Real-time log streaming
- Advanced filtering and querying
