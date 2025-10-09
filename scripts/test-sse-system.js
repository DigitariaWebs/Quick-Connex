#!/usr/bin/env node

/**
 * Comprehensive SSE System Testing Script
 * 
 * This script tests the global SSE system by:
 * 1. Creating test users and authenticating them
 * 2. Establishing SSE connections
 * 3. Triggering various notification types
 * 4. Testing notification broadcasting to connected users
 * 5. Testing reconnection and error handling
 * 
 * Usage: node scripts/test-sse-system.js [options]
 * 
 * Options:
 *   --test-type <type>     Type of test to run (all, connection, notifications, reconnection, multi-user)
 *   --users <count>        Number of test users to create (default: 3)
 *   --duration <seconds>   Test duration in seconds (default: 60)
 *   --verbose              Enable verbose logging
 */

const mongoose = require('mongoose');
const fetch = require('node-fetch');
const EventSource = require('eventsource');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    testType: 'all',
    userCount: 3,
    duration: 60,
    verbose: false
};

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--test-type':
            options.testType = args[++i];
            break;
        case '--users':
            options.userCount = parseInt(args[++i]);
            break;
        case '--duration':
            options.duration = parseInt(args[++i]);
            break;
        case '--verbose':
            options.verbose = true;
            break;
    }
}

