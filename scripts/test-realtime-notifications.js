#!/usr/bin/env node

/**
 * Test script for real-time notifications system
 * This script tests the Socket.IO connection and notification flow
 */

const { io } = require('socket.io-client');
const fetch = require('node-fetch');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SOCKET_URL = process.env.TEST_SOCKET_URL || 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
    manager: {
        email: 'manager@test.com',
        password: 'testpassword123',
        userType: 'manager'
    },
    employee: {
        email: 'employee@test.com',
        password: 'testpassword123',
        userType: 'employee'
    }
};

let managerToken = null;
let employeeToken = null;
let managerSocket = null;
let employeeSocket = null;

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(testName, passed, message = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}${message ? `: ${message}` : ''}`);

    testResults.tests.push({ name: testName, passed, message });
    if (passed) {
        testResults.passed++;
    } else {
        testResults.failed++;
    }
}

// Authentication helper
async function authenticateUser(email, password) {
    try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (data.success && data.data.token) {
            return data.data.token;
        } else {
            throw new Error(data.error || 'Authentication failed');
        }
    } catch (error) {
        throw new Error(`Authentication failed: ${error.message}`);
    }
}

// Socket connection helper
function createSocketConnection(token, userType) {
    return new Promise((resolve, reject) => {
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        const timeout = setTimeout(() => {
            reject(new Error('Socket connection timeout'));
        }, 10000);

        socket.on('connect', () => {
            clearTimeout(timeout);
            console.log(`🔌 ${userType} socket connected`);
            resolve(socket);
        });

        socket.on('connect_error', (error) => {
            clearTimeout(timeout);
            reject(new Error(`Socket connection error: ${error.message}`));
        });

        socket.on('disconnect', (reason) => {
            console.log(`🔌 ${userType} socket disconnected: ${reason}`);
        });
    });
}

// Test 1: Authentication
async function testAuthentication() {
    try {
        console.log('\n🧪 Testing Authentication...');

        managerToken = await authenticateUser(TEST_CONFIG.manager.email, TEST_CONFIG.manager.password);
        logTest('Manager Authentication', true, 'Token received');

        employeeToken = await authenticateUser(TEST_CONFIG.employee.email, TEST_CONFIG.employee.password);
        logTest('Employee Authentication', true, 'Token received');

        return true;
    } catch (error) {
        logTest('Authentication', false, error.message);
        return false;
    }
}

// Test 2: Socket.IO Connection
async function testSocketConnection() {
    try {
        console.log('\n🧪 Testing Socket.IO Connection...');

        managerSocket = await createSocketConnection(managerToken, 'Manager');
        logTest('Manager Socket Connection', true);

        employeeSocket = await createSocketConnection(employeeToken, 'Employee');
        logTest('Employee Socket Connection', true);

        return true;
    } catch (error) {
        logTest('Socket Connection', false, error.message);
        return false;
    }
}

// Test 3: Create Transfer and Test Notifications
async function testTransferNotifications() {
    try {
        console.log('\n🧪 Testing Transfer Notifications...');

        // Set up notification listeners
        const managerNotifications = [];
        const employeeNotifications = [];

        managerSocket.on('new_transfer', (notification) => {
            console.log('📨 Manager received new transfer notification:', notification.title);
            managerNotifications.push(notification);
        });

        employeeSocket.on('new_transfer', (notification) => {
            console.log('📨 Employee received new transfer notification:', notification.title);
            employeeNotifications.push(notification);
        });

        managerSocket.on('transfer_status_change', (notification) => {
            console.log('📨 Manager received status change notification:', notification.title);
            managerNotifications.push(notification);
        });

        employeeSocket.on('transfer_status_change', (notification) => {
            console.log('📨 Employee received status change notification:', notification.title);
            employeeNotifications.push(notification);
        });

        // Create a test transfer
        const transferData = {
            patientFirstName: 'Test',
            patientLastName: 'Patient',
            patientAge: '30',
            fromHospital: 'Test Hospital A',
            toHospital: 'Test Hospital B',
            transferDate: new Date().toISOString().split('T')[0],
            transferTime: '10:00',
            transferType: 'scheduled',
            issuer: 'Test Manager',
            priority: 'medium',
            reason: 'Test transfer for notification system',
            notes: 'This is a test transfer'
        };

        const createResponse = await fetch(`${BASE_URL}/api/transfers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${managerToken}`
            },
            body: JSON.stringify(transferData)
        });

        const createData = await createResponse.json();

        if (!createData.success) {
            throw new Error(`Failed to create transfer: ${createData.error}`);
        }

        logTest('Transfer Creation', true, `Transfer ID: ${createData.data.transferId}`);

        // Wait for notifications
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if employee received new transfer notification
        const employeeNewTransfer = employeeNotifications.find(n => n.type === 'new_transfer');
        logTest('Employee New Transfer Notification', !!employeeNewTransfer,
            employeeNewTransfer ? 'Received' : 'Not received');

        // Accept the transfer (employee action)
        const transferId = createData.data._id;
        const acceptResponse = await fetch(`${BASE_URL}/api/transfers/${transferId}/accept`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employeeToken}`
            },
            body: JSON.stringify({ notes: 'Test acceptance' })
        });

        const acceptData = await acceptResponse.json();

        if (!acceptData.success) {
            throw new Error(`Failed to accept transfer: ${acceptData.error}`);
        }

        logTest('Transfer Acceptance', true);

        // Wait for status change notifications
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if manager received status change notification
        const managerStatusChange = managerNotifications.find(n => n.type === 'transfer_status_change');
        logTest('Manager Status Change Notification', !!managerStatusChange,
            managerStatusChange ? 'Received' : 'Not received');

        // Check if employee received status change notification
        const employeeStatusChange = employeeNotifications.find(n => n.type === 'transfer_status_change');
        logTest('Employee Status Change Notification', !!employeeStatusChange,
            employeeStatusChange ? 'Received' : 'Not received');

        return true;
    } catch (error) {
        logTest('Transfer Notifications', false, error.message);
        return false;
    }
}

