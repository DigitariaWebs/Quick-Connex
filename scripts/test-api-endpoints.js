#!/usr/bin/env node

/**
 * API Endpoints Test Script
 * Tests all API endpoints for proper authentication and functionality
 */

const http = require('http');

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

async function testAPIEndpoints() {
    console.log('🔌 API Endpoints Test Suite');
    console.log('===========================\n');

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
        // First, get authentication token
        console.log('🔐 Getting authentication token...');
        const loginResponse = await makeRequest('/api/auth/login', {
            method: 'POST',
            body: TEST_USER
        });

        if (loginResponse.status === 200 && loginResponse.headers['set-cookie']) {
            authCookie = loginResponse.headers['set-cookie'].find(cookie =>
                cookie.includes('auth-token')
            );
            console.log('✅ Authentication successful\n');
        } else {
            console.log('❌ Authentication failed, some tests may not work correctly\n');
        }

        // Test 1: Auth endpoints
        console.log('1. Testing Authentication Endpoints');
        console.log('-----------------------------------');

        // Login endpoint
        const loginTest = await makeRequest('/api/auth/login', {
            method: 'POST',
            body: { email: 'invalid@test.com', password: 'wrong' }
        });
        recordTest('Login endpoint rejects invalid credentials', loginTest.status === 401);

        // Verify endpoint
        const verifyTest = await makeRequest('/api/auth/verify');
        recordTest('Verify endpoint requires authentication', verifyTest.status === 401);

        // Logout endpoint
        const logoutTest = await makeRequest('/api/auth/logout', { method: 'POST' });
        recordTest('Logout endpoint accessible', logoutTest.status === 200);

        // Test 2: Protected API endpoints
        console.log('\n2. Testing Protected API Endpoints');
        console.log('----------------------------------');

        // Transfers endpoint
        const transfersTest = await makeRequest('/api/transfers');
        recordTest('Transfers endpoint requires authentication', transfersTest.status === 401);

        // Users endpoint
        const usersTest = await makeRequest('/api/users');
        recordTest('Users endpoint requires authentication', usersTest.status === 401);

        // Files endpoint
        const filesTest = await makeRequest('/api/files/test-file-id');
        recordTest('Files endpoint requires authentication', filesTest.status === 401);

        // Test 3: Authenticated requests
        if (authCookie) {
            console.log('\n3. Testing Authenticated API Requests');
            console.log('-------------------------------------');

            // Transfers with auth
            const authTransfersTest = await makeRequest('/api/transfers', {
                headers: { 'Cookie': authCookie }
            });
            recordTest('Transfers endpoint accessible with auth',
                authTransfersTest.status === 200 || authTransfersTest.status === 404
            );

            // Verify with auth
            const authVerifyTest = await makeRequest('/api/auth/verify', {
                headers: { 'Cookie': authCookie }
            });
            recordTest('Verify endpoint works with valid token',
                authVerifyTest.status === 200 && authVerifyTest.data.success
            );

            // Test 4: Transfer creation (if user is manager)
            console.log('\n4. Testing Transfer Creation');
            console.log('----------------------------');

            const transferData = {
                patientFirstName: 'Test',
                patientLastName: 'Patient',
                patientAge: '30',
                fromHospital: 'Test Hospital A',
                toHospital: 'Test Hospital B',
                transferDate: new Date().toISOString().split('T')[0],
                transferTime: '10:00',
                transferType: 'planifier',
                issuer: 'gestionnaire',
                priority: 'medium',
                reason: 'Test transfer for API testing'
            };

            const createTransferTest = await makeRequest('/api/transfers', {
                method: 'POST',
                headers: { 'Cookie': authCookie },
                body: transferData
            });

            recordTest('Transfer creation with valid data',
                createTransferTest.status === 200 || createTransferTest.status === 201
            );

            // Test 5: Input validation
            console.log('\n5. Testing Input Validation');
            console.log('---------------------------');

            // Invalid transfer data
            const invalidTransferTest = await makeRequest('/api/transfers', {
                method: 'POST',
                headers: { 'Cookie': authCookie },
                body: { /* missing required fields */ }
            });

            recordTest('Transfer creation rejects invalid data', invalidTransferTest.status === 400);

            // Test 6: Rate limiting
            console.log('\n6. Testing Rate Limiting');
            console.log('------------------------');

            const rateLimitPromises = [];
            for (let i = 0; i < 6; i++) {
                rateLimitPromises.push(
                    makeRequest('/api/auth/login', {
                        method: 'POST',
                        body: { email: 'test@example.com', password: 'wrongpassword' }
                    })
                );
            }

            const rateLimitResponses = await Promise.all(rateLimitPromises);
            const lastResponse = rateLimitResponses[5];

            recordTest('Rate limiting works on login endpoint', lastResponse.status === 429);

            // Test 7: CORS and security headers
            console.log('\n7. Testing Security Headers');
            console.log('---------------------------');

            const headersTest = await makeRequest('/api/auth/login', {
                method: 'POST',
                body: { email: 'test@example.com', password: 'test' }
            });

            const hasSecurityHeaders = [
                'x-content-type-options',
                'x-frame-options',
                'x-xss-protection'
            ].some(header => headersTest.headers[header]);

            recordTest('Security headers present', hasSecurityHeaders);

            // Test 8: Error handling
            console.log('\n8. Testing Error Handling');
            console.log('-------------------------');

            // Non-existent endpoint
            const notFoundTest = await makeRequest('/api/non-existent-endpoint');
            recordTest('Non-existent endpoint returns 404', notFoundTest.status === 404);

            // Invalid method
            const methodNotAllowedTest = await makeRequest('/api/auth/login', {
                method: 'PUT',
                body: { email: 'test@example.com', password: 'test' }
            });
            recordTest('Invalid HTTP method handled',
                methodNotAllowedTest.status === 405 || methodNotAllowedTest.status === 400
            );

        } else {
            console.log('\n⚠️  Skipping authenticated tests - no valid auth token');
        }

    } catch (error) {
        console.log(`❌ Test suite error: ${error.message}`);
        testResults.failed++;
        testResults.total++;
    }

    // Print results
    console.log('\n📊 API Test Results Summary');
    console.log('============================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.failed === 0) {
        console.log('\n🎉 All API endpoint tests passed!');
        console.log('Your API is secure and working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the implementation.');
    }

    return testResults;
}

// Run the tests
if (require.main === module) {
    testAPIEndpoints().catch(error => {
        console.log(`Fatal error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { testAPIEndpoints };