// Test user schema
const testUserSchema = new mongoose.Schema({
    userType: { type: String, required: true, enum: ['employee', 'manager', 'admin'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    isTestUser: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const TestUser = mongoose.model('TestUser', testUserSchema);

class SSETestSuite {
    constructor() {
        this.testUsers = [];
        this.connections = [];
        this.testResults = {
            connectionTests: [],
            notificationTests: [],
            reconnectionTests: [],
            multiUserTests: []
        };
        this.startTime = Date.now();
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: 'ℹ️',
            success: '✅',
            error: '❌',
            warning: '⚠️',
            debug: '🔍'
        }[level] || 'ℹ️';

        if (level === 'debug' && !options.verbose) return;

        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    async initialize() {
        this.log('🚀 Initializing SSE Test Suite...');

        try {
            // Connect to database
            await mongoose.connect(MONGODB_URI);
            this.log('✅ Connected to database');

            // Clean up any existing test users
            await this.cleanupTestUsers();

            // Create test users
            await this.createTestUsers();

            this.log(`✅ Test suite initialized with ${this.testUsers.length} users`);

        } catch (error) {
            this.log(`❌ Failed to initialize test suite: ${error.message}`, 'error');
            throw error;
        }
    }

    async cleanupTestUsers() {
        this.log('🧹 Cleaning up existing test users...');
        await TestUser.deleteMany({ isTestUser: true });
        this.log('✅ Test users cleaned up');
    }

    async createTestUsers() {
        this.log(`👥 Creating ${options.userCount} test users...`);

        const userTypes = ['employee', 'manager', 'admin'];

        for (let i = 0; i < options.userCount; i++) {
            const userType = userTypes[i % userTypes.length];
            const userNumber = i + 1;

            const testUser = new TestUser({
                userType,
                firstName: `Test${userNumber}`,
                lastName: 'User',
                email: `testuser${userNumber}@sse-test.com`,
                phone: `555-000${userNumber}`,
                password: 'TestPassword123!',
                status: 'approved',
                isTestUser: true
            });

            await testUser.save();
            this.testUsers.push(testUser);

            this.log(`✅ Created test user: ${testUser.firstName} ${testUser.lastName} (${testUser.userType})`);
        }
    }

    async authenticateUser(user) {
        try {
            const response = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: user.email,
                    password: user.password
                })
            });

            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.status}`);
            }

            const data = await response.json();
            this.log(`✅ Authenticated user: ${user.firstName} ${user.lastName}`, 'success');
            return data;

        } catch (error) {
            this.log(`❌ Authentication failed for ${user.email}: ${error.message}`, 'error');
            throw error;
        }
    }

    async testSSEConnection(user) {
        return new Promise((resolve, reject) => {
            this.log(`🔗 Testing SSE connection for ${user.firstName} ${user.lastName}...`);

            const eventSource = new EventSource(`${BASE_URL}/api/notifications/sse`, {
                headers: {
                    'Cookie': `auth-token=${user._id}` // This might need adjustment based on your auth implementation
                }
            });

            const connectionTest = {
                user: user.email,
                startTime: Date.now(),
                connected: false,
                messages: [],
                errors: []
            };

            const timeout = setTimeout(() => {
                eventSource.close();
                connectionTest.endTime = Date.now();
                connectionTest.duration = connectionTest.endTime - connectionTest.startTime;
                connectionTest.success = connectionTest.connected;

                this.testResults.connectionTests.push(connectionTest);

                if (connectionTest.connected) {
                    this.log(`✅ SSE connection successful for ${user.firstName}`, 'success');
                    resolve({ eventSource, connectionTest });
                } else {
                    this.log(`❌ SSE connection failed for ${user.firstName}`, 'error');
                    reject(new Error('Connection timeout'));
                }
            }, 10000); // 10 second timeout

            eventSource.onopen = () => {
                clearTimeout(timeout);
                connectionTest.connected = true;
                connectionTest.endTime = Date.now();
                connectionTest.duration = connectionTest.endTime - connectionTest.startTime;
                connectionTest.success = true;

                this.testResults.connectionTests.push(connectionTest);
                this.log(`✅ SSE connection opened for ${user.firstName}`, 'success');
                resolve({ eventSource, connectionTest });
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    connectionTest.messages.push({
                        type: data.type,
                        timestamp: Date.now(),
                        data: data
                    });

                    this.log(`📨 Message received by ${user.firstName}: ${data.type}`, 'debug');
                } catch (error) {
                    connectionTest.errors.push({
                        type: 'parse_error',
                        message: error.message,
                        timestamp: Date.now()
                    });
                }
            };

            eventSource.onerror = (error) => {
                connectionTest.errors.push({
                    type: 'connection_error',
                    message: error.message || 'Unknown error',
                    timestamp: Date.now()
                });

                this.log(`❌ SSE error for ${user.firstName}: ${error.message || 'Unknown error'}`, 'error');
            };
        });
    }

    async testNotificationBroadcasting(connections) {
        this.log('📢 Testing notification broadcasting...');

        const notificationTests = [
            {
                type: 'test',
                name: 'Basic Test Notification',
                expectedRecipients: connections.length
            },
            {
                type: 'transfer_status',
                name: 'Transfer Status Notification',
                expectedRecipients: connections.length
            },
            {
                type: 'urgent',
                name: 'Urgent Alert Notification',
                expectedRecipients: connections.length
            }
        ];

        for (const test of notificationTests) {
            this.log(`🧪 Testing: ${test.name}`);

            const testResult = {
                type: test.type,
                name: test.name,
                startTime: Date.now(),
                sent: false,
                receivedBy: [],
                errors: []
            };

            try {
                // Send test notification
                const response = await fetch(`${BASE_URL}/api/test-notifications`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        notificationType: test.type
                    })
                });

                if (response.ok) {
                    testResult.sent = true;
                    this.log(`✅ ${test.name} sent successfully`, 'success');
                } else {
                    testResult.errors.push(`Failed to send: ${response.status}`);
                    this.log(`❌ Failed to send ${test.name}: ${response.status}`, 'error');
                }

                // Wait for messages to be received
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Check which connections received the message
                for (const { eventSource, connectionTest } of connections) {
                    const recentMessages = connectionTest.messages.filter(msg =>
                        Date.now() - msg.timestamp < 3000 && msg.data.type === test.type
                    );

                    if (recentMessages.length > 0) {
                        testResult.receivedBy.push(connectionTest.user);
                    }
                }

                testResult.endTime = Date.now();
                testResult.duration = testResult.endTime - testResult.startTime;
                testResult.success = testResult.sent && testResult.receivedBy.length > 0;

                this.testResults.notificationTests.push(testResult);

                this.log(`📊 ${test.name} results: ${testResult.receivedBy.length}/${test.expectedRecipients} received`,
                    testResult.success ? 'success' : 'warning');

            } catch (error) {
                testResult.errors.push(error.message);
                testResult.endTime = Date.now();
                testResult.duration = testResult.endTime - testResult.startTime;
                testResult.success = false;

                this.testResults.notificationTests.push(testResult);
                this.log(`❌ ${test.name} failed: ${error.message}`, 'error');
            }
        }
    }

    async testReconnection(connections) {
        this.log('🔄 Testing SSE reconnection...');

        for (const { eventSource, connectionTest } of connections) {
            const reconnectionTest = {
                user: connectionTest.user,
                startTime: Date.now(),
                disconnected: false,
                reconnected: false,
                errors: []
            };

            try {
                // Force disconnect
                this.log(`🔌 Forcing disconnect for ${connectionTest.user}...`);
                eventSource.close();
                reconnectionTest.disconnected = true;

                // Wait a moment
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Try to reconnect
                this.log(`🔄 Attempting reconnection for ${connectionTest.user}...`);
                const newConnection = await this.testSSEConnection(
                    this.testUsers.find(u => u.email === connectionTest.user)
                );

                reconnectionTest.reconnected = true;
                reconnectionTest.endTime = Date.now();
                reconnectionTest.duration = reconnectionTest.endTime - reconnectionTest.startTime;
                reconnectionTest.success = true;

                this.testResults.reconnectionTests.push(reconnectionTest);
                this.log(`✅ Reconnection successful for ${connectionTest.user}`, 'success');

            } catch (error) {
                reconnectionTest.errors.push(error.message);
                reconnectionTest.endTime = Date.now();
                reconnectionTest.duration = reconnectionTest.endTime - reconnectionTest.startTime;
                reconnectionTest.success = false;

                this.testResults.reconnectionTests.push(reconnectionTest);
                this.log(`❌ Reconnection failed for ${connectionTest.user}: ${error.message}`, 'error');
            }
        }
    }

    async testMultiUserNotifications(connections) {
        this.log('👥 Testing multi-user notification broadcasting...');

        const multiUserTest = {
            startTime: Date.now(),
            totalUsers: connections.length,
            notificationsSent: 0,
            notificationsReceived: 0,
            userResults: []
        };

        // Send multiple notifications rapidly
        for (let i = 0; i < 5; i++) {
            try {
                const response = await fetch(`${BASE_URL}/api/test-notifications`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        notificationType: 'test'
                    })
                });

                if (response.ok) {
                    multiUserTest.notificationsSent++;
                }

                // Small delay between notifications
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                this.log(`❌ Failed to send notification ${i + 1}: ${error.message}`, 'error');
            }
        }

        // Wait for all messages to be received
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Count received notifications per user
        for (const { connectionTest } of connections) {
            const userResult = {
                user: connectionTest.user,
                messagesReceived: connectionTest.messages.length,
                recentMessages: connectionTest.messages.filter(msg =>
                    Date.now() - msg.timestamp < 10000
                ).length
            };

            multiUserTest.userResults.push(userResult);
            multiUserTest.notificationsReceived += userResult.recentMessages;
        }

        multiUserTest.endTime = Date.now();
        multiUserTest.duration = multiUserTest.endTime - multiUserTest.startTime;
        multiUserTest.success = multiUserTest.notificationsReceived > 0;

        this.testResults.multiUserTests.push(multiUserTest);

        this.log(`📊 Multi-user test results: ${multiUserTest.notificationsReceived} notifications received across ${multiUserTest.totalUsers} users`,
            multiUserTest.success ? 'success' : 'warning');
    }

    generateReport() {
        const totalDuration = Date.now() - this.startTime;

        this.log('\n📊 SSE TEST SUITE REPORT');
        this.log('='.repeat(50));

        // Connection Tests
        this.log('\n🔗 CONNECTION TESTS:');
        const connectionSuccess = this.testResults.connectionTests.filter(t => t.success).length;
        this.log(`✅ Successful: ${connectionSuccess}/${this.testResults.connectionTests.length}`);

        // Notification Tests
        this.log('\n📢 NOTIFICATION TESTS:');
        const notificationSuccess = this.testResults.notificationTests.filter(t => t.success).length;
        this.log(`✅ Successful: ${notificationSuccess}/${this.testResults.notificationTests.length}`);

        // Reconnection Tests
        this.log('\n🔄 RECONNECTION TESTS:');
        const reconnectionSuccess = this.testResults.reconnectionTests.filter(t => t.success).length;
        this.log(`✅ Successful: ${reconnectionSuccess}/${this.testResults.reconnectionTests.length}`);

        // Multi-user Tests
        this.log('\n👥 MULTI-USER TESTS:');
        const multiUserSuccess = this.testResults.multiUserTests.filter(t => t.success).length;
        this.log(`✅ Successful: ${multiUserSuccess}/${this.testResults.multiUserTests.length}`);

        // Overall Summary
        this.log('\n📈 OVERALL SUMMARY:');
        const totalTests = this.testResults.connectionTests.length +
            this.testResults.notificationTests.length +
            this.testResults.reconnectionTests.length +
            this.testResults.multiUserTests.length;
        const totalSuccess = connectionSuccess + notificationSuccess + reconnectionSuccess + multiUserSuccess;

        this.log(`Total Tests: ${totalTests}`);
        this.log(`Successful: ${totalSuccess}`);
        this.log(`Failed: ${totalTests - totalSuccess}`);
        this.log(`Success Rate: ${((totalSuccess / totalTests) * 100).toFixed(1)}%`);
        this.log(`Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);

        if (options.verbose) {
            this.log('\n🔍 DETAILED RESULTS:');
            console.log(JSON.stringify(this.testResults, null, 2));
        }
    }

    async cleanup() {
        this.log('🧹 Cleaning up test environment...');

        // Close all SSE connections
        for (const connection of this.connections) {
            if (connection.eventSource) {
                connection.eventSource.close();
            }
        }

        // Clean up test users
        await this.cleanupTestUsers();

        // Disconnect from database
        await mongoose.disconnect();

        this.log('✅ Cleanup completed');
    }

    async run() {
        try {
            await this.initialize();

            if (options.testType === 'all' || options.testType === 'connection') {
                this.log('\n🔗 RUNNING CONNECTION TESTS...');
                this.connections = [];

                for (const user of this.testUsers) {
                    try {
                        await this.authenticateUser(user);
                        const connection = await this.testSSEConnection(user);
                        this.connections.push(connection);
                    } catch (error) {
                        this.log(`❌ Failed to establish connection for ${user.email}: ${error.message}`, 'error');
                    }
                }
            }

            if (options.testType === 'all' || options.testType === 'notifications') {
                this.log('\n📢 RUNNING NOTIFICATION TESTS...');
                if (this.connections.length > 0) {
                    await this.testNotificationBroadcasting(this.connections);
                } else {
                    this.log('⚠️ No connections available for notification testing', 'warning');
                }
            }

            if (options.testType === 'all' || options.testType === 'reconnection') {
                this.log('\n🔄 RUNNING RECONNECTION TESTS...');
                if (this.connections.length > 0) {
                    await this.testReconnection(this.connections);
                } else {
                    this.log('⚠️ No connections available for reconnection testing', 'warning');
                }
            }

            if (options.testType === 'all' || options.testType === 'multi-user') {
                this.log('\n👥 RUNNING MULTI-USER TESTS...');
                if (this.connections.length > 0) {
                    await this.testMultiUserNotifications(this.connections);
                } else {
                    this.log('⚠️ No connections available for multi-user testing', 'warning');
                }
            }

            this.generateReport();

        } catch (error) {
            this.log(`❌ Test suite failed: ${error.message}`, 'error');
            console.error(error);
        } finally {
            await this.cleanup();
        }
    }
}

// Main execution
if (require.main === module) {
    const testSuite = new SSETestSuite();

    console.log(`
🧪 SSE System Test Suite
========================

Options:
  Test Type: ${options.testType}
  Users: ${options.userCount}
  Duration: ${options.duration}s
  Verbose: ${options.verbose}

Starting tests...
`);

    testSuite.run().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = SSETestSuite;