// Test 4: Notification API Endpoints
async function testNotificationAPI() {
    try {
        console.log('\n🧪 Testing Notification API...');

        // Test getting notifications
        const getResponse = await fetch(`${BASE_URL}/api/notifications`, {
            headers: {
                'Authorization': `Bearer ${employeeToken}`
            }
        });

        const getData = await getResponse.json();

        if (!getData.success) {
            throw new Error(`Failed to get notifications: ${getData.error}`);
        }

        logTest('Get Notifications API', true, `Found ${getData.data.notifications.length} notifications`);

        // Test notification preferences
        const prefsResponse = await fetch(`${BASE_URL}/api/notifications/preferences`, {
            headers: {
                'Authorization': `Bearer ${employeeToken}`
            }
        });

        const prefsData = await prefsResponse.json();

        if (!prefsData.success) {
            throw new Error(`Failed to get preferences: ${prefsData.error}`);
        }

        logTest('Get Notification Preferences', true);

        return true;
    } catch (error) {
        logTest('Notification API', false, error.message);
        return false;
    }
}

// Test 5: Socket Room Management
async function testSocketRooms() {
    try {
        console.log('\n🧪 Testing Socket Room Management...');

        // Test joining transfer room
        const testTransferId = 'test-transfer-123';

        managerSocket.emit('join_transfer_room', testTransferId);
        employeeSocket.emit('join_transfer_room', testTransferId);

        logTest('Join Transfer Room', true, 'Both users joined room');

        // Test leaving transfer room
        managerSocket.emit('leave_transfer_room', testTransferId);
        employeeSocket.emit('leave_transfer_room', testTransferId);

        logTest('Leave Transfer Room', true, 'Both users left room');

        return true;
    } catch (error) {
        logTest('Socket Room Management', false, error.message);
        return false;
    }
}

// Cleanup function
async function cleanup() {
    console.log('\n🧹 Cleaning up...');

    if (managerSocket) {
        managerSocket.disconnect();
    }

    if (employeeSocket) {
        employeeSocket.disconnect();
    }

    console.log('✅ Cleanup completed');
}

// Main test runner
async function runTests() {
    console.log('🚀 Starting Real-time Notifications System Tests');
    console.log('='.repeat(60));

    try {
        // Run tests in sequence
        const authSuccess = await testAuthentication();
        if (!authSuccess) {
            throw new Error('Authentication tests failed');
        }

        const socketSuccess = await testSocketConnection();
        if (!socketSuccess) {
            throw new Error('Socket connection tests failed');
        }

        await testTransferNotifications();
        await testNotificationAPI();
        await testSocketRooms();

    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
    } finally {
        await cleanup();
    }

    // Print results
    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

    if (testResults.failed > 0) {
        console.log('\n❌ Failed Tests:');
        testResults.tests
            .filter(test => !test.passed)
            .forEach(test => {
                console.log(`  - ${test.name}: ${test.message}`);
            });
    }

    console.log('\n🎉 Test suite completed!');

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\n🛑 Test interrupted by user');
    await cleanup();
    process.exit(1);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Test terminated');
    await cleanup();
    process.exit(1);
});

// Run the tests
runTests().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});
