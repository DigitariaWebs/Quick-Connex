#!/usr/bin/env node

/**
 * Session Management System Test Script
 * 
 * This script tests the complete session management system including:
 * - Session creation
 * - Session verification
 * - Session refresh
 * - Session revocation
 * - Security features
 * - Admin panel functionality
 * 
 * Usage:
 *   node scripts/test-session-system.js
 */

const fetch = require('node-fetch');
require('dotenv').config();

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
    testUser: {
        email: 'admin@test.com',
        password: 'password123'
    },
    deviceInfo: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        timezone: 'America/New_York',
        language: 'en-US',
        screenResolution: '1920x1080'
    },
    ipAddress: '192.168.1.100'
};

// Test results
let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

// Helper function to run a test
async function runTest(testName, testFunction) {
    testResults.total++;
    console.log(`\n🧪 Running test: ${testName}`);

    try {
        await testFunction();
        testResults.passed++;
        testResults.details.push({ name: testName, status: 'PASSED' });
        console.log(`✅ ${testName} - PASSED`);
    } catch (error) {
        testResults.failed++;
        testResults.details.push({ name: testName, status: 'FAILED', error: error.message });
        console.log(`❌ ${testName} - FAILED: ${error.message}`);
    }
}

// Test 1: Login and create session
async function testLoginAndSessionCreation() {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(TEST_CONFIG.testUser)
    });

    if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
    }

    const loginData = await response.json();
    if (!loginData.success) {
        throw new Error(`Login unsuccessful: ${loginData.message}`);
    }

    // Create session
    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId: loginData.user._id,
            deviceInfo: TEST_CONFIG.deviceInfo,
            ipAddress: TEST_CONFIG.ipAddress,
            sessionType: 'web'
        })
    });

    if (!sessionResponse.ok) {
        throw new Error(`Session creation failed: ${sessionResponse.status}`);
    }

    const sessionData = await sessionResponse.json();
    if (!sessionData.success) {
        throw new Error(`Session creation unsuccessful: ${sessionData.message}`);
    }

    // Store session ID for other tests
    global.testSessionId = sessionData.session.sessionId;
    global.testUserId = loginData.user._id;

    console.log(`📝 Session created: ${sessionData.session.sessionId}`);
    console.log(`🔒 Security risk: ${sessionData.session.securityRisk}`);
}

// Test 2: Session verification
async function testSessionVerification() {
    const response = await fetch(`${BASE_URL}/api/auth/session/verify`, {
        method: 'GET',
        credentials: 'include'
    });

    if (!response.ok) {
        throw new Error(`Session verification failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(`Session verification unsuccessful: ${data.error}`);
    }

    if (!data.session || data.session.sessionId !== global.testSessionId) {
        throw new Error('Session verification returned incorrect session data');
    }

    console.log(`✅ Session verified: ${data.session.sessionId}`);
}

// Test 3: Session refresh
async function testSessionRefresh() {
    const response = await fetch(`${BASE_URL}/api/auth/session/refresh`, {
        method: 'POST',
        credentials: 'include'
    });

    if (!response.ok) {
        throw new Error(`Session refresh failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(`Session refresh unsuccessful: ${data.error}`);
    }

    console.log(`🔄 Session refreshed: ${data.session.sessionId}`);
}

// Test 4: Get user sessions
async function testGetUserSessions() {
    const response = await fetch(`${BASE_URL}/api/auth/sessions`, {
        method: 'GET',
        credentials: 'include'
    });

    if (!response.ok) {
        throw new Error(`Get sessions failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(`Get sessions unsuccessful: ${data.error}`);
    }

    if (!data.sessions || data.sessions.length === 0) {
        throw new Error('No sessions found for user');
    }

    console.log(`📋 Found ${data.sessions.length} sessions for user`);
}

// Test 5: Admin session management (if admin user)
async function testAdminSessionManagement() {
    const response = await fetch(`${BASE_URL}/api/admin/sessions`, {
        method: 'GET',
        credentials: 'include'
    });

    if (!response.ok) {
        if (response.status === 403) {
            console.log('⚠️  Admin session management test skipped (not admin user)');
            return;
        }
        throw new Error(`Admin sessions failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(`Admin sessions unsuccessful: ${data.error}`);
    }

    console.log(`👑 Admin sessions retrieved: ${data.sessions.length} sessions`);
    console.log(`📊 Stats: ${data.stats.activeSessions} active, ${data.stats.expiredSessions} expired`);
}

// Test 6: Session revocation
async function testSessionRevocation() {
    const response = await fetch(`${BASE_URL}/api/auth/session/revoke`, {
        method: 'DELETE',
        credentials: 'include'
    });

    if (!response.ok) {
        throw new Error(`Session revocation failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(`Session revocation unsuccessful: ${data.error}`);
    }

    console.log(`🗑️  Session revoked successfully`);
}

// Test 7: Verify session is revoked
async function testSessionRevocationVerification() {
    const response = await fetch(`${BASE_URL}/api/auth/session/verify`, {
        method: 'GET',
        credentials: 'include'
    });

    if (response.ok) {
        throw new Error('Session should be revoked but verification still succeeded');
    }

    console.log(`✅ Session revocation verified (session no longer valid)`);
}

// Test 8: Security features
async function testSecurityFeatures() {
    // Test concurrent session limits
    console.log('🔒 Testing security features...');

    // Create multiple sessions to test limits
    const sessionPromises = [];
    for (let i = 0; i < 5; i++) {
        sessionPromises.push(
            fetch(`${BASE_URL}/api/auth/session/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: global.testUserId,
                    deviceInfo: {
                        ...TEST_CONFIG.deviceInfo,
                        userAgent: `Test Browser ${i}/1.0`
                    },
                    ipAddress: `192.168.1.${100 + i}`,
                    sessionType: 'web'
                })
            })
        );
    }

    const responses = await Promise.all(sessionPromises);
    const results = await Promise.all(responses.map(r => r.json()));

    const successfulSessions = results.filter(r => r.success);
    const blockedSessions = results.filter(r => !r.success);

    console.log(`🔒 Security test: ${successfulSessions.length} sessions created, ${blockedSessions.length} blocked`);

    if (blockedSessions.length > 0) {
        console.log(`🛡️  Security working: ${blockedSessions.length} sessions blocked due to limits`);
    }
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting Session Management System Tests');
    console.log('='.repeat(50));

    try {
        await runTest('Login and Session Creation', testLoginAndSessionCreation);
        await runTest('Session Verification', testSessionVerification);
        await runTest('Session Refresh', testSessionRefresh);
        await runTest('Get User Sessions', testGetUserSessions);
        await runTest('Admin Session Management', testAdminSessionManagement);
        await runTest('Session Revocation', testSessionRevocation);
        await runTest('Session Revocation Verification', testSessionRevocationVerification);
        await runTest('Security Features', testSecurityFeatures);

    } catch (error) {
        console.error('❌ Test suite failed:', error);
    }

    // Print results
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed} ✅`);
    console.log(`Failed: ${testResults.failed} ❌`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.failed > 0) {
        console.log('\n❌ Failed Tests:');
        testResults.details
            .filter(test => test.status === 'FAILED')
            .forEach(test => {
                console.log(`  - ${test.name}: ${test.error}`);
            });
    }

    console.log('\n🎉 Session Management System Test Complete!');

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = { runAllTests, runTest };
