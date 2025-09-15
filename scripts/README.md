# Authentication & Security Test Scripts

This directory contains comprehensive test scripts for the JWT authentication system and security features.

## Test Scripts

### 1. `quick-auth-test.js` - Quick Connectivity Test
**Purpose**: Basic connectivity and endpoint availability tests
**Usage**: `node scripts/quick-auth-test.js`
**Duration**: ~10 seconds
**Tests**:
- Server connection
- Login endpoint availability
- Protected route redirection
- Verify endpoint existence
- Logout endpoint functionality

### 2. `test-jwt.js` - JWT Authentication Test
**Purpose**: Comprehensive JWT token testing
**Usage**: `node scripts/test-jwt.js`
**Duration**: ~30 seconds
**Tests**:
- JWT token creation and validation
- Token expiration and invalidation
- Protected route access with valid/invalid tokens
- Logout and token cleanup
- Rate limiting
- Security headers
- Cookie security attributes

### 3. `test-api-endpoints.js` - API Endpoints Test
**Purpose**: API endpoint authentication and functionality testing
**Usage**: `node scripts/test-api-endpoints.js`
**Duration**: ~45 seconds
**Tests**:
- Authentication endpoints (login, verify, logout)
- Protected API endpoints
- Authenticated requests
- Transfer creation and validation
- Input validation
- Rate limiting
- Security headers
- Error handling

### 4. `test-authentication.js` - Comprehensive Security Test
**Purpose**: Full security test suite
**Usage**: `node scripts/test-authentication.js`
**Duration**: ~60 seconds
**Tests**:
- All of the above tests
- Performance testing
- Concurrent request handling
- XSS and SQL injection prevention
- Security header validation
- Rate limiting under load

### 5. `run-all-tests.js` - Master Test Runner
**Purpose**: Runs all test suites in sequence
**Usage**: `node scripts/run-all-tests.js`
**Duration**: ~2-3 minutes
**Features**:
- Runs all test suites
- Provides comprehensive reporting
- Exit codes for CI/CD integration

## Prerequisites

1. **Server Running**: Make sure your Next.js server is running on `http://localhost:3000`
2. **Test User**: Ensure you have a test user in your database:
   - Email: `test@example.com`
   - Password: `TestPassword123`
   - UserType: `manager` (for full functionality testing)

## Quick Start

```bash
# Run all tests
node scripts/run-all-tests.js

# Run individual tests
node scripts/quick-auth-test.js
node scripts/test-jwt.js
node scripts/test-api-endpoints.js
node scripts/test-authentication.js
```

## Environment Variables

The tests use the following default configuration:
- `BASE_URL`: `http://localhost:3000` (can be overridden with `TEST_BASE_URL`)

## Test Results

Each test script provides:
- ✅ Pass/Fail status for each test
- 📊 Summary statistics
- ❌ Detailed error messages for failed tests
- ⏱️ Performance metrics (where applicable)

## CI/CD Integration

The test scripts return appropriate exit codes:
- `0`: All tests passed
- `1`: One or more tests failed

This makes them suitable for CI/CD pipelines:

```bash
# In your CI/CD pipeline
node scripts/run-all-tests.js
if [ $? -eq 0 ]; then
  echo "All tests passed!"
else
  echo "Tests failed!"
  exit 1
fi
```

## Troubleshooting

### Common Issues

1. **Server Not Running**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:3000
   ```
   **Solution**: Start your Next.js server with `npm run dev`

2. **Authentication Failed**
   ```
   ❌ JWT Token Creation - No auth cookie received
   ```
   **Solution**: Check that your test user exists in the database

3. **Rate Limiting Issues**
   ```
   ❌ Rate Limiting - Duration: 5000ms
   ```
   **Solution**: Wait a few minutes for rate limits to reset, or restart the server

4. **Environment Variables**
   ```
   Error: JWT_SECRET_KEY environment variable is not set
   ```
   **Solution**: Create a `.env.local` file with `JWT_SECRET_KEY=your-secret-key`

### Debug Mode

For more detailed output, you can modify the test scripts to include additional logging or run them with Node.js debug flags:

```bash
# Run with debug output
DEBUG=* node scripts/test-jwt.js

# Run with verbose logging
node --trace-warnings scripts/test-authentication.js
```

## Security Considerations

These test scripts are designed to test security features and should be run in a development environment. They include:

- Rate limiting tests (may temporarily block your IP)
- Authentication bypass attempts
- Input validation testing
- Security header verification

**Do not run these tests against production systems** as they may trigger security measures or rate limiting.

## Contributing

When adding new tests:

1. Follow the existing pattern of `recordTest(name, passed, details)`
2. Include proper error handling
3. Add timeout handling for network requests
4. Provide clear test descriptions
5. Update this README with new test information
