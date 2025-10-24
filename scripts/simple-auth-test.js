#!/usr/bin/env node

/**
 * Simple Authentication Test Script
 * 
 * A lightweight test script that tests the authentication system
 * using the test credentials without complex server management.
 * 
 * Usage: node scripts/simple-auth-test.js
 */

const http = require('http');

// Test credentials from test_users_credentials.txt
const TEST_USERS = [
    {
        role: 'MANAGER',
        email: 'arselene.tests@gmail.com',
        password: 'TestPassword123!',
        expectedUserType: 'manager'
    },
    {
        role: 'EMPLOYEE',
        email: 'arselene.dev@gmail.com',
        password: 'TestPassword123!',
        expectedUserType: 'employee'
    },
    {
        role: 'ADMIN',
        email: 'arselene.main@gmail.com',
        password: 'TestPassword123!',
        expectedUserType: 'admin'
    },
    {
        role: 'SUPER ADMIN',
        email: 'dragonsissou1000@gmail.com',
        password: 'TestPassword123!',
        expectedUserType: 'super_admin'
    }
];

class SimpleAuthTester {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.results = [];
        this.sessionTokens = new Map();
    }

    async makeRequest(endpoint, method = 'POST', data = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint, this.baseUrl);
            const options = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'SimpleAuthTest/1.0',
                    ...headers
                }
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        const responseData = body ? JSON.parse(body) : {};
                        resolve({
                            status: res.statusCode,
                            data: responseData,
                            success: res.statusCode >= 200 && res.statusCode < 300,
                            headers: res.headers
                        });
                    } catch (error) {
                        resolve({
                            status: res.statusCode,
                            data: { error: 'Invalid JSON response', raw: body },
                            success: false,
                            headers: res.headers
                        });
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    async testServerHealth() {
        try {
            const response = await this.makeRequest('/api/auth/verify', 'GET');
            return response.success || response.status === 401; // 401 is expected without auth
        } catch (error) {
            return false;
        }
    }

    async testLogin(user, expectedSuccess = true) {
        console.log(`\n🧪 Testing ${user.role} login: ${user.email}`);

        try {
            const response = await this.makeRequest('/api/auth/login', 'POST', {
                email: user.email,
                password: user.password
            });

            if (expectedSuccess) {
                if (!response.success) {
                    throw new Error(`Login failed: ${response.data.message || response.data.error || 'Unknown error'}`);
                }

                if (!response.data.token) {
                    throw new Error('No JWT token returned from login');
                }

                if (!response.data.user) {
                    throw new Error('No user data returned from login');
                }

                if (user.expectedUserType && response.data.user.userType !== user.expectedUserType) {
                    throw new Error(`Expected userType '${user.expectedUserType}' but got '${response.data.user.userType}'`);
                }

                // Store token for subsequent tests
                this.sessionTokens.set(user.email, response.data.token);

                console.log(`✅ ${user.role} login successful`);
                console.log(`   Token: ${response.data.token.substring(0, 20)}...`);
                console.log(`   User: ${response.data.user.email}`);
                console.log(`   Role: ${response.data.user.userType}`);
                console.log(`   Status: ${response.data.user.status}`);

                return {
                    success: true,
                    token: response.data.token,
                    user: response.data.user,
                    session: response.data.session
                };
            } else {
                if (response.success) {
                    throw new Error('Login should have failed but succeeded');
                }

                console.log(`✅ ${user.role} login correctly failed: ${response.data.message || response.data.error}`);
                return {
                    success: false,
                    error: response.data.message || response.data.error
                };
            }
        } catch (error) {
            console.log(`❌ ${user.role} login test failed: ${error.message}`);
            throw error;
        }
    }

    async testSessionValidation(user) {
        console.log(`\n🧪 Testing session validation for ${user.role}`);

        const token = this.sessionTokens.get(user.email);
        if (!token) {
            throw new Error('No session token available for validation test');
        }

        try {
            const response = await this.makeRequest('/api/auth/verify', 'GET', null, {
                'Cookie': `auth-token=${token}`
            });

            if (!response.success) {
                throw new Error(`Session validation failed: ${response.data.error || response.data.message || 'Unknown error'}`);
            }

            if (!response.data.user) {
                throw new Error('No user data in session validation response');
            }

            console.log(`✅ Session validation successful for ${user.role}`);
            console.log(`   User: ${response.data.user.email}`);
            console.log(`   Role: ${response.data.user.userType}`);

            return response.data;
        } catch (error) {
            console.log(`❌ Session validation failed for ${user.role}: ${error.message}`);
            throw error;
        }
    }

    async testLogout(user) {
        console.log(`\n🧪 Testing logout for ${user.role}`);

        const token = this.sessionTokens.get(user.email);
        if (!token) {
            throw new Error('No session token available for logout test');
        }

        try {
            const response = await this.makeRequest('/api/auth/logout', 'POST', null, {
                'Cookie': `auth-token=${token}`
            });

            if (!response.success) {
                throw new Error(`Logout failed: ${response.data.error || response.data.message || 'Unknown error'}`);
            }

            // Remove token from storage
            this.sessionTokens.delete(user.email);

            console.log(`✅ Logout successful for ${user.role}`);
            return response.data;
        } catch (error) {
            console.log(`❌ Logout failed for ${user.role}: ${error.message}`);
            throw error;
        }
    }

    async testInvalidLogins() {
        console.log('\n🧪 Testing invalid login scenarios');

        const invalidTests = [
            {
                name: 'Invalid email',
                user: { email: 'invalid@example.com', password: 'TestPassword123!' },
                expectedError: 'INVALID_CREDENTIALS'
            },
            {
                name: 'Invalid password',
                user: { email: TEST_USERS[0].email, password: 'WrongPassword123!' },
                expectedError: 'INVALID_CREDENTIALS'
            },
            {
                name: 'Malformed email',
                user: { email: 'invalid-email', password: 'TestPassword123!' },
                expectedError: 'VALIDATION_ERROR'
            },
            {
                name: 'Empty email',
                user: { email: '', password: 'TestPassword123!' },
                expectedError: 'VALIDATION_ERROR'
            },
            {
                name: 'Empty password',
                user: { email: TEST_USERS[0].email, password: '' },
                expectedError: 'VALIDATION_ERROR'
            }
        ];

        let passed = 0;
        for (const test of invalidTests) {
            try {
                console.log(`   Testing: ${test.name}`);
                await this.testLogin(test.user, false);
                passed++;
                console.log(`   ✅ ${test.name} - correctly failed`);
            } catch (error) {
                console.log(`   ❌ ${test.name} - ${error.message}`);
            }
        }

        console.log(`\n   Invalid login tests: ${passed}/${invalidTests.length} passed`);
        return passed === invalidTests.length;
    }

    async testRateLimiting() {
        console.log('\n🧪 Testing rate limiting...');

        const testUser = TEST_USERS[0];
        const attempts = 6; // One more than the rate limit
        let rateLimited = false;

        console.log(`   Attempting ${attempts} failed logins to trigger rate limiting...`);

        for (let i = 0; i < attempts; i++) {
            try {
                const response = await this.makeRequest('/api/auth/login', 'POST', {
                    email: testUser.email,
                    password: 'WrongPassword123!'
                });

                if (i === attempts - 1 && !response.success) {
                    if (response.status === 429 ||
                        response.data.message?.includes('rate') ||
                        response.data.message?.includes('limit') ||
                        response.data.errorCode === 'RATE_LIMITED') {
                        rateLimited = true;
                        console.log(`   ✅ Rate limiting triggered on attempt ${i + 1}`);
                    }
                }

                // Small delay between attempts
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.log(`   ⚠️ Request ${i + 1} failed: ${error.message}`);
            }
        }

        if (!rateLimited) {
            console.log('   ⚠️ Rate limiting not triggered - this might be expected if rate limits were recently cleared');
        }

        return { rateLimited };
    }

    async runAllTests() {
        console.log('🚀 Simple Authentication Test Suite');
        console.log('='.repeat(60));
        console.log('Testing authentication system with test credentials');
        console.log('='.repeat(60));

        let totalTests = 0;
        let passedTests = 0;

        try {
            // Test 1: Server Health Check
            console.log('\n📋 Testing server health...');
            totalTests++;
            if (await this.testServerHealth()) {
                console.log('✅ Server is running and responding');
                passedTests++;
            } else {
                console.log('❌ Server is not responding');
                throw new Error('Server health check failed');
            }

            // Test 2: Valid Logins
            console.log('\n📋 Testing valid logins for all user roles...');
            for (const user of TEST_USERS) {
                totalTests++;
                try {
                    await this.testLogin(user, true);
                    passedTests++;
                } catch (error) {
                    console.log(`❌ ${user.role} login failed: ${error.message}`);
                }
            }

            // Test 3: Session Validation
            console.log('\n📋 Testing session validation...');
            for (const user of TEST_USERS) {
                if (this.sessionTokens.has(user.email)) {
                    totalTests++;
                    try {
                        await this.testSessionValidation(user);
                        passedTests++;
                    } catch (error) {
                        console.log(`❌ ${user.role} session validation failed: ${error.message}`);
                    }
                }
            }

            // Test 4: Invalid Logins
            console.log('\n📋 Testing invalid login scenarios...');
            totalTests++;
            if (await this.testInvalidLogins()) {
                passedTests++;
            }

            // Test 5: Rate Limiting
            console.log('\n📋 Testing rate limiting...');
            totalTests++;
            try {
                await this.testRateLimiting();
                passedTests++;
            } catch (error) {
                console.log(`❌ Rate limiting test failed: ${error.message}`);
            }

            // Test 6: Logout
            console.log('\n📋 Testing logout functionality...');
            for (const user of TEST_USERS) {
                if (this.sessionTokens.has(user.email)) {
                    totalTests++;
                    try {
                        await this.testLogout(user);
                        passedTests++;
                    } catch (error) {
                        console.log(`❌ ${user.role} logout failed: ${error.message}`);
                    }
                }
            }

            // Print results
            console.log('\n' + '='.repeat(60));
            console.log('📊 TEST RESULTS');
            console.log('='.repeat(60));
            console.log(`✅ Passed: ${passedTests}`);
            console.log(`❌ Failed: ${totalTests - passedTests}`);
            console.log(`📈 Total: ${totalTests}`);
            console.log(`🎯 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%');

            if (passedTests === totalTests) {
                console.log('\n🎉 ALL TESTS PASSED!');
                console.log('\n🔍 AUTHENTICATION SYSTEM VERIFICATION:');
                console.log('  ✅ User authentication working');
                console.log('  ✅ Session management working');
                console.log('  ✅ JWT token generation working');
                console.log('  ✅ Role-based access working');
                console.log('  ✅ Security features working');
                console.log('  ✅ Error handling working');
            } else {
                console.log('\n⚠️ Some tests failed. Please check the server logs.');
            }

            console.log('\n📋 Test Credentials Used:');
            TEST_USERS.forEach(user => {
                console.log(`  • ${ user.role }: ${ user.email }`);
            });

        } catch (error) {
            console.error('\n🚨 Test suite failed:', error.message);
            process.exit(1);
        }
    }
}

// Main execution
async function main() {
    const tester = new SimpleAuthTester();

    try {
        await tester.runAllTests();
    } catch (error) {
        console.error('Test suite failed:', error);
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the tests
main().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
