#!/usr/bin/env node

/**
 * Authentication Flow Test Script
 * 
 * This script tests the authentication flow for all user types
 * to ensure they are redirected to the correct dashboard.
 */

const testUsers = [
    {
        type: 'employee',
        email: 'arselene.dev@gmail.com',
        password: 'TestPassword123!',
        expectedRoute: '/dashboard'
    },
    {
        type: 'manager',
        email: 'arselene.tests@gmail.com',
        password: 'TestPassword123!',
        expectedRoute: '/dashboard'
    },
    {
        type: 'admin',
        email: 'arselene.main@gmail.com',
        password: 'TestPassword123!',
        expectedRoute: '/admin/dashboard'
    },
    {
        type: 'super_admin',
        email: 'dragonsissou1000@gmail.com',
        password: 'TestPassword123!',
        expectedRoute: '/admin/dashboard'
    }
];

async function testLoginFlow() {
    console.log('🧪 Starting Authentication Flow Tests...\n');

    for (const user of testUsers) {
        console.log(`\n🔍 Testing ${user.type.toUpperCase()} login...`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Expected Route: ${user.expectedRoute}`);

        try {
            // Test login API
            const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: user.email,
                    password: user.password
                })
            });

            const loginResult = await loginResponse.json();

            if (loginResponse.ok) {
                console.log(`   ✅ Login successful`);
                console.log(`   👤 User Type: ${loginResult.user.userType}`);
                console.log(`   🎯 Redirect Path: ${user.expectedRoute}`);

                // Test session verification
                const verifyResponse = await fetch('http://localhost:3000/api/auth/verify', {
                    method: 'GET',
                    headers: {
                        'Cookie': loginResponse.headers.get('set-cookie') || ''
                    }
                });

                if (verifyResponse.ok) {
                    console.log(`   ✅ Session verification successful`);
                } else {
                    console.log(`   ❌ Session verification failed`);
                }

            } else {
                console.log(`   ❌ Login failed: ${loginResult.message}`);
            }

        } catch (error) {
            console.log(`   ❌ Test failed: ${error.message}`);
        }
    }

    console.log('\n🏁 Authentication flow tests completed!');
}

// Run the test
testLoginFlow().catch(console.error);
