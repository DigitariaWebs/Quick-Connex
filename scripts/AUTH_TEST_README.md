# Authentication System Test Suite

This directory contains comprehensive test scripts for the authentication system, designed to verify all functionality using the test credentials from `test_users_credentials.txt`.

## Test Scripts Overview

### 1. `simple-auth-test.js` - Basic Authentication Tests
**Recommended for most testing scenarios**

A lightweight test script that performs essential authentication tests without complex server management.

**Features:**
- Tests all user roles (Manager, Employee, Admin, Super Admin)
- Validates login, session management, and logout
- Tests invalid login scenarios
- Basic rate limiting verification
- Uses test credentials from `test_users_credentials.txt`

**Usage:**
```bash
# Make sure your server is running first
npm run dev

# In another terminal, run the tests
node scripts/simple-auth-test.js
```

### 2. `comprehensive-auth-test.js` - Full System Tests
**For thorough testing and development**

A comprehensive test suite that covers all authentication features including advanced security testing.

**Features:**
- Complete authentication flow testing
- Session management and validation
- Role-based authorization testing
- Security features verification
- Rate limiting with server restart capability
- Audit logging verification
- Concurrent session testing
- Advanced error handling

**Usage:**
```bash
# Run comprehensive tests (handles server management)
node scripts/comprehensive-auth-test.js
```

### 3. `auth-test-runner.sh` - Automated Test Runner
**For CI/CD and automated testing**

A bash script that manages server lifecycle and handles rate limiting automatically.

**Features:**
- Automatic server start/stop
- Rate limit cleanup
- Retry logic for failed tests
- Session cleanup
- Colored output and logging

**Usage:**
```bash
# Make executable and run
chmod +x scripts/auth-test-runner.sh
./scripts/auth-test-runner.sh
```

## Test Credentials

The test scripts use the following credentials from `test_users_credentials.txt`:

| Role | Email | Password | Expected UserType |
|------|-------|----------|-------------------|
| MANAGER | arselene.tests@gmail.com | TestPassword123! | manager |
| EMPLOYEE | arselene.dev@gmail.com | TestPassword123! | employee |
| ADMIN | arselene.main@gmail.com | TestPassword123! | admin |
| SUPER ADMIN | dragonsissou1000@gmail.com | TestPassword123! | super_admin |

## Test Coverage

### Authentication Tests
- ✅ Valid login for all user roles
- ✅ Invalid login scenarios (wrong credentials, malformed data)
- ✅ JWT token generation and validation
- ✅ Session creation and management
- ✅ Session validation and refresh
- ✅ Logout and session revocation

### Security Tests
- ✅ Rate limiting verification
- ✅ Suspicious activity detection
- ✅ IP binding validation (if enabled)
- ✅ Concurrent session limits
- ✅ Password validation
- ✅ Email format validation

### Authorization Tests
- ✅ Role-based access control
- ✅ Admin endpoint access
- ✅ Permission verification
- ✅ Session-based authorization

### System Integration Tests
- ✅ Database integration
- ✅ Audit logging
- ✅ Error handling
- ✅ Data transformation
- ✅ Cookie management

## Rate Limiting Handling

The authentication system includes rate limiting to prevent brute force attacks. The test scripts handle this in several ways:

### Simple Test Script
- Tests rate limiting by making multiple failed login attempts
- Reports if rate limiting is triggered
- Continues with other tests even if rate limited

### Comprehensive Test Script
- Includes server restart functionality
- Clears rate limits between test runs
- Handles session cleanup automatically

### Test Runner Script
- Automatically restarts server to clear rate limits
- Includes retry logic for failed tests
- Cleans up authentication state between runs

## Troubleshooting

### Server Not Running
```bash
# Start the development server
npm run dev

# Check if server is running
curl http://localhost:3000/api/auth/verify
```

### Rate Limiting Issues
```bash
# Clear sessions and rate limits
node scripts/essentials/cleanup-sessions.js
node scripts/essentials/clear-sessions.js

# Or restart the server
pkill -f "next dev"
npm run dev
```

### Test Failures
1. **Check server logs** - Look for error messages in the terminal running `npm run dev`
2. **Verify database connection** - Ensure MongoDB is running and accessible
3. **Check test credentials** - Verify users exist in the database
4. **Clear authentication state** - Run cleanup scripts to reset sessions

### Common Issues

#### "Server is not responding"
- Ensure the development server is running on port 3000
- Check for port conflicts
- Verify the server started successfully

#### "Login failed: INVALID_CREDENTIALS"
- Verify test users exist in the database
- Check if users are in 'approved' status
- Run user creation scripts if needed

#### "Rate limiting triggered"
- This is expected behavior for security
- Use the comprehensive test script which handles this automatically
- Or manually clear sessions and restart server

#### "Session validation failed"
- Check if JWT_SECRET is properly configured
- Verify session data in database
- Ensure cookies are being set correctly

## Development Workflow

### Quick Testing
```bash
# Start server
npm run dev

# Run simple tests
node scripts/simple-auth-test.js
```

### Full Testing
```bash
# Use automated runner
./scripts/auth-test-runner.sh
```

### Manual Testing
```bash
# Test specific user login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"arselene.tests@gmail.com","password":"TestPassword123!"}'
```

## Integration with CI/CD

The test scripts are designed to work in automated environments:

```yaml
# Example GitHub Actions workflow
- name: Run Authentication Tests
  run: |
    npm run dev &
    sleep 10
    node scripts/simple-auth-test.js
```

## Monitoring and Debugging

### Enable Debug Logging
Set environment variables for detailed logging:
```bash
DEBUG=auth:* npm run dev
```

### Check Database State
```bash
# List all users
node scripts/essentials/list-users.js

# List all sessions
node scripts/essentials/list-sessions.js

# Check audit logs
node scripts/check-audit-logs.js
```

### Performance Monitoring
The comprehensive test script includes performance metrics:
- Test execution times
- Database query performance
- Session creation/validation speed
- Error rates and types

## Best Practices

1. **Always use test credentials** - Never use production credentials in tests
2. **Clean up after tests** - Ensure sessions are properly cleaned up
3. **Handle rate limiting** - Use appropriate delays or server restarts
4. **Verify all user roles** - Test each role's permissions thoroughly
5. **Check audit logs** - Verify that all actions are properly logged
6. **Test error scenarios** - Include invalid inputs and edge cases

## Contributing

When adding new authentication features:

1. **Update test scripts** to include new functionality
2. **Add new test cases** for edge cases and error scenarios
3. **Update documentation** to reflect new test coverage
4. **Verify all user roles** work with new features
5. **Test rate limiting** doesn't interfere with new functionality

## Support

If you encounter issues with the test scripts:

1. Check the server logs for error messages
2. Verify all dependencies are installed
3. Ensure the database is accessible
4. Check that test users exist and are approved
5. Review the authentication system documentation

For development questions, refer to the main project documentation or contact the development team.
