#!/usr/bin/env node

/**
 * Comprehensive Authentication & Security Test Script
 * Tests JWT authentication, rate limiting, and security features
 */

const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_USER = {
    email: 'test@example.com',
    password: 'TestPassword123',
    firstName: 'Test',
    lastName: 'User',
    userType: 'manager'
};

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

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const isHttps = url.startsWith('https://');
        const client = isHttps ? https : http;

        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            timeout: 10000
        };

        const req = client.request(url, requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = data ? JSON.parse(data) : {};
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: jsonData
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Request timeout')));

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }

        req.end();
    });
}

function recordTest(testName, passed, details = '') {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        log(`PASS: ${testName}`, 'success');
    } else {
        testResults.failed++;
        log(`FAIL: ${testName} - ${details}`, 'error');
    }
    testResults.details.push({ name: testName, passed, details });
}

// Test functions
async function testServerConnection() {
    log('Testing server connection...');
    try {
        const response = await makeRequest(`${BASE_URL}/api/test-db`);
        recordTest('Server Connection', response.status === 200 || response.status === 401);
    } catch (error) {
        recordTest('Server Connection', false, error.message);
    }
}

async function testLoginEndpoint() {
    log('Testing login endpoint...');

    // Test 1: Valid login
    try {
        const response = await makeRequest(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            body: {
                email: TEST_USER.email,
                password: TEST_USER.password
            }
        });

        const hasAuthCookie = response.headers['set-cookie']?.some(cookie =>
            cookie.includes('auth-token')
        );

        recordTest('Valid Login',
            response.status === 200 &&
            response.data.success === true &&
            hasAuthCookie
        );
    } catch (error) {
        recordTest('Valid Login', false, error.message);
    }

    // Test 2: Invalid credentials
    try {
        const response = await makeRequest(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            body: {
                email: 'invalid@example.com',
                password: 'wrongpassword'
            }
        });

        recordTest('Invalid Login Rejection',
            response.status === 401 &&
            response.data.message?.includes('Invalid')
        );
    } catch (error) {
        recordTest('Invalid Login Rejection', false, error.message);
    }

    // Test 3: Missing credentials
    try {
        const response = await makeRequest(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            body: {}
        });

        recordTest('Missing Credentials Rejection',
            response.status === 400
        );
    } catch (error) {
        recordTest('Missing Credentials Rejection', false, error.message);
    }
}

async function testRateLimiting() {
    log('Testing rate limiting...');

    const promises = [];
    const maxAttempts = 6; // Test rate limit of 5

    for (let i = 0; i < maxAttempts; i++) {
        promises.push(
            makeRequest(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                body: {
                    email: 'test@example.com',
                    password: 'wrongpassword'
                }
            })
        );
    }

    try {
        const responses = await Promise.all(promises);

        // First 5 should be 401, 6th should be 429
        const firstFivePassed = responses.slice(0, 5).every(r => r.status === 401);
        const lastOneRateLimited = responses[5].status === 429;

        recordTest('Rate Limiting', firstFivePassed && lastOneRateLimited);

        if (lastOneRateLimited) {
            log(`Rate limit triggered after ${maxAttempts} attempts`, 'success');
        }
    } catch (error) {
        recordTest('Rate Limiting', false, error.message);
    }
}

async function testJWTTokenValidation() {
    log('Testing JWT token validation...');

    // First, get a valid token by logging in
    let authCookie = '';
    try {
        const loginResponse = await makeRequest(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            body: {
                email: TEST_USER.email,
                password: TEST_USER.password
            }
        });

        if (loginResponse.status === 200) {
            authCookie = loginResponse.headers['set-cookie']?.find(cookie =>
                cookie.includes('auth-token')
            ) || '';
        }
    } catch (error) {
        recordTest('JWT Token Validation', false, 'Failed to get auth token');
        return;
    }

    if (!authCookie) {
        recordTest('JWT Token Validation', false, 'No auth cookie received');
        return;
    }

    // Test 1: Valid token access
    try {
        const response = await makeRequest(`${BASE_URL}/api/auth/verify`, {
            method: 'GET',
            headers: {
                'Cookie': authCookie
            }
        });

        recordTest('Valid Token Access',
            response.status === 200 &&
            response.data.success === true
        );
    } catch (error) {
        recordTest('Valid Token Access', false, error.message);
    }

    // Test 2: Invalid token access
    try {
        const response = await makeRequest(`${BASE_URL}/api/auth/verify`, {
            method: 'GET',
            headers: {
                'Cookie': 'auth-token=invalid-token'
            }
        });

        recordTest('Invalid Token Rejection', response.status === 401);
    } catch (error) {
        recordTest('Invalid Token Rejection', false, error.message);
    }

    // Test 3: No token access
    try {
        const response = await makeRequest(`${BASE_URL}/api/auth/verify`, {
            method: 'GET'
        });

        recordTest('No Token Rejection', response.status === 401);
    } catch (error) {
        recordTest('No Token Rejection', false, error.message);
    }
}

