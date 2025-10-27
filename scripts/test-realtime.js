#!/usr/bin/env node

/**
 * Real-time Notification Test Script
 * 
 * Command-line script for testing the real-time notification system.
 * Can be used for automated testing and health checks.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ===== CONFIGURATION =====

const CONFIG = {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    testUserId: process.env.TEST_USER_ID || null,
    timeout: 10000
};

// ===== TEST FUNCTIONS =====

async function authenticateAdmin() {
    try {
        console.log('🔐 Authenticating admin user...');

        const response = await axios.post(`${CONFIG.baseUrl}/api/auth/login`, {
            email: CONFIG.adminEmail,
            password: CONFIG.adminPassword
        });

        if (response.data.success) {
            console.log('✅ Admin authentication successful');
            return response.data.token;
        } else {
            throw new Error('Authentication failed');
        }
    } catch (error) {
        console.error('❌ Admin authentication failed:', error.message);
        throw error;
    }
}

async function testSocketConnection(token) {
    try {
        console.log('🔌 Testing Socket.io connection...');

        const response = await axios.get(`${CONFIG.baseUrl}/api/socket`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: CONFIG.timeout
        });

        if (response.data.success) {
            console.log('✅ Socket.io connection test successful');
            return response.data;
        } else {
            throw new Error('Socket connection test failed');
        }
    } catch (error) {
        console.error('❌ Socket connection test failed:', error.message);
        throw error;
    }
}

async function testNotificationAPI(token) {
    try {
        console.log('📨 Testing notification API...');

        const response = await axios.get(`${CONFIG.baseUrl}/api/realtime/notifications`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: CONFIG.timeout
        });

        if (response.data.success) {
            console.log('✅ Notification API test successful');
            return response.data;
        } else {
            throw new Error('Notification API test failed');
        }
    } catch (error) {
        console.error('❌ Notification API test failed:', error.message);
        throw error;
    }
}

async function testWebPushAPI(token) {
    try {
        console.log('📱 Testing Web Push API...');

        const response = await axios.get(`${CONFIG.baseUrl}/api/realtime/notifications/vapid-key`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: CONFIG.timeout
        });

        if (response.data.success) {
            console.log('✅ Web Push API test successful');
            return response.data;
        } else {
            throw new Error('Web Push API test failed');
        }
    } catch (error) {
        console.error('❌ Web Push API test failed:', error.message);
        throw error;
    }
}

async function testRealtimeAPI(token) {
    try {
        console.log('⚡ Testing real-time API...');

        const response = await axios.get(`${CONFIG.baseUrl}/api/realtime/test?action=status`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: CONFIG.timeout
        });

        if (response.data.success) {
            console.log('✅ Real-time API test successful');
            return response.data;
        } else {
            throw new Error('Real-time API test failed');
        }
    } catch (error) {
        console.error('❌ Real-time API test failed:', error.message);
        throw error;
    }
}

async function testNotificationCreation(token, targetUserId) {
    if (!targetUserId) {
        console.log('⚠️  Skipping notification creation test - no target user ID provided');
        return null;
    }

    try {
        console.log('📝 Testing notification creation...');

        const response = await axios.post(`${CONFIG.baseUrl}/api/realtime/test`, {
            action: 'test_notification',
            targetUsers: [targetUserId],
            message: 'Test notification from automated script'
        }, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: CONFIG.timeout
        });

        if (response.data.success) {
            console.log('✅ Notification creation test successful');
            return response.data;
        } else {
            throw new Error('Notification creation test failed');
        }
    } catch (error) {
        console.error('❌ Notification creation test failed:', error.message);
        throw error;
    }
}

async function testBroadcast(token) {
    try {
        console.log('📢 Testing broadcast functionality...');

        const response = await axios.post(`${CONFIG.baseUrl}/api/realtime/test`, {
            action: 'broadcast',
            message: 'Test broadcast from automated script'
        }, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: CONFIG.timeout
        });

        if (response.data.success) {
            console.log('✅ Broadcast test successful');
            return response.data;
        } else {
            throw new Error('Broadcast test failed');
        }
    } catch (error) {
        console.error('❌ Broadcast test failed:', error.message);
        throw error;
    }
}

async function runHealthCheck(token) {
    try {
        console.log('🏥 Running system health check...');

        const response = await axios.get(`${CONFIG.baseUrl}/api/realtime/test?action=status`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: CONFIG.timeout
        });

        if (response.data.success) {
            console.log('✅ Health check completed');
            return response.data;
        } else {
            throw new Error('Health check failed');
        }
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        throw error;
    }
}

// ===== MAIN EXECUTION =====

async function runTests() {
    const startTime = Date.now();
    const results = {
        timestamp: new Date().toISOString(),
        tests: {},
        summary: {
            total: 0,
            passed: 0,
            failed: 0,
            duration: 0
        }
    };

    try {
        console.log('🚀 Starting Real-time Notification System Tests');
        console.log('='.repeat(60));

        // Authenticate
        const token = await authenticateAdmin();
        results.tests.authentication = { success: true };

        // Run tests
        const testFunctions = [
            { name: 'socket', fn: () => testSocketConnection(token) },
            { name: 'notifications', fn: () => testNotificationAPI(token) },
            { name: 'webPush', fn: () => testWebPushAPI(token) },
            { name: 'realtime', fn: () => testRealtimeAPI(token) },
            { name: 'notificationCreation', fn: () => testNotificationCreation(token, CONFIG.testUserId) },
            { name: 'broadcast', fn: () => testBroadcast(token) },
            { name: 'healthCheck', fn: () => runHealthCheck(token) }
        ];

        for (const test of testFunctions) {
            try {
                results.tests[test.name] = await test.fn();
                results.summary.passed++;
            } catch (error) {
                results.tests[test.name] = {
                    success: false,
                    error: error.message
                };
                results.summary.failed++;
            }
            results.summary.total++;
        }

        // Calculate duration
        results.summary.duration = Date.now() - startTime;

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${results.summary.total}`);
        console.log(`Passed: ${results.summary.passed}`);
        console.log(`Failed: ${results.summary.failed}`);
        console.log(`Duration: ${results.summary.duration}ms`);
        console.log(`Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);

        // Save results
        const resultsPath = path.join(process.cwd(), 'test-results.json');
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        console.log(`\n📄 Results saved to: ${resultsPath}`);

        // Exit with appropriate code
        process.exit(results.summary.failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n💥 Test execution failed:', error.message);
        process.exit(1);
    }
}

// ===== COMMAND LINE INTERFACE =====

const command = process.argv[2];

switch (command) {
    case 'test':
        runTests();
        break;

    case 'health':
        authenticateAdmin()
            .then(token => runHealthCheck(token))
            .then(result => {
                console.log('Health Check Result:', JSON.stringify(result, null, 2));
                process.exit(0);
            })
            .catch(error => {
                console.error('Health check failed:', error.message);
                process.exit(1);
            });
        break;

    default:
        console.log('🔧 Real-time Notification Test Script');
        console.log('='.repeat(40));
        console.log('Usage:');
        console.log('  node scripts/test-realtime.js test     - Run all tests');
        console.log('  node scripts/test-realtime.js health   - Run health check only');
        console.log('');
        console.log('Environment Variables:');
        console.log('  BASE_URL          - Server URL (default: http://localhost:3000)');
        console.log('  ADMIN_EMAIL       - Admin email (default: admin@example.com)');
        console.log('  ADMIN_PASSWORD    - Admin password (default: admin123)');
        console.log('  TEST_USER_ID      - User ID for notification tests (optional)');
        console.log('');
        console.log('Examples:');
        console.log('  npm run test:realtime');
        console.log('  npm run test:realtime:health');
        break;
}
