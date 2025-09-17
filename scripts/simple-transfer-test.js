#!/usr/bin/env node

/**
 * Simple transfer test that uses existing authentication
 */

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test data
const TEST_TRANSFER = {
    patientFirstName: 'John',
    patientLastName: 'Doe',
    patientAge: 45,
    fromHospital: 'Toronto General Hospital',
    toHospital: 'Mount Sinai Hospital',
    transferDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
    transferTime: '14:30',
    transferType: 'scheduled',
    issuer: 'Dr. Smith',
    priority: 'high',
    reason: 'Specialized cardiac surgery required',
    notes: 'Patient requires immediate transfer for urgent cardiac procedure'
};

// Cookie jar to maintain session
let cookieJar = '';

async function makeRequest(url, options = {}) {
    try {
        if (cookieJar) {
            console.log(`Making request with cookie: ${cookieJar.substring(0, 50)}...`);
        }
        const response = await fetch(`${BASE_URL}${url}`, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieJar, // Include cookies in all requests
                ...options.headers
            },
            ...options
        });

        // Extract cookies from response
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
            // Extract just the cookie value and name, not the full header
            const cookieMatch = setCookieHeader.match(/([^=]+=[^;]+)/);
            if (cookieMatch) {
                cookieJar = cookieMatch[1];
                console.log(`Cookie set: ${cookieJar.substring(0, 50)}...`);
            }
        }

        const data = await response.json();

        return {
            ok: response.ok,
            status: response.status,
            data
        };
    } catch (error) {
        console.error(`Network error: ${error.message}`);
        throw error;
    }
}

async function loginUser(email, password) {
    console.log(`Logging in user: ${email}`);

    const response = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
        console.error(`Login failed - Status: ${response.status}, Data: ${JSON.stringify(response.data)}`);
        throw new Error(`Login failed: ${response.data.error || 'Unknown error'}`);
    }

    console.log(`Login successful for ${email}`);
    return response.data.user;
}

async function createTransferRequest() {
    console.log('Creating transfer request...');

    const response = await makeRequest('/api/transfers', {
        method: 'POST',
        body: JSON.stringify(TEST_TRANSFER)
    });

    if (!response.ok) {
        console.error(`Transfer creation failed - Status: ${response.status}, Data: ${JSON.stringify(response.data)}`);
        throw new Error(`Transfer creation failed: ${response.data.error || 'Unknown error'}`);
    }

    const transfer = response.data.data;
    console.log(`Transfer created successfully: ${transfer.transferId}`);
    console.log(`Transfer ID: ${transfer._id}`);

    return transfer;
}

async function runSimpleTest() {
    try {
        console.log('🚀 Starting Simple Transfer Test');
        console.log(`Base URL: ${BASE_URL}`);

        // Login as manager
        console.log('\n=== STEP 1: Manager Login ===');
        await loginUser('manager@test.com', 'TestPassword123!');

        // Create transfer
        console.log('\n=== STEP 2: Create Transfer ===');
        const transfer = await createTransferRequest();

        console.log('\n🎉 Test completed successfully!');
        console.log(`Transfer created: ${transfer.transferId}`);
        console.log(`Patient: ${transfer.patient.firstName} ${transfer.patient.lastName}`);
        console.log(`From: ${transfer.fromHospital}`);
        console.log(`To: ${transfer.toHospital}`);
        console.log(`Status: ${transfer.status}`);

    } catch (error) {
        console.error(`\n❌ TEST FAILED: ${error.message}`);
        console.error(`Stack trace: ${error.stack}`);
        process.exit(1);
    }
}

// Run the test
runSimpleTest().catch(console.error);
