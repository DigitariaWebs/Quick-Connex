#!/usr/bin/env node

/**
 * Toast Notification Test Script
 * 
 * This script tests the toast notification system by sending
 * various types of notifications and verifying they are received.
 * 
 * Usage: node scripts/test-toast-notifications.js
 */

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

class ToastNotificationTester {
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

    async testNotificationType(type, description) {
        this.log(`🧪 Testing ${description}...`);

        const testResult = {
            type,
            description,
            startTime: Date.now(),
            success: false,
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
                testResult.endTime = Date.now();
                testResult.duration = testResult.endTime - testResult.startTime;

                this.log(`✅ ${description} sent successfully`, 'success');
                this.log(`📄 Response: ${data.message}`, 'debug');
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

    async testMultipleNotifications() {
        this.log('🧪 Testing multiple rapid notifications...');

        const promises = [];
        for (let i = 1; i <= 5; i++) {
            promises.push(
                this.testNotificationType('test', `Rapid Test ${i}`)
            );
        }

        const results = await Promise.all(promises);
        const successful = results.filter(r => r.success).length;

        this.log(`📊 Rapid notifications: ${successful}/5 successful`,
            successful === 5 ? 'success' : 'warning');
    }

    generateReport() {
        this.log('\n📊 TOAST NOTIFICATION TEST REPORT');
        this.log('='.repeat(50));

        const successfulTests = this.testResults.filter(t => t.success).length;
        const totalTests = this.testResults.length;

        this.log(`Total Tests: ${totalTests}`);
        this.log(`Successful: ${successfulTests}`);
        this.log(`Failed: ${totalTests - successfulTests}`);
        this.log(`Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);

        this.log('\n🔍 Detailed Results:');
        for (const result of this.testResults) {
            const status = result.success ? '✅' : '❌';
            this.log(`  ${status} ${result.description}: ${result.duration}ms`);
            if (result.error) {
                this.log(`    Error: ${result.error}`, 'error');
            }
        }

        this.log('\n💡 Next Steps:');
        this.log('1. Check your browser for toast notifications appearing');
        this.log('2. Verify notifications show in the top-right corner');
        this.log('3. Test sound alerts for high-priority notifications');
        this.log('4. Check browser console for any JavaScript errors');
    }

    async run() {
        this.log('🚀 Starting Toast Notification Tests...');
        this.log(`🌐 Testing against: ${BASE_URL}`);

        // Test individual notification types
        await this.testNotificationType('test', 'Basic Test Notification');
        await new Promise(resolve => setTimeout(resolve, 1000));

        await this.testNotificationType('transfer_status', 'Transfer Status Notification');
        await new Promise(resolve => setTimeout(resolve, 1000));

        await this.testNotificationType('urgent', 'Urgent Alert Notification');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test multiple rapid notifications
        await this.testMultipleNotifications();

        this.generateReport();

        this.log('\n🎯 Toast notifications should now be visible in your browser!');
        this.log('If you don\'t see them, check:');
        this.log('- SSE connection is established');
        this.log('- You are logged in to the application');
        this.log('- Browser console for any errors');
        this.log('- Network tab for failed requests');
    }
}

// Main execution
if (require.main === module) {
    const tester = new ToastNotificationTester();

    console.log(`
🧪 Toast Notification Test Suite
================================

This test will send various notification types to verify
that toast notifications are working correctly.

Make sure you have:
1. The Next.js server running (npm run dev)
2. A browser tab open with the application
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

module.exports = ToastNotificationTester;