async function testProtectedRoutes() {
    log('Testing protected routes...');

    // Test 1: Dashboard without auth (should redirect)
    try {
        const response = await makeRequest(`${BASE_URL}/dashboard`);
        recordTest('Dashboard Protection',
            response.status === 302 || response.status === 307 || response.status === 401
        );
    } catch (error) {
        recordTest('Dashboard Protection', false, error.message);
    }

    // Test 2: API routes without auth
    try {
        const response = await makeRequest(`${BASE_URL}/api/transfers`);
        recordTest('API Route Protection', response.status === 401);
    } catch (error) {
        recordTest('API Route Protection', false, error.message);
    }
}

async function testLogout() {
    log('Testing logout functionality...');

    // First, get a valid token
    let authCookie = '';
    try {
        const loginResponse = await makeRequest(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            body: {
                email: TEST_USER.email,
                password: TEST_USER.password
            }
        });

        if (loginResponse.status === 200) {
            authCookie = loginResponse.headers['set-cookie']?.find(cookie =>
                cookie.includes('auth-token')
            ) || '';
        }
    } catch (error) {
        recordTest('Logout Test', false, 'Failed to get auth token');
        return;
    }

    // Test logout
    try {
        const response = await makeRequest(`${BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
                'Cookie': authCookie
            }
        });

        const hasClearedCookie = response.headers['set-cookie']?.some(cookie =>
            cookie.includes('auth-token') && cookie.includes('Max-Age=0')
        );

        recordTest('Logout Functionality',
            response.status === 200 &&
            response.data.success === true &&
            hasClearedCookie
        );
    } catch (error) {
        recordTest('Logout Functionality', false, error.message);
    }
}

async function testSecurityHeaders() {
    log('Testing security headers...');

    try {
        const response = await makeRequest(`${BASE_URL}/login`);

        const hasSecurityHeaders = [
            'x-content-type-options',
            'x-frame-options',
            'x-xss-protection'
        ].some(header => response.headers[header]);

        recordTest('Security Headers', hasSecurityHeaders);
    } catch (error) {
        recordTest('Security Headers', false, error.message);
    }
}

async function testInputValidation() {
    log('Testing input validation...');

    // Test XSS prevention
    try {
        const response = await makeRequest(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            body: {
                email: '<script>alert("xss")</script>@example.com',
                password: 'password123'
            }
        });

        recordTest('XSS Prevention', response.status === 400 || response.status === 401);
    } catch (error) {
        recordTest('XSS Prevention', false, error.message);
    }

    // Test SQL injection prevention
    try {
        const response = await makeRequest(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            body: {
                email: "admin'; DROP TABLE users; --",
                password: 'password123'
            }
        });

        recordTest('SQL Injection Prevention', response.status === 400 || response.status === 401);
    } catch (error) {
        recordTest('SQL Injection Prevention', false, error.message);
    }
}

async function testPerformance() {
    log('Testing performance...');

    const startTime = performance.now();
    const promises = [];

    // Test concurrent requests
    for (let i = 0; i < 10; i++) {
        promises.push(
            makeRequest(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                body: {
                    email: 'test@example.com',
                    password: 'wrongpassword'
                }
            })
        );
    }

    try {
        await Promise.all(promises);
        const endTime = performance.now();
        const duration = endTime - startTime;

        recordTest('Performance Test', duration < 5000, `Duration: ${duration.toFixed(2)}ms`);
    } catch (error) {
        recordTest('Performance Test', false, error.message);
    }
}

// Main test runner
async function runTests() {
    log('🚀 Starting Authentication & Security Test Suite', 'info');
    log(`Testing against: ${BASE_URL}`, 'info');
    log('', 'info');

    const startTime = performance.now();

    try {
        await testServerConnection();
        await testLoginEndpoint();
        await testRateLimiting();
        await testJWTTokenValidation();
        await testProtectedRoutes();
        await testLogout();
        await testSecurityHeaders();
        await testInputValidation();
        await testPerformance();
    } catch (error) {
        log(`Test suite error: ${error.message}`, 'error');
    }

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    // Print results
    log('', 'info');
    log('📊 Test Results Summary', 'info');
    log(`Total Tests: ${testResults.total}`, 'info');
    log(`Passed: ${testResults.passed}`, 'success');
    log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');
    log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`, 'info');
    log(`Total Duration: ${totalDuration.toFixed(2)}ms`, 'info');

    if (testResults.failed > 0) {
        log('', 'info');
        log('❌ Failed Tests:', 'error');
        testResults.details
            .filter(test => !test.passed)
            .forEach(test => log(`  - ${test.name}: ${test.details}`, 'error'));
    }

    log('', 'info');
    log('🏁 Test suite completed!', 'info');

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle script execution
if (require.main === module) {
    runTests().catch(error => {
        log(`Fatal error: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = {
    runTests,
    testResults
};
