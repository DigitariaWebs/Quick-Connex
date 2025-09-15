#!/usr/bin/env node

/**
 * JWT Authentication Test Script
 * Tests JWT token creation, validation, and security features
 */

const http = require('http');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:3000';

// Test user credentials
const TEST_USER = {
    email: 'test@example.com',
    password: 'TestPassword123'
};

function makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const req = http.request(url, requestOptions, (res) => {
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
        req.setTimeout(10000, () => reject(new Error('Request timeout')));

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }

        req.end();
    });
}

function extractCookie(cookieHeader, cookieName) {
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === cookieName) {
            return value;
        }
    }
    return null;
}

async function testJWTAuthentication() {
    console.log('🔐 JWT Authentication Test Suite');
    console.log('=================================\n');

    let authCookie = '';
    let testResults = { passed: 0, failed: 0, total: 0 };

    function recordTest(name, passed, details = '') {
        testResults.total++;
        if (passed) {
            testResults.passed++;
            console.log(`✅ ${name}`);
        } else {
            testResults.failed++;
            console.log(`❌ ${name}${details ? ` - ${details}` : ''}`);
        }
    }

    try {
        // Test 1: Login and get JWT token
        console.log('1. Testing JWT token creation...');
        const loginResponse = await makeRequest('/api/auth/login', {
            method: 'POST',
            body: TEST_USER
        });

        const hasAuthCookie = loginResponse.headers['set-cookie']?.some(cookie =>
            cookie.includes('auth-token')
        );

        if (hasAuthCookie) {
            authCookie = loginResponse.headers['set-cookie'].find(cookie =>
                cookie.includes('auth-token')
            );
        }

        recordTest('JWT Token Creation',
            loginResponse.status === 200 &&
            loginResponse.data.success === true &&
            hasAuthCookie
        );

        if (!authCookie) {
            console.log('❌ No auth cookie received, cannot continue with JWT tests');
            return;
        }

        // Test 2: Verify JWT token
        console.log('\n2. Testing JWT token verification...');
        const verifyResponse = await makeRequest('/api/auth/verify', {
            method: 'GET',
            headers: {
                'Cookie': authCookie
            }
        });

        recordTest('JWT Token Verification',
            verifyResponse.status === 200 &&
            verifyResponse.data.success === true &&
            verifyResponse.data.user
        );

        // Test 3: Access protected route with valid token
        console.log('\n3. Testing protected route access...');
        const protectedResponse = await makeRequest('/api/transfers', {
            method: 'GET',
            headers: {
                'Cookie': authCookie
            }
        });

        recordTest('Protected Route Access',
            protectedResponse.status === 200 || protectedResponse.status === 404 // 404 is OK if no transfers exist
        );

        // Test 4: Test token expiration (if we can modify the token)
        console.log('\n4. Testing invalid token rejection...');
        const invalidTokenResponse = await makeRequest('/api/auth/verify', {
            method: 'GET',
            headers: {
                'Cookie': 'auth-token=invalid.jwt.token'
            }
        });

        recordTest('Invalid Token Rejection', invalidTokenResponse.status === 401);

        // Test 5: Test no token access
        console.log('\n5. Testing no token access...');
        const noTokenResponse = await makeRequest('/api/auth/verify', {
            method: 'GET'
        });

        recordTest('No Token Rejection', noTokenResponse.status === 401);

        // Test 6: Test logout and token invalidation
        console.log('\n6. Testing logout and token invalidation...');
        const logoutResponse = await makeRequest('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Cookie': authCookie
            }
        });

        const hasClearedCookie = logoutResponse.headers['set-cookie']?.some(cookie =>
            cookie.includes('auth-token') && (cookie.includes('Max-Age=0') || cookie.includes('expires='))
        );

        recordTest('Logout and Token Invalidation',
            logoutResponse.status === 200 &&
            logoutResponse.data.success === true &&
            hasClearedCookie
        );

        // Test 7: Test that token is invalidated after logout
        console.log('\n7. Testing token invalidation after logout...');
        const postLogoutResponse = await makeRequest('/api/auth/verify', {
            method: 'GET',
            headers: {
                'Cookie': authCookie
            }
        });

        recordTest('Token Invalidation After Logout', postLogoutResponse.status === 401);

        // Test 8: Test rate limiting
        console.log('\n8. Testing rate limiting...');
        const rateLimitPromises = [];
        for (let i = 0; i < 6; i++) {
            rateLimitPromises.push(
                makeRequest('/api/auth/login', {
                    method: 'POST',
                    body: {
                        email: 'test@example.com',
                        password: 'wrongpassword'
                    }
                })
            );
        }

        const rateLimitResponses = await Promise.all(rateLimitPromises);
        const lastResponse = rateLimitResponses[5];

        recordTest('Rate Limiting', lastResponse.status === 429);

        // Test 9: Test security headers
        console.log('\n9. Testing security headers...');
        const headersResponse = await makeRequest('/login');

        const hasSecurityHeaders = [
            'x-content-type-options',
            'x-frame-options',
            'x-xss-protection'
        ].some(header => headersResponse.headers[header]);

        recordTest('Security Headers', hasSecurityHeaders);

        // Test 10: Test cookie security attributes
        console.log('\n10. Testing cookie security attributes...');
        const cookieAttributes = authCookie.toLowerCase();
        const hasHttpOnly = cookieAttributes.includes('httponly');
        const hasSecure = cookieAttributes.includes('secure') || process.env.NODE_ENV !== 'production';
        const hasSameSite = cookieAttributes.includes('samesite');

        recordTest('Cookie Security Attributes',
            hasHttpOnly && hasSecure && hasSameSite,
            `HttpOnly: ${hasHttpOnly}, Secure: ${hasSecure}, SameSite: ${hasSameSite}`
        );

    } catch (error) {
        console.log(`❌ Test suite error: ${error.message}`);
        testResults.failed++;
        testResults.total++;
    }

    // Print results
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.failed === 0) {
        console.log('\n🎉 All JWT authentication tests passed!');
        console.log('Your authentication system is secure and working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the implementation.');
    }

    return testResults;
}

// Run the tests
if (require.main === module) {
    testJWTAuthentication().catch(error => {
        console.log(`Fatal error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { testJWTAuthentication };
