#!/usr/bin/env node

/**
 * Authentication System Test Script
 * 
 * Tests all authentication endpoints using the provided test credentials.
 * Server should be running on port 3001.
 */

const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_CREDENTIALS = [
    {
        role: 'MANAGER',
        email: 'arselene.tests@gmail.com',
        password: 'TestPassword123!'
    },
    {
        role: 'EMPLOYEE',
        email: 'arselene.dev@gmail.com',
        password: 'TestPassword123!'
    },
    {
        role: 'ADMIN',
        email: 'arselene.main@gmail.com',
        password: 'TestPassword123!'
    },
    {
        role: 'SUPER ADMIN',
        email: 'dragonsissou1000@gmail.com',
        password: 'TestPassword123!'
    }
];

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

// Utility functions
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
}

function logTest(testName, passed, details = '') {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        log(`PASS: ${testName}`, 'success');
    } else {
        testResults.failed++;
        log(`FAIL: ${testName} - ${details}`, 'error');
    }
    testResults.details.push({ testName, passed, details });
}

// Test helper functions
async function makeRequest(method, endpoint, data = null, headers = {}) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            withCredentials: true
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return { success: true, data: response.data, status: response.status, headers: response.headers };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status || 0
        };
    }
}

// Test functions
async function testServerConnection() {
    log('Testing server connection...');
    const result = await makeRequest('GET', '/api/health');

    if (result.success || result.status === 404) {
        logTest('Server Connection', true, 'Server is running');
        return true;
    } else {
        // Try a different endpoint to confirm server is running
        const authResult = await makeRequest('GET', '/api/auth/me');
        if (authResult.status === 401) {
            logTest('Server Connection', true, 'Server is running (auth endpoint responding)');
            return true;
        } else {
            logTest('Server Connection', false, `Server not responding: ${result.error}`);
            return false;
        }
    }
}

async function testLogin(credentials) {
    log(`Testing login for ${credentials.role} (${credentials.email})...`);

    const result = await makeRequest('POST', '/api/auth/login', {
        email: credentials.email,
        password: credentials.password
    });

    if (result.success && result.data.success && result.data.payload) {
        logTest(`Login - ${credentials.role}`, true, `Status: ${result.status}`);
        return {
            success: true,
            user: result.data.payload.user,
            session: result.data.payload.session,
            tokens: result.data.payload.tokens,
            meta: result.data.meta
        };
    } else {
        logTest(`Login - ${credentials.role}`, false, `Status: ${result.status}, Error: ${JSON.stringify(result.error)}`);
        return { success: false };
    }
}

async function testGetCurrentUser(accessToken, role) {
    log(`Testing get current user for ${role}...`);

    const result = await makeRequest('GET', '/api/auth/me', null, {
        'Authorization': `Bearer ${accessToken}`
    });

    if (result.success && result.data.success && result.data.payload) {
        logTest(`Get Current User - ${role}`, true, `Status: ${result.status}`);
        return { success: true, user: result.data.payload.user };
    } else {
        logTest(`Get Current User - ${role}`, false, `Status: ${result.status}, Error: ${JSON.stringify(result.error)}`);
        return { success: false };
    }
}

async function testListSessions(accessToken, role) {
    log(`Testing list sessions for ${role}...`);

    const result = await makeRequest('GET', '/api/auth/sessions', null, {
        'Authorization': `Bearer ${accessToken}`
    });

    if (result.success && result.data.success && result.data.payload) {
        logTest(`List Sessions - ${role}`, true, `Found ${result.data.payload.sessions?.length || 0} sessions`);
        return { success: true, sessions: result.data.payload.sessions };
    } else {
        logTest(`List Sessions - ${role}`, false, `Status: ${result.status}, Error: ${JSON.stringify(result.error)}`);
        return { success: false };
    }
}

async function testRefreshSession(accessToken, role) {
    log(`Testing refresh session for ${role}...`);

    const result = await makeRequest('POST', '/api/auth/sessions/refresh', null, {
        'Authorization': `Bearer ${accessToken}`
    });

    if (result.success && result.data.success && result.data.payload) {
        logTest(`Refresh Session - ${role}`, true, `Status: ${result.status}`);
        return { success: true, tokens: result.data.payload };
    } else {
        logTest(`Refresh Session - ${role}`, false, `Status: ${result.status}, Error: ${JSON.stringify(result.error)}`);
        return { success: false };
    }
}

async function testLogout(sessionId, role) {
    log(`Testing logout for ${role}...`);

    const result = await makeRequest('POST', '/api/auth/logout', {
        sessionId: sessionId
    });

    if (result.success && result.data.success) {
        logTest(`Logout - ${role}`, true, `Status: ${result.status}`);
        return { success: true };
    } else {
        logTest(`Logout - ${role}`, false, `Status: ${result.status}, Error: ${JSON.stringify(result.error)}`);
        return { success: false };
    }
}

