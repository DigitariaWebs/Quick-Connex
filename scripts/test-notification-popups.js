#!/usr/bin/env node

const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test credentials
const TEST_EMAIL = 'arselene.tests@gmail.com';
const TEST_PASSWORD = 'TestPassword123!';

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;

        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {},
        };

        const req = client.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    headers: res.headers,
                    json: () => Promise.resolve(JSON.parse(data)),
                    text: () => Promise.resolve(data),
                    cookies: res.headers['set-cookie'] || []
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function loginUser() {
    console.log('🔐 Logging in user...');

    try {
        const response = await makeRequest(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Login successful');
            console.log(`   User: ${data.user.firstName} ${data.user.lastName} (${data.user.userType})`);
            return {
                cookies: response.cookies,
                user: data.user
            };
        } else {
            const error = await response.json();
            throw new Error(`Login failed: ${error.message}`);
        }
    } catch (error) {
        console.error('❌ Login failed:', error.message);
        throw error;
    }
}

async function testNotificationPopups() {
    console.log('🧪 Testing Notification Popup System');
    console.log('=====================================\n');

    const startTime = Date.now();

    try {
        // Step 1: Login
        const loginResult = await loginUser();
        const cookieHeader = loginResult.cookies.join('; ');
        console.log(`   🍪 Cookies captured: ${loginResult.cookies.length} cookies\n`);

        // Step 2: Test different notification types
        const notificationTypes = [
            { type: 'test', name: 'Basic Test Notification' },
            { type: 'transfer_status', name: 'Transfer Status Change' },
            { type: 'urgent', name: 'Urgent Alert' }
        ];

        console.log('📡 Sending test notifications...\n');

        for (let i = 0; i < notificationTypes.length; i++) {
            const { type, name } = notificationTypes[i];

            console.log(`   ${i + 1}. Testing ${name}...`);

            try {
                const response = await makeRequest(`${BASE_URL}/api/test-notifications`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': cookieHeader,
                    },
                    body: JSON.stringify({
                        notificationType: type,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log(`      ✅ ${name} sent successfully`);
                    console.log(`      📝 Message: ${data.message}`);
                } else {
                    console.log(`      ❌ ${name} failed: ${response.status}`);
                }
            } catch (error) {
                console.log(`      ❌ ${name} error: ${error.message}`);
            }

            // Wait 2 seconds between notifications
            if (i < notificationTypes.length - 1) {
                console.log('      ⏳ Waiting 2 seconds...\n');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log('\n🎯 Testing Multiple Notifications...');

        // Send 3 rapid notifications
        for (let i = 1; i <= 3; i++) {
            console.log(`   Sending rapid notification ${i}/3...`);

            try {
                const response = await makeRequest(`${BASE_URL}/api/test-notifications`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': cookieHeader,
                    },
                    body: JSON.stringify({
                        notificationType: 'test',
                    }),
                });

                if (response.ok) {
                    console.log(`      ✅ Rapid notification ${i} sent`);
                } else {
                    console.log(`      ❌ Rapid notification ${i} failed`);
                }
            } catch (error) {
                console.log(`      ❌ Rapid notification ${i} error: ${error.message}`);
            }

            // Wait 500ms between rapid notifications
            if (i < 3) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        console.log('\n🎉 Notification Popup Test Complete!');
        console.log('=====================================');
        console.log(`⏱️  Total execution time: ${totalTime}ms`);
        console.log('\n📋 What to check:');
        console.log('   1. Open the dashboard: http://localhost:3000/dashboard');
        console.log('   2. Look for notification popups in the top-right corner');
        console.log('   3. Check that popups appear with animations');
        console.log('   4. Verify popups auto-hide after 5 seconds');
        console.log('   5. Test the interactive page: http://localhost:3000/test-notification-popups.html');
        console.log('\n🔧 If popups don\'t appear:');
        console.log('   - Check browser console for errors');
        console.log('   - Verify SSE connection is working');
        console.log('   - Check that NotificationPopupManager is imported in dashboard');
        console.log('   - Ensure framer-motion is installed');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testNotificationPopups().catch(console.error);

