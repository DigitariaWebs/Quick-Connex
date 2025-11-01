# Authentication System Test Script

## Overview

This script tests the complete authentication system using the provided test credentials. It verifies all authentication endpoints and ensures the new `payload` response structure is working correctly.

## Prerequisites

1. **Server Running**: The backend server must be running on port 3001
2. **Test Users**: The test users from `test_users_credentials.txt` must exist in the database
3. **Dependencies**: Axios is required (already available in the project)

## Usage

### Run the Test Script

```bash
# Make sure the server is running first
npm run dev:server

# In another terminal, run the auth tests
npm run test:auth
```

### Manual Execution

```bash
# Direct execution
node scripts/test-auth-system.js

# Or make it executable and run directly
chmod +x scripts/test-auth-system.js
./scripts/test-auth-system.js
```

## Test Coverage

The script tests the following authentication features:

### ✅ Core Authentication
- **Login** - Tests login for all user types (Manager, Employee, Admin, Super Admin)
- **Logout** - Tests session termination
- **Get Current User** - Tests user information retrieval
- **Token Validation** - Tests access token verification

### ✅ Session Management
- **List Sessions** - Tests active session listing
- **Refresh Session** - Tests token refresh functionality

### ✅ Error Handling
- **Invalid Credentials** - Tests rejection of wrong credentials
- **Unauthorized Access** - Tests rejection of requests without tokens
- **Response Structure** - Validates the new `payload` structure

### ✅ Response Structure Validation
- Verifies responses use the new `payload` field instead of `data`
- Checks for proper meta information (requestId, timestamp)
- Validates user and session data structure

## Test Credentials

The script uses these test accounts:

| Role | Email | Password |
|------|-------|----------|
| MANAGER | arselene.tests@gmail.com | TestPassword123! |
| EMPLOYEE | arselene.dev@gmail.com | TestPassword123! |
| ADMIN | arselene.main@gmail.com | TestPassword123! |
| SUPER ADMIN | dragonsissou1000@gmail.com | TestPassword123! |

## Expected Output

The script provides detailed logging with:
- ✅ **PASS** indicators for successful tests
- ❌ **FAIL** indicators for failed tests
- 📊 **Summary** with pass/fail counts and success rate
- 🔍 **Details** for any failed tests

## Example Output

```
🚀 Starting Authentication System Tests
=====================================
✅ [2025-01-27T10:30:00.000Z] PASS: Server Connection
ℹ️ [2025-01-27T10:30:00.100Z] Testing login for MANAGER (arselene.tests@gmail.com)...
✅ [2025-01-27T10:30:00.200Z] PASS: Login - MANAGER
ℹ️ [2025-01-27T10:30:00.300Z] Testing get current user for MANAGER...
✅ [2025-01-27T10:30:00.400Z] PASS: Get Current User - MANAGER

📊 Test Summary
================
Total Tests: 24
Passed: 24
Failed: 0
Success Rate: 100.0%

🎯 Authentication System Test Complete!
```

## Troubleshooting

### Server Not Running
```
❌ Server is not running. Please start the server on port 3001.
```
**Solution**: Start the backend server with `npm run dev:server`

### Login Failures
```
❌ FAIL: Login - MANAGER - Status: 401, Error: {"success":false,"error":"Invalid credentials"}
```
**Solution**: Ensure test users exist in the database and credentials are correct

### Response Structure Issues
```
❌ FAIL: Response Structure - MANAGER - Incorrect response structure
```
**Solution**: Check that the backend is using the new `payload` structure

## Exit Codes

- **0**: All tests passed
- **1**: One or more tests failed

This makes the script suitable for CI/CD pipelines and automated testing.
