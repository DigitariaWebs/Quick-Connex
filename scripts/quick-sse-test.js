#!/usr/bin/env node

/**
 * Quick SSE System Test
 * 
 * This script provides a quick way to test the SSE system by:
 * 1. Using existing users from the database
 * 2. Testing SSE connection establishment
 * 3. Triggering test notifications
 * 4. Verifying message delivery
 * 
 * Usage: node scripts/quick-sse-test.js
 */

const mongoose = require('mongoose');
const fetch = require('node-fetch');
const EventSource = require('eventsource');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// User schema
const userSchema = new mongoose.Schema({
    userType: { type: String, required: true, enum: ['employee', 'manager', 'admin'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

class QuickSSETest {
    constructor() {
        this.connections = [];
        this.testResults = [];
    }

    log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = {
            info: 'ℹ️',
            success: '✅',
            error: '❌',
            warning: '⚠️',
            debug: '🔍'
        }[level] || 'ℹ️';

        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    async initialize() {
        this.log('🚀 Initializing Quick SSE Test...');

        try {
            // Connect to database
            await mongoose.connect(MONGODB_URI);
            this.log('✅ Connected to database');

            // Get existing approved users
            const users = await User.find({ status: 'approved' }).limit(3);

            if (users.length === 0) {
                throw new Error('No approved users found. Please create some users first.');
            }

            this.log(`✅ Found ${users.length} approved users`);
            return users;

        } catch (error) {
            this.log(`❌ Failed to initialize: ${error.message}`, 'error');
            throw error;
        }
    }

    async testSSEConnection(user) {
        return new Promise((resolve, reject) => {
            this.log(`🔗 Testing SSE connection for ${user.firstName} ${user.lastName}...`);

            const eventSource = new EventSource(`${BASE_URL}/api/notifications/sse`, {
                withCredentials: true
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

                this.testResults.push(connectionTest);

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

                this.testResults.push(connectionTest);
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

    async testNotificationSending() {
        this.log('📢 Testing notification sending...');

        const notificationTypes = ['test', 'transfer_status', 'urgent'];

        for (const type of notificationTypes) {
            this.log(`🧪 Sending ${type} notification...`);

            try {
                const response = await fetch(`${BASE_URL}/api/test-notifications`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        notificationType: type
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    this.log(`✅ ${type} notification sent successfully`, 'success');
                    this.log(`📄 Response: ${data.message}`, 'debug');
                } else {
                    this.log(`❌ Failed to send ${type} notification: ${response.status}`, 'error');
                }
            } catch (error) {
                this.log(`❌ Error sending ${type} notification: ${error.message}`, 'error');
            }

            // Wait between notifications
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    async testMessageDelivery(connections) {
        this.log('📨 Testing message delivery...');

        // Wait for messages to be processed
        await new Promise(resolve => setTimeout(resolve, 3000));

        for (const { connectionTest } of connections) {
            this.log(`📊 Messages received by ${connectionTest.user}: ${connectionTest.messages.length}`);

            if (connectionTest.messages.length > 0) {
                this.log(`✅ ${connectionTest.user} received messages successfully`, 'success');

                // Show message types
                const messageTypes = connectionTest.messages.map(msg => msg.type);
                this.log(`📋 Message types: ${messageTypes.join(', ')}`, 'debug');
            } else {
                this.log(`⚠️ ${connectionTest.user} received no messages`, 'warning');
            }
        }
    }

    generateReport() {
        this.log('\n📊 QUICK SSE TEST REPORT');
        this.log('='.repeat(40));

        const successfulConnections = this.testResults.filter(t => t.success).length;
        const totalConnections = this.testResults.length;

        this.log(`🔗 Connections: ${successfulConnections}/${totalConnections} successful`);

        if (this.connections.length > 0) {
            const totalMessages = this.connections.reduce((sum, conn) =>
                sum + conn.connectionTest.messages.length, 0);
            this.log(`📨 Total messages received: ${totalMessages}`);
        }

        // Show detailed results
        this.log('\n🔍 Detailed Results:');
        for (const result of this.testResults) {
            this.log(`  ${result.user}: ${result.success ? '✅' : '❌'} (${result.messages.length} messages)`);
        }
    }

    async cleanup() {
        this.log('🧹 Cleaning up...');

        // Close all SSE connections
        for (const connection of this.connections) {
            if (connection.eventSource) {
                connection.eventSource.close();
            }
        }

        // Disconnect from database
        await mongoose.disconnect();

        this.log('✅ Cleanup completed');
    }

    async run() {
        try {
            const users = await this.initialize();

            this.log('\n🔗 ESTABLISHING SSE CONNECTIONS...');
            this.connections = [];

            for (const user of users) {
                try {
                    const connection = await this.testSSEConnection(user);
                    this.connections.push(connection);
                } catch (error) {
                    this.log(`❌ Failed to establish connection for ${user.email}: ${error.message}`, 'error');
                }
            }

            if (this.connections.length === 0) {
                this.log('❌ No SSE connections established. Cannot proceed with testing.', 'error');
                return;
            }

            this.log('\n📢 TESTING NOTIFICATION SENDING...');
            await this.testNotificationSending();

            this.log('\n📨 TESTING MESSAGE DELIVERY...');
            await this.testMessageDelivery(this.connections);

            this.generateReport();

        } catch (error) {
            this.log(`❌ Test failed: ${error.message}`, 'error');
            console.error(error);
        } finally {
            await this.cleanup();
        }
    }
}

// Main execution
if (require.main === module) {
    const test = new QuickSSETest();

    console.log(`
🧪 Quick SSE System Test
========================

This test will:
1. Connect to the database
2. Find existing approved users
3. Establish SSE connections
4. Send test notifications
5. Verify message delivery

Starting test...
`);

    test.run().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = QuickSSETest;
