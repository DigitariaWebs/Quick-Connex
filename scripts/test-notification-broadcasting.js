#!/usr/bin/env node

/**
 * Notification Broadcasting Test Script
 * 
 * This script tests the notification broadcasting system by:
 * 1. Checking SSE connection status
 * 2. Sending test notifications
 * 3. Verifying notifications are broadcasted to connected users
 * 
 * Usage: node scripts/test-notification-broadcasting.js
 */

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

class NotificationBroadcastingTester {
    constructor() {
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

    async checkSSEStatus() {
        this.log('🔍 Checking SSE connection status...');

        try {
            const response = await fetch(`${BASE_URL}/api/notifications/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.log(`📊 SSE Status: ${data.stats.totalConnections} total connections`, 'success');
                this.log(`📊 Connections by type: ${JSON.stringify(data.stats.connectionsByType)}`, 'info');

                if (data.stats.totalConnections === 0) {
                    this.log('⚠️ No SSE connections found. Make sure you have the SSE Live Test page open and connected.', 'warning');
                    return false;
                }

                return true;
            } else {
                this.log(`❌ Failed to get SSE status: ${response.status}`, 'error');
                return false;
            }
        } catch (error) {
            this.log(`❌ Error checking SSE status: ${error.message}`, 'error');
            return false;
        }
    }

    async testNotificationBroadcasting(type, description) {
        this.log(`🧪 Testing ${description} broadcasting...`);

        const testResult = {
            type,
            description,
            startTime: Date.now(),
            success: false,
            broadcastCount: 0,
            error: null
        };

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
                testResult.success = true;
                testResult.broadcastCount = data.broadcastCount || 0;
                testResult.endTime = Date.now();
                testResult.duration = testResult.endTime - testResult.startTime;

                this.log(`✅ ${description} broadcasted to ${testResult.broadcastCount} users`, 'success');
                this.log(`📄 Response: ${data.message}`, 'debug');

                if (testResult.broadcastCount === 0) {
                    this.log('⚠️ No users received the notification. Check SSE connections.', 'warning');
                }
            } else {
                const error = await response.json();
                testResult.error = error.message || `HTTP ${response.status}`;
                testResult.endTime = Date.now();
                testResult.duration = testResult.endTime - testResult.startTime;

                this.log(`❌ ${description} failed: ${testResult.error}`, 'error');
            }

        } catch (error) {
            testResult.error = error.message;
            testResult.endTime = Date.now();
            testResult.duration = testResult.endTime - testResult.startTime;

            this.log(`❌ ${description} error: ${error.message}`, 'error');
        }

        this.testResults.push(testResult);
        return testResult;
    }

    async testMultipleBroadcasts() {
        this.log('🧪 Testing multiple notification broadcasts...');

        const promises = [];
        for (let i = 1; i <= 3; i++) {
            promises.push(
                this.testNotificationBroadcasting('test', `Multiple Test ${i}`)
            );
        }

        const results = await Promise.all(promises);
        const successful = results.filter(r => r.success).length;
        const totalBroadcasted = results.reduce((sum, r) => sum + r.broadcastCount, 0);

        this.log(`📊 Multiple broadcasts: ${successful}/3 successful, ${totalBroadcasted} total notifications sent`,
            successful === 3 ? 'success' : 'warning');
    }

    generateReport() {
        this.log('\n📊 NOTIFICATION BROADCASTING TEST REPORT');
        this.log('='.repeat(50));

        const successfulTests = this.testResults.filter(t => t.success).length;
        const totalTests = this.testResults.length;
        const totalBroadcasted = this.testResults.reduce((sum, t) => sum + t.broadcastCount, 0);

        this.log(`Total Tests: ${totalTests}`);
        this.log(`Successful: ${successfulTests}`);
        this.log(`Failed: ${totalTests - successfulTests}`);
        this.log(`Total Notifications Broadcasted: ${totalBroadcasted}`);
        this.log(`Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);

        this.log('\n🔍 Detailed Results:');
        for (const result of this.testResults) {
            const status = result.success ? '✅' : '❌';
            this.log(`  ${status} ${result.description}: ${result.buration}ms (${result.broadcastCount} users)`);
            if (result.error) {
                this.log(`    Error: ${result.error}`, 'error');
            }
        }

        this.log('\n💡 Next Steps:');
        this.log('1. Check your browser for toast notifications appearing');
        this.log('2. Verify notifications show in the top-right corner');
        this.log('3. Test sound alerts for high-priority notifications');
        this.log('4. Check browser console for any JavaScript errors');
        this.log('5. Use the SSE Live Test page to monitor connections');
    }

    async run() {
        this.log('🚀 Starting Notification Broadcasting Tests...');
        this.log(`🌐 Testing against: ${BASE_URL}`);

        // Check SSE status first
        const hasConnections = await this.checkSSEStatus();

        if (!hasConnections) {
            this.log('\n⚠️ No SSE connections found. Please:');
            this.log('1. Open http://localhost:3000/sse-live-test.html in your browser');
            this.log('2. Login with your credentials');
            this.log('3. Click "Connect SSE"');
            this.log('4. Run this script again');
            return;
        }

        // Test individual notification types
        await this.testNotificationBroadcasting('test', 'Basic Test Notification');
        await new Promise(resolve => setTimeout(resolve, 1000));

        await this.testNotificationBroadcasting('transfer_status', 'Transfer Status Notification');
        await new Promise(resolve => setTimeout(resolve, 1000));

        await this.testNotificationBroadcasting('urgent', 'Urgent Alert Notification');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test multiple rapid notifications
        await this.testMultipleBroadcasts();

        this.generateReport();

        this.log('\n🎯 Notification broadcasting tests completed!');
        this.log('If you don\'t see toast notifications in your browser, check:');
        this.log('- SSE connection is established');
        this.log('- You are logged in to the application');
        this.log('- Browser console for any errors');
        this.log('- Network tab for failed requests');
    }
}

// Main execution
if (require.main === module) {
    const tester = new NotificationBroadcastingTester();

    console.log(`
🧪 Notification Broadcasting Test Suite
=======================================

This test will verify that notifications are properly broadcasted
to connected SSE clients.

Prerequisites:
1. Next.js server running (npm run dev)
2. SSE Live Test page open and connected
3. You are logged in to the application

Starting tests...
`);

    tester.run().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = NotificationBroadcastingTester;
