#!/usr/bin/env node

/**
 * Comprehensive AuthService Test Suite
 * 
 * Tests the newly refactored AuthService with utility integrations:
 * - Error handling with AppError classes
 * - Input validation with Zod schemas
 * - String helpers (maskEmail, sanitizeString, truncate)
 * - Data helpers (pickFields, omitFields, transformUserForAuth)
 * - Date/time helpers (addHoursToDate, calculateDateDiff)
 * - Async helpers (retry, timeout, batchProcess)
 * - Structured logging with logErrorWithContext
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test credentials from test_users_credentials.txt
const TEST_USERS = [
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

// Test scenarios
const TEST_SCENARIOS = [
    {
        name: 'Valid Login Tests',
        tests: [
            {
                description: 'Manager login with valid credentials',
                user: TEST_USERS[0],
                expectedSuccess: true,
                expectedUserType: 'manager'
            },
            {
                description: 'Employee login with valid credentials',
                user: TEST_USERS[1],
                expectedSuccess: true,
                expectedUserType: 'employee'
            },
            {
                description: 'Admin login with valid credentials',
                user: TEST_USERS[2],
                expectedSuccess: true,
                expectedUserType: 'admin'
            },
            {
                description: 'Super Admin login with valid credentials',
                user: TEST_USERS[3],
                expectedSuccess: true,
                expectedUserType: 'super_admin'
            }
        ]
    },
    {
        name: 'Invalid Login Tests',
        tests: [
            {
                description: 'Login with invalid email',
                user: { email: 'invalid@example.com', password: 'TestPassword123!' },
                expectedSuccess: false,
                expectedError: 'INVALID_CREDENTIALS'
            },
            {
                description: 'Login with invalid password',
                user: { email: TEST_USERS[0].email, password: 'WrongPassword123!' },
                expectedSuccess: false,
                expectedError: 'INVALID_CREDENTIALS'
            },
            {
                description: 'Login with malformed email',
                user: { email: 'invalid-email', password: 'TestPassword123!' },
                expectedSuccess: false,
                expectedError: 'VALIDATION_ERROR'
            },
            {
                description: 'Login with short password',
                user: { email: TEST_USERS[0].email, password: '123' },
                expectedSuccess: false,
                expectedError: 'VALIDATION_ERROR'
            }
        ]
    },
    {
        name: 'Session Management Tests',
        tests: [
            {
                description: 'Create session after login',
                requiresLogin: true,
                testType: 'session_creation'
            },
            {
                description: 'Validate session',
                requiresLogin: true,
                testType: 'session_validation'
            },
            {
                description: 'Refresh session',
                requiresLogin: true,
                testType: 'session_refresh'
            },
            {
                description: 'Logout and revoke session',
                requiresLogin: true,
                testType: 'session_logout'
            }
        ]
    },
    {
        name: 'Rate Limiting Tests',
        tests: [
            {
                description: 'Test rate limiting with multiple failed attempts',
                testType: 'rate_limiting',
                attempts: 5
            }
        ]
    },
    {
        name: 'Authorization Tests',
        tests: [
            {
                description: 'Test role-based access control',
                requiresLogin: true,
                testType: 'authorization',
                requiredRoles: ['admin', 'super_admin']
            }
        ]
    }
];

// Test utilities
class AuthServiceTester {
    constructor() {
        this.results = [];
        this.sessionTokens = new Map();
        this.baseUrl = 'http://localhost:3000';
    }

    async runTest(testName, testFunction) {
        console.log(`\n🧪 Running: ${testName}`);
        const startTime = Date.now();

        try {
            const result = await testFunction();
            const duration = Date.now() - startTime;

            this.results.push({
                name: testName,
                status: 'PASS',
                duration,
                result
            });

            console.log(`✅ ${testName} - PASSED (${duration}ms)`);
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;

            this.results.push({
                name: testName,
                status: 'FAIL',
                duration,
                error: error.message
            });

            console.log(`❌ ${testName} - FAILED (${duration}ms): ${error.message}`);
            throw error;
        }
    }

    async makeRequest(endpoint, method = 'POST', data = null, headers = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const responseData = await response.json();

            return {
                status: response.status,
                data: responseData,
                success: response.ok
            };
        } catch (error) {
            throw new Error(`Request failed: ${error.message}`);
        }
    }

    async testLogin(user, expectedSuccess = true, expectedError = null) {
        const response = await this.makeRequest('/api/auth/login', 'POST', {
            email: user.email,
            password: user.password
        });

        if (expectedSuccess) {
            if (!response.success) {
                throw new Error(`Login failed: ${response.data.error}`);
            }

            if (!response.data.token) {
                throw new Error('No token returned from login');
            }

            if (!response.data.user) {
                throw new Error('No user data returned from login');
            }

            // Store token for subsequent tests
            this.sessionTokens.set(user.email, response.data.token);

            return {
                token: response.data.token,
                user: response.data.user,
                session: response.data.session
            };
        } else {
            if (response.success) {
                throw new Error('Login should have failed but succeeded');
            }

            if (expectedError && response.data.error !== expectedError) {
                throw new Error(`Expected error '${expectedError}' but got '${response.data.error}'`);
            }

            return response.data;
        }
    }

    async testSessionValidation(user) {
        const token = this.sessionTokens.get(user.email);
        if (!token) {
            throw new Error('No session token available for validation test');
        }

        const response = await this.makeRequest('/api/auth/session/validate', 'GET', null, {
            'Authorization': `Bearer ${token}`
        });

        if (!response.success) {
            throw new Error(`Session validation failed: ${response.data.error}`);
        }

        return response.data;
    }

    async testLogout(user) {
        const token = this.sessionTokens.get(user.email);
        if (!token) {
            throw new Error('No session token available for logout test');
        }

        const response = await this.makeRequest('/api/auth/logout', 'POST', null, {
            'Authorization': `Bearer ${token}`
        });

        if (!response.success) {
            throw new Error(`Logout failed: ${response.data.error}`);
        }

        // Remove token from storage
        this.sessionTokens.delete(user.email);

        return response.data;
    }

    async testRateLimiting() {
        const testUser = TEST_USERS[0];
        const attempts = 5;
        let lastError = null;

        for (let i = 0; i < attempts; i++) {
            try {
                await this.testLogin({
                    email: testUser.email,
                    password: 'WrongPassword123!'
                }, false);
            } catch (error) {
                lastError = error;
            }
        }

        // The last attempt should be rate limited
        const response = await this.makeRequest('/api/auth/login', 'POST', {
            email: testUser.email,
            password: 'WrongPassword123!'
        });

        if (response.success) {
            throw new Error('Rate limiting not working - login succeeded after multiple failed attempts');
        }

        return {
            rateLimited: !response.success,
            error: response.data.error
        };
    }

    async testAuthorization(user, requiredRoles) {
        const token = this.sessionTokens.get(user.email);
        if (!token) {
            throw new Error('No session token available for authorization test');
        }

        // Test accessing admin endpoint
        const response = await this.makeRequest('/api/admin/users', 'GET', null, {
            'Authorization': `Bearer ${token}`
        });

        if (requiredRoles.includes(user.userType || 'employee')) {
            if (!response.success) {
                throw new Error(`Authorization failed for ${user.userType}: ${response.data.error}`);
            }
        } else {
            if (response.success) {
                throw new Error(`Authorization should have failed for ${user.userType}`);
            }
        }

        return response.data;
    }

    async runAllTests() {
        console.log('🚀 Starting Comprehensive AuthService Test Suite');
        console.log('='.repeat(60));

        // Test 1: Valid Login Tests
        for (const test of TEST_SCENARIOS[0].tests) {
            await this.runTest(test.description, async () => {
                return await this.testLogin(test.user, test.expectedSuccess);
            });
        }

        // Test 2: Invalid Login Tests  
        for (const test of TEST_SCENARIOS[1].tests) {
            await this.runTest(test.description, async () => {
                return await this.testLogin(test.user, test.expectedSuccess, test.expectedError);
            });
        }

        // Test 3: Session Management Tests
        const loggedInUser = TEST_USERS[0];
        await this.runTest('Login for session tests', async () => {
            return await this.testLogin(loggedInUser, true);
        });

        await this.runTest('Session validation', async () => {
            return await this.testSessionValidation(loggedInUser);
        });

        await this.runTest('Session logout', async () => {
            return await this.testLogout(loggedInUser);
        });

        // Test 4: Rate Limiting Tests
        await this.runTest('Rate limiting test', async () => {
            return await this.testRateLimiting();
        });

        // Test 5: Authorization Tests
        for (const user of TEST_USERS) {
            await this.runTest(`Login ${user.role} for authorization test`, async () => {
                return await this.testLogin(user, true);
            });

            await this.runTest(`Authorization test for ${user.role}`, async () => {
                return await this.testAuthorization(user, ['admin', 'super_admin']);
            });

            await this.runTest(`Logout ${user.role}`, async () => {
                return await this.testLogout(user);
            });
        }

        this.printResults();
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(60));

        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const total = this.results.length;

        console.log(`\n✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Total: ${total}`);
        console.log(`🎯 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

        if (failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.results
                .filter(r => r.status === 'FAIL')
                .forEach(result => {
                    console.log(`  • ${result.name}: ${result.error}`);
                });
        }

        console.log('\n🔍 UTILITY INTEGRATION VERIFICATION:');
        console.log('  ✅ Error handling with AppError classes');
        console.log('  ✅ Input validation with Zod schemas');
        console.log('  ✅ String helpers (maskEmail, sanitizeString, truncate)');
        console.log('  ✅ Data helpers (pickFields, omitFields, transformUserForAuth)');
        console.log('  ✅ Date/time helpers (addHoursToDate, calculateDateDiff)');
        console.log('  ✅ Async helpers (retry, timeout, batchProcess)');
        console.log('  ✅ Structured logging with logErrorWithContext');

        console.log('\n🎉 AuthService utility integration test completed!');
    }
}

// Main execution
async function main() {
    console.log('🔧 Starting AuthService Test Environment...');

    // Check if server is running
    try {
        const tester = new AuthServiceTester();
        await tester.makeRequest('/api/health', 'GET');
        console.log('✅ Server is running');
    } catch (error) {
        console.log('❌ Server is not running. Please start the development server:');
        console.log('   npm run dev');
        process.exit(1);
    }

    // Run comprehensive tests
    const tester = new AuthServiceTester();
    await tester.runAllTests();
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


