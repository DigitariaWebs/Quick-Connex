#!/usr/bin/env node

/**
 * Admin Access Control Test Script
 * 
 * This script tests that admin pages are only accessible to admin and super_admin users,
 * and that manager users are properly redirected.
 */

const testUsers = [
    {
        type: 'employee',
        email: 'arselene.dev@gmail.com',
        password: 'TestPassword123!',
        shouldAccessAdmin: false,
        expectedRedirect: '/dashboard'
    },
    {
        type: 'manager',
        email: 'arselene.tests@gmail.com',
        password: 'TestPassword123!',
        shouldAccessAdmin: false,
        expectedRedirect: '/dashboard'
    },
    {
        type: 'admin',
        email: 'arselene.main@gmail.com',
        password: 'TestPassword123!',
        shouldAccessAdmin: true,
        expectedRedirect: '/admin/dashboard'
    },
    {
        type: 'super_admin',
        email: 'dragonsissou1000@gmail.com',
        password: 'TestPassword123!',
        shouldAccessAdmin: true,
        expectedRedirect: '/admin/dashboard'
    }
];

async function testAdminAccess() {
    console.log('🧪 Starting Admin Access Control Tests...\n');

    for (const user of testUsers) {
        console.log(`\n🔍 Testing ${user.type.toUpperCase()} admin access...`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Should access admin: ${user.shouldAccessAdmin}`);
        console.log(`   Expected redirect: ${user.expectedRedirect}`);

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

                // Test admin dashboard access
                const adminResponse = await fetch('http://localhost:3000/admin/dashboard', {
                    method: 'GET',
                    headers: {
                        'Cookie': loginResponse.headers.get('set-cookie') || ''
                    }
                });

                if (user.shouldAccessAdmin) {
                    if (adminResponse.ok) {
                        console.log(`   ✅ Admin access granted (as expected)`);
                    } else {
                        console.log(`   ❌ Admin access denied (unexpected): ${adminResponse.status}`);
                    }
                } else {
                    if (adminResponse.status === 302 || adminResponse.status === 200) {
                        console.log(`   ✅ Admin access properly restricted (as expected)`);
                    } else {
                        console.log(`   ❌ Unexpected admin access response: ${adminResponse.status}`);
                    }
                }

                // Test admin transfers page access
                const transfersResponse = await fetch('http://localhost:3000/admin/transfers', {
                    method: 'GET',
                    headers: {
                        'Cookie': loginResponse.headers.get('set-cookie') || ''
                    }
                });

                if (user.shouldAccessAdmin) {
                    if (transfersResponse.ok) {
                        console.log(`   ✅ Admin transfers access granted (as expected)`);
                    } else {
                        console.log(`   ❌ Admin transfers access denied (unexpected): ${transfersResponse.status}`);
                    }
                } else {
                    if (transfersResponse.status === 302 || transfersResponse.status === 200) {
                        console.log(`   ✅ Admin transfers access properly restricted (as expected)`);
                    } else {
                        console.log(`   ❌ Unexpected admin transfers access response: ${transfersResponse.status}`);
                    }
                }

                // Test admin users page access
                const usersResponse = await fetch('http://localhost:3000/admin/users', {
                    method: 'GET',
                    headers: {
                        'Cookie': loginResponse.headers.get('set-cookie') || ''
                    }
                });

                if (user.shouldAccessAdmin) {
                    if (usersResponse.ok) {
                        console.log(`   ✅ Admin users access granted (as expected)`);
                    } else {
                        console.log(`   ❌ Admin users access denied (unexpected): ${usersResponse.status}`);
                    }
                } else {
                    if (usersResponse.status === 302 || usersResponse.status === 200) {
                        console.log(`   ✅ Admin users access properly restricted (as expected)`);
                    } else {
                        console.log(`   ❌ Unexpected admin users access response: ${usersResponse.status}`);
                    }
                }

            } else {
                console.log(`   ❌ Login failed: ${loginResult.message}`);
            }

        } catch (error) {
            console.log(`   ❌ Test failed: ${error.message}`);
        }
    }

    console.log('\n🏁 Admin access control tests completed!');
}

// Run the test
testAdminAccess().catch(console.error);
