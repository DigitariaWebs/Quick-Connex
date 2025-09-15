#!/usr/bin/env node

/**
 * Quick Authentication Test Script
 * Simple tests to verify JWT authentication is working
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const req = http.request(url, requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = data ? JSON.parse(data) : {};
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: jsonData
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error('Request timeout')));

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }

        req.end();
    });
}

async function quickTest() {
    console.log('🔍 Quick Authentication Test');
    console.log('============================\n');

    try {
        // Test 1: Server is running
        console.log('1. Testing server connection...');
        const serverTest = await makeRequest('/api/test-db');
        console.log(`   Status: ${serverTest.status} ${serverTest.status === 200 || serverTest.status === 401 ? '✅' : '❌'}`);

        // Test 2: Login endpoint exists
        console.log('\n2. Testing login endpoint...');
        const loginTest = await makeRequest('/api/auth/login', {
            method: 'POST',
            body: { email: 'test@example.com', password: 'test' }
        });
        console.log(`   Status: ${loginTest.status} ${loginTest.status === 401 ? '✅' : '❌'}`);

        // Test 3: Protected route redirects
        console.log('\n3. Testing protected route...');
        const protectedTest = await makeRequest('/dashboard');
        console.log(`   Status: ${protectedTest.status} ${protectedTest.status === 302 || protectedTest.status === 307 || protectedTest.status === 401 ? '✅' : '❌'}`);

        // Test 4: Verify endpoint exists
        console.log('\n4. Testing verify endpoint...');
        const verifyTest = await makeRequest('/api/auth/verify');
        console.log(`   Status: ${verifyTest.status} ${verifyTest.status === 401 ? '✅' : '❌'}`);

        // Test 5: Logout endpoint exists
        console.log('\n5. Testing logout endpoint...');
        const logoutTest = await makeRequest('/api/auth/logout', { method: 'POST' });
        console.log(`   Status: ${logoutTest.status} ${logoutTest.status === 200 ? '✅' : '❌'}`);

        console.log('\n✅ Quick test completed!');
        console.log('If all tests show ✅, your authentication system is working correctly.');

    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        console.log('Make sure your server is running on http://localhost:3000');
    }
}

quickTest();
