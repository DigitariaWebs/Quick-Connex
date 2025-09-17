#!/usr/bin/env node

/**
 * Test Users Setup Script
 * 
 * This script creates test users (manager and employee) for testing the transfer system.
 * 
 * Usage: node scripts/setup-test-users.js
 */

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

const TEST_USERS = [
    {
        firstName: 'Test',
        lastName: 'Manager',
        email: 'manager@test.com',
        password: 'manager123',
        userType: 'manager',
        phone: '555-0101',
        post: 'Transfer Manager',
        class: 'Management'
    },
    {
        firstName: 'Test',
        lastName: 'Employee',
        email: 'employee@test.com',
        password: 'employee123',
        userType: 'employee',
        phone: '555-0102',
        post: 'Transport Specialist',
        class: 'Operations'
    }
];

// Utility functions
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
        info: '\x1b[36m',    // Cyan
        success: '\x1b[32m', // Green
        error: '\x1b[31m',   // Red
        warning: '\x1b[33m', // Yellow
        reset: '\x1b[0m'
    };

    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

async function makeRequest(url, options = {}) {
    try {
        const response = await fetch(`${BASE_URL}${url}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();

        return {
            ok: response.ok,
            status: response.status,
            data
        };
    } catch (error) {
        log(`Network error: ${error.message}`, 'error');
        throw error;
    }
}

async function createTestUsers() {
    log('Creating test users using the test user API', 'info');

    const response = await makeRequest('/api/create-test-user', {
        method: 'POST'
    });

    if (!response.ok) {
        throw new Error(`Test user creation failed: ${response.data.error || 'Unknown error'}`);
    }

    log('Test users created successfully', 'success');
    return response.data;
}

async function verifyUserExists(email) {
    log(`Verifying user exists: ${email}`, 'info');

    try {
        // Try to login to verify user exists
        const response = await makeRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password: 'password123' // Test users use this password
            })
        });

        if (response.ok) {
            log(`User verification successful: ${email}`, 'success');
            return true;
        } else {
            log(`User verification failed: ${email}`, 'error');
            return false;
        }
    } catch (error) {
        log(`User verification error: ${error.message}`, 'error');
        return false;
    }
}

async function setupTestUsers() {
    try {
        log('Setting up test users for transfer system testing', 'info');
        log(`Base URL: ${BASE_URL}`, 'info');

        console.log('\n' + '='.repeat(60));
        log('TEST USERS SETUP', 'info');
        console.log('='.repeat(60));

        // Create test users using the API
        await createTestUsers();

        console.log('\n' + '='.repeat(60));
        log('VERIFICATION', 'info');
        console.log('='.repeat(60));

        // Verify all users were created successfully
        await verifyUserExists('manager@test.com');
        await verifyUserExists('employee@test.com');

        console.log('\n' + '='.repeat(60));
        log('SETUP COMPLETE', 'success');
        console.log('='.repeat(60));

        log('Test users created successfully!', 'success');
        log('\nTest User Credentials:', 'info');
        log('Manager:', 'info');
        log('  Email: manager@test.com', 'info');
        log('  Password: password123', 'info');
        log('  Role: manager', 'info');
        log('\nEmployee:', 'info');
        log('  Email: employee@test.com', 'info');
        log('  Password: password123', 'info');
        log('  Role: employee', 'info');

        log('\nYou can now run the transfer workflow test:', 'info');
        log('node scripts/test-transfer-workflow.js', 'info');

    } catch (error) {
        log(`\n❌ SETUP FAILED: ${error.message}`, 'error');
        log(`Stack trace: ${error.stack}`, 'error');
        process.exit(1);
    }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    log(`Uncaught Exception: ${error.message}`, 'error');
    log(`Stack trace: ${error.stack}`, 'error');
    process.exit(1);
});

// Run the setup
if (require.main === module) {
    setupTestUsers();
}

module.exports = {
    setupTestUsers,
    TEST_USERS
};