async function testTokenValidation(accessToken, role) {
    log(`Testing token validation for ${role}...`);

    const result = await makeRequest('GET', '/api/auth/token/validate', null, {
        'Authorization': `Bearer ${accessToken}`
    });

    if (result.success && result.data.success && result.data.valid) {
        logTest(`Token Validation - ${role}`, true, `Status: ${result.status}`);
        return { success: true };
    } else {
        logTest(`Token Validation - ${role}`, false, `Status: ${result.status}, Error: ${JSON.stringify(result.error)}`);
        return { success: false };
    }
}

async function testInvalidCredentials() {
    log('Testing invalid credentials...');

    const result = await makeRequest('POST', '/api/auth/login', {
        email: 'invalid@example.com',
        password: 'wrongpassword'
    });

    if (!result.success && result.status === 401) {
        logTest('Invalid Credentials', true, 'Correctly rejected invalid credentials');
        return true;
    } else {
        logTest('Invalid Credentials', false, `Expected 401, got ${result.status}`);
        return false;
    }
}

async function testUnauthorizedAccess() {
    log('Testing unauthorized access...');

    const result = await makeRequest('GET', '/api/auth/me');

    if (!result.success && result.status === 401) {
        logTest('Unauthorized Access', true, 'Correctly rejected unauthorized access');
        return true;
    } else {
        logTest('Unauthorized Access', false, `Expected 401, got ${result.status}`);
        return false;
    }
}

async function testResponseStructure(credentials) {
    log(`Testing response structure for ${credentials.role}...`);

    const result = await makeRequest('POST', '/api/auth/login', {
        email: credentials.email,
        password: credentials.password
    });

    if (result.success && result.data) {
        const hasCorrectStructure =
            result.data.hasOwnProperty('success') &&
            result.data.hasOwnProperty('timestamp') &&
            result.data.hasOwnProperty('payload') &&
            result.data.hasOwnProperty('meta') &&
            result.data.payload.hasOwnProperty('user') &&
            result.data.payload.hasOwnProperty('session');

        if (hasCorrectStructure) {
            logTest(`Response Structure - ${credentials.role}`, true, 'Correct payload structure');
            return true;
        } else {
            logTest(`Response Structure - ${credentials.role}`, false, 'Incorrect response structure');
            return false;
        }
    } else {
        logTest(`Response Structure - ${credentials.role}`, false, 'Login failed');
        return false;
    }
}

// Main test runner
async function runAuthTests() {
    log('🚀 Starting Authentication System Tests');
    log('=====================================');

    // Test server connection first
    const serverRunning = await testServerConnection();
    if (!serverRunning) {
        log('❌ Server is not running. Please start the server on port 3001.', 'error');
        process.exit(1);
    }

    log('\n📋 Testing Authentication Endpoints');
    log('=====================================');

    // Test invalid credentials
    await testInvalidCredentials();
    await testUnauthorizedAccess();

    log('\n👥 Testing with Valid Credentials');
    log('==================================');

    const loginResults = [];

    // Test login for each user type
    for (const credentials of TEST_CREDENTIALS) {
        log(`\n--- Testing ${credentials.role} ---`);

        // Test response structure
        await testResponseStructure(credentials);

        // Test login
        const loginResult = await testLogin(credentials);
        if (loginResult.success) {
            loginResults.push({
                credentials,
                user: loginResult.user,
                session: loginResult.session,
                tokens: loginResult.tokens,
                meta: loginResult.meta
            });

            // Test get current user
            await testGetCurrentUser(loginResult.tokens?.accessToken || 'test-token', credentials.role);

            // Test list sessions
            await testListSessions(loginResult.tokens?.accessToken || 'test-token', credentials.role);

            // Test refresh session
            await testRefreshSession(loginResult.tokens?.accessToken || 'test-token', credentials.role);

            // Test token validation
            await testTokenValidation(loginResult.tokens?.accessToken || 'test-token', credentials.role);

            // Test logout
            await testLogout(loginResult.session.sessionId, credentials.role);
        }
    }

    // Test error scenarios
    log('\n🚫 Testing Error Scenarios');
    log('============================');

    // Test with expired/invalid token
    await testUnauthorizedAccess();

    // Print summary
    log('\n📊 Test Summary');
    log('================');
    log(`Total Tests: ${testResults.total}`);
    log(`Passed: ${testResults.passed}`, 'success');
    log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');
    log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.failed > 0) {
        log('\n❌ Failed Tests:');
        testResults.details
            .filter(test => !test.passed)
            .forEach(test => log(`  - ${test.testName}: ${test.details}`, 'error'));
    }

    log('\n🎯 Authentication System Test Complete!');

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle script execution
if (require.main === module) {
    runAuthTests().catch(error => {
        log(`❌ Test runner failed: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = {
    runAuthTests,
    testResults
};
