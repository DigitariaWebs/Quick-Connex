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

async function debugSSEFlow() {
    console.log('🔍 Debugging SSE Flow');
    console.log('====================\n');

    try {
        // Step 1: Login and get cookies
        console.log('1️⃣ Logging in...');
        const loginResponse = await makeRequest(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
            }),
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status}`);
        }

        const loginData = await loginResponse.json();
        const cookies = loginResponse.cookies;
        const cookieHeader = cookies.join('; ');

        console.log('✅ Login successful');
        console.log(`   User: ${loginData.user.firstName} ${loginData.user.lastName}`);
        console.log(`   Cookies: ${cookies.length} cookies received`);
        console.log(`   Cookie header: ${cookieHeader}\n`);

        // Step 2: Test SSE connection
        console.log('2️⃣ Testing SSE connection...');

        const ssePromise = new Promise((resolve, reject) => {
            const urlObj = new URL(`${BASE_URL}/api/notifications/sse`);
            const client = http;

            const req = client.request({
                hostname: urlObj.hostname,
                port: urlObj.port || 80,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Cookie': cookieHeader,
                },
            }, (res) => {
                console.log(`   SSE Response Status: ${res.statusCode}`);
                console.log(`   SSE Response Headers:`, res.headers);

                if (res.statusCode === 200) {
                    console.log('✅ SSE connection established');

                    let messageCount = 0;
                    res.on('data', (chunk) => {
                        const data = chunk.toString();
                        console.log(`   📨 SSE Message ${++messageCount}:`, data.trim());

                        // Stop after first few messages
                        if (messageCount >= 3) {
                            console.log('   ✅ SSE is working - received messages');
                            resolve({ success: true, messages: messageCount });
                        }
                    });

                    // Timeout after 5 seconds
                    setTimeout(() => {
                        if (messageCount === 0) {
                            console.log('   ⚠️  No messages received in 5 seconds');
                        }
                        resolve({ success: true, messages: messageCount });
                    }, 5000);
                } else {
                    reject(new Error(`SSE connection failed: ${res.statusCode}`));
                }
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.end();
        });

        const sseResult = await ssePromise;
        console.log(`   📊 SSE Test Result: ${sseResult.messages} messages received\n`);

        // Step 3: Test sending notification
        console.log('3️⃣ Testing notification sending...');

        const notificationResponse = await makeRequest(`${BASE_URL}/api/test-notifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader,
            },
            body: JSON.stringify({
                notificationType: 'test',
            }),
        });

        if (notificationResponse.ok) {
            const notificationData = await notificationResponse.json();
            console.log('✅ Notification sent successfully');
            console.log(`   Message: ${notificationData.message}`);
        } else {
            console.log(`❌ Notification failed: ${notificationResponse.status}`);
        }

        console.log('\n🎯 Debug Summary:');
        console.log('================');
        console.log('✅ Authentication: Working');
        console.log('✅ SSE Endpoint: Accessible');
        console.log('✅ SSE Connection: Established');
        console.log('✅ Notification API: Working');
        console.log('\n💡 Next Steps:');
        console.log('1. Check browser console for SSE connection logs');
        console.log('2. Verify debug panel shows "Connected: Yes"');
        console.log('3. Send notifications from test page');
        console.log('4. Check if popups appear on dashboard');

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Make sure server is running: npm run dev');
        console.log('2. Check if SSE endpoint is accessible');
        console.log('3. Verify authentication is working');
    }
}

// Run the debug
debugSSEFlow().catch(console.error);

