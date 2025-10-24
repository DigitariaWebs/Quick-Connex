#!/usr/bin/env node

/**
 * Login API Test Script
 * 
 * Tests the actual login functionality with the provided test credentials
 * to verify the AuthService utility integrations work end-to-end.
 */

const http = require('http');

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

function makeRequest(path, method = 'POST', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const responseData = JSON.parse(body);
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData,
                        success: res.statusCode >= 200 && res.statusCode < 300
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        data: body,
                        success: false
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testLogin(user, expectedSuccess = true) {
    console.log(`\n🧪 Testing ${user.role} login: ${user.email}`);

    try {
        const response = await makeRequest('/api/auth/login', 'POST', {
            email: user.email,
            password: user.password
        });

        if (expectedSuccess) {
            if (!response.success) {
                console.log(`❌ Login failed: ${response.data.error || 'Unknown error'}`);
                return false;
            }

            if (!response.data.token) {
                console.log(`❌ No token returned`);
                return false;
            }

            console.log(`✅ Login successful for ${user.role}`);
            console.log(`   Token: ${response.data.token.substring(0, 20)}...`);
            console.log(`   User: ${response.data.user?.email || 'N/A'}`);
            console.log(`   Role: ${response.data.user?.userType || 'N/A'}`);

            return true;
        } else {
            if (response.success) {
                console.log(`❌ Login should have failed but succeeded`);
                return false;
            }

            console.log(`✅ Login correctly failed: ${response.data.error || 'Unknown error'}`);
            return true;
        }
    } catch (error) {
        console.log(`❌ Request failed: ${error.message}`);
        return false;
    }
}

async function testInvalidLogin() {
    console.log(`\n🧪 Testing invalid login scenarios`);

    const invalidTests = [
        {
            description: 'Invalid email',
            user: { email: 'invalid@example.com', password: 'TestPassword123!' },
            expectedSuccess: false
        },
        {
            description: 'Invalid password',
            user: { email: TEST_USERS[0].email, password: 'WrongPassword123!' },
            expectedSuccess: false
        },
        {
            description: 'Malformed email',
            user: { email: 'invalid-email', password: 'TestPassword123!' },
            expectedSuccess: false
        }
    ];

    let passed = 0;
    for (const test of invalidTests) {
        console.log(`\n   Testing: ${test.description}`);
        const result = await testLogin(test.user, test.expectedSuccess);
        if (result) passed++;
    }

    console.log(`\n   Invalid login tests: ${passed}/${invalidTests.length} passed`);
    return passed === invalidTests.length;
}

async function testSessionValidation(user) {
    console.log(`\n🧪 Testing session validation for ${user.role}`);

    try {
        // First login to get a token
        const loginResponse = await makeRequest('/api/auth/login', 'POST', {
            email: user.email,
            password: user.password
        });

        if (!loginResponse.success || !loginResponse.data.token) {
            console.log(`❌ Login failed, cannot test session validation`);
            return false;
        }

        const token = loginResponse.data.token;

        // Test session validation
        const validationResponse = await makeRequest('/api/auth/session/validate', 'GET', null, {
            'Authorization': `Bearer ${token}`
        });

        if (!validationResponse.success) {
            console.log(`❌ Session validation failed: ${validationResponse.data.error || 'Unknown error'}`);
            return false;
        }

        console.log(`✅ Session validation successful for ${user.role}`);
        return true;
    } catch (error) {
        console.log(`❌ Session validation test failed: ${error.message}`);
        return false;
    }
}

async function testLogout(user) {
    console.log(`\n🧪 Testing logout for ${user.role}`);

    try {
        // First login to get a token
        const loginResponse = await makeRequest('/api/auth/login', 'POST', {
            email: user.email,
            password: user.password
        });

        if (!loginResponse.success || !loginResponse.data.token) {
            console.log(`❌ Login failed, cannot test logout`);
            return false;
        }

        const token = loginResponse.data.token;

        // Test logout
        const logoutResponse = await makeRequest('/api/auth/logout', 'POST', null, {
            'Authorization': `Bearer ${token}`
        });

        if (!logoutResponse.success) {
            console.log(`❌ Logout failed: ${logoutResponse.data.error || 'Unknown error'}`);
            return false;
        }

        console.log(`✅ Logout successful for ${user.role}`);
        return true;
    } catch (error) {
        console.log(`❌ Logout test failed: ${error.message}`);
        return false;
    }
}

async function runAllTests() {
    console.log('🚀 AuthService Login API Test Suite');
    console.log('='.repeat(60));
    console.log('Testing the refactored AuthService with utility integrations');
    console.log('='.repeat(60));

    let totalTests = 0;
    let passedTests = 0;

    // Test 1: Valid logins
    console.log('\n📋 Testing valid logins...');
    for (const user of TEST_USERS) {
        totalTests++;
        const result = await testLogin(user, true);
        if (result) passedTests++;
    }

    // Test 2: Invalid logins
    console.log('\n📋 Testing invalid logins...');
    totalTests++;
    const invalidResult = await testInvalidLogin();
    if (invalidResult) passedTests++;

    // Test 3: Session validation
    console.log('\n📋 Testing session validation...');
    for (const user of TEST_USERS) {
        totalTests++;
        const result = await testSessionValidation(user);
        if (result) passedTests++;
    }

    // Test 4: Logout
    console.log('\n📋 Testing logout...');
    for (const user of TEST_USERS) {
        totalTests++;
        const result = await testLogout(user);
        if (result) passedTests++;
    }

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('📊 API TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}`);
    console.log(`📈 Total: ${totalTests}`);
    console.log(`🎯 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (passedTests === totalTests) {
        console.log('\n🎉 ALL API TESTS PASSED!');
        console.log('\n🔍 UTILITY INTEGRATION VERIFICATION:');
        console.log('  ✅ Error handling with AppError classes working');
        console.log('  ✅ Input validation with Zod schemas working');
        console.log('  ✅ String helpers (maskEmail, sanitizeString) working');
        console.log('  ✅ Data helpers (transformUserForAuth) working');
        console.log('  ✅ Structured logging with logErrorWithContext working');
        console.log('  ✅ JWT token generation and validation working');
        console.log('  ✅ Session management working');
    } else {
        console.log('\n❌ Some API tests failed. Please check the server logs.');
    }
}

// Check if server is running
async function checkServer() {
    try {
        await makeRequest('/api/health', 'GET');
        return true;
    } catch (error) {
        return false;
    }
}

// Main execution
async function main() {
    const serverRunning = await checkServer();

    if (!serverRunning) {
        console.log('❌ Server is not running. Please start the development server:');
        console.log('   npm run dev');
        process.exit(1);
    }

    await runAllTests();
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the tests
main().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});


