# Comprehensive Authentication System Test Suite

## Overview

This test suite provides thorough validation of the authentication system, including login flows, session management, role-based access control, and security features for all user types.

## Files Created

1. **`scripts/essentials/test-auth-system.js`** - Main test script
2. **`scripts/essentials/run-auth-tests.js`** - Test runner with server management
3. **`scripts/essentials/README-auth-test.md`** - Detailed documentation
4. **`package.json`** - Updated with test scripts

## Quick Start

### Prerequisites
- MongoDB running and accessible
- Node.js dependencies installed
- Test users exist in database (from `test_users_credentials.txt`)

### Running Tests

#### Option 1: Manual Server Start
```bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: Run tests
npm run test:auth
```

#### Option 2: Automatic Server Management
```bash
# Automatically starts server, runs tests, and stops server
npm run test:auth:auto
```

#### Option 3: Direct Script Execution
```bash
# Run test script directly
node scripts/essentials/test-auth-system.js

# Run with server auto-start
node scripts/essentials/run-auth-tests.js --start-server
```

## Test Coverage

### ✅ Login & Authentication Flow Tests
- Valid login for all user types (Employee, Manager, Admin, Super Admin)
- Invalid login attempts (limited to avoid rate limiting)
- Session creation and database verification
- JWT token validation

### ✅ Session Management Tests
- Token verification (`/api/auth/verify`)
- Session refresh (`/api/auth/session/refresh`)
- Session listing (`/api/auth/sessions`)
- Logout and session cleanup
- Post-logout token invalidation

### ✅ Role-Based Access Control (RBAC) Tests
- **Employee**: Own profile/transfers ✅, Admin routes ❌
- **Manager**: Team transfers ✅, Admin routes ❌
- **Admin**: Full admin access ✅
- **Super Admin**: All routes including security events ✅

### ✅ Security & Edge Case Tests
- Token tampering protection
- Concurrent session handling
- Cross-user access prevention
- Rate limiting awareness (safe testing)

### ✅ Password Management Tests
- Forgot password flow
- Invalid email handling

## Test Users

The script uses these test credentials:

| User Type | Email | Password | Access Level |
|-----------|-------|----------|--------------|
| MANAGER | arselene.tests@gmail.com | TestPassword123! | Standard dashboard |
| EMPLOYEE | arselene.dev@gmail.com | TestPassword123! | Standard dashboard |
| ADMIN | arselene.main@gmail.com | TestPassword123! | Admin dashboard |
| SUPER ADMIN | dragonsissou1000@gmail.com | TestPassword123! | Full access |

## Rate Limiting Safety

The test suite is designed to respect rate limiting:
- **Login attempts**: Limited to 3 failed attempts (system limit is 5 per 15 minutes)
- **Delays**: 2-second delays between failed login attempts
- **No lockout**: Never triggers the 30-minute account lockout

## Output Example

```
🧪 COMPREHENSIVE AUTHENTICATION SYSTEM TEST
==================================================

🔍 Checking server connectivity...
✅ Server is running and accessible
✅ Connected to MongoDB

📝 LOGIN & AUTHENTICATION FLOW TESTS

✅ MANAGER Login
   Status: PASSED
   Details: User: arselene.tests@gmail.com
   ✅ Login successful
   ✅ Token received
   ✅ User data correct
   ✅ Session in database

✅ EMPLOYEE Login
   Status: PASSED
   Details: User: arselene.dev@gmail.com
   ✅ Login successful
   ✅ Token received
   ✅ User data correct
   ✅ Session in database

📝 SESSION MANAGEMENT TESTS

✅ MANAGER Session Management
   Status: PASSED
   Details: All session operations successful
   ✅ Token verification
   ✅ Session refresh
   ✅ Session listing
   ✅ Logout
   ✅ Token invalid after logout

📝 ROLE-BASED ACCESS CONTROL TESTS

✅ EMPLOYEE RBAC Tests
   Status: PASSED
   Details: All access controls working correctly
   ✅ Own profile (/api/users/profile)
   ✅ Own transfers (/api/transfers)
   ❌ Admin users (/api/admin/users) (should be denied)
   ❌ Admin transfers (/api/admin/transfers) (should be denied)

📊 FINAL RESULTS
==================================================
Total Tests: 45
Passed: 43
Failed: 2
Skipped: 0
Success Rate: 95.56%
```

## Troubleshooting

### Server Not Running
```
❌ Server connectivity check failed: Server not running at http://localhost:3000

💡 Troubleshooting:
   1. Start the development server: npm run dev
   2. Ensure server is running on http://localhost:3000
   3. Check if all dependencies are installed
```

### Database Connection Issues
```
❌ Failed to connect to MongoDB: [error details]
```
- Check MongoDB URI in `.env.local`
- Ensure MongoDB is running
- Verify network connectivity

### Test User Issues
```
❌ MANAGER Login: Login should succeed
```
- Verify test users exist in database
- Check user approval status
- Ensure passwords are correct

## Integration

### CI/CD Pipeline
```yaml
# Example GitHub Actions workflow
- name: Run Authentication Tests
  run: |
    npm install
    npm run test:auth:auto
```

### Manual Testing
```bash
# Quick test during development
npm run test:auth

# Comprehensive test with server management
npm run test:auth:auto
```

## Customization

### Adding New Tests
1. Add test function to `test-auth-system.js`
2. Call from appropriate test suite
3. Update documentation

### Modifying Test Users
1. Update `TEST_USERS` object in script
2. Ensure users exist in database
3. Update documentation

### Changing Test Endpoints
1. Update `BASE_URL` constant
2. Modify API paths as needed
3. Update test expectations

## Security Considerations

- Tests use real credentials but are designed to be safe
- Rate limiting is respected to avoid account lockouts
- No sensitive data is logged or exposed
- Database connections are properly closed
- Server processes are cleaned up after tests

## Performance

- Tests run in parallel where possible
- Timeouts prevent hanging requests
- Database connections are reused
- Memory usage is optimized

This comprehensive test suite ensures the authentication system is working correctly across all user types and scenarios while respecting security constraints and rate limiting.
