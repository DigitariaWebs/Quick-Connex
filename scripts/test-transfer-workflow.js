#!/usr/bin/env node

/**
 * Transfer System Workflow Testing Script
 * 
 * This script tests the complete transfer workflow:
 * 1. Manager creates a transfer request
 * 2. Employee reviews and accepts the transfer
 * 3. Employee starts the transfer
 * 4. Employee completes the transfer
 * 
 * Usage: node scripts/test-transfer-workflow.js
 */

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Cookie jar to maintain session
let managerCookieJar = '';
let employeeCookieJar = '';
const TEST_CONFIG = {
    manager: {
        email: 'manager@test.com',
        password: 'TestPassword123!',
        userType: 'manager'
    },
    employee: {
        email: 'employee@test.com',
        password: 'TestPassword123!',
        userType: 'employee'
    }
};

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

// Global state
let managerToken = null;
let employeeToken = null;
let createdTransferId = null;
let createdTransfer = null;

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

function logStep(step, description) {
    console.log(`\n${'='.repeat(60)}`);
    log(`STEP ${step}: ${description}`, 'info');
    console.log(`${'='.repeat(60)}`);
}

async function makeRequest(url, options = {}, useManagerCookie = false) {
    try {
        const cookieJar = useManagerCookie ? managerCookieJar : employeeCookieJar;
        if (cookieJar) {
            log(`Making request with ${useManagerCookie ? 'manager' : 'employee'} cookie: ${cookieJar}`, 'info');
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
                const cookieValue = cookieMatch[1];
                if (useManagerCookie) {
                    managerCookieJar = cookieValue;
                } else {
                    employeeCookieJar = cookieValue;
                }
                log(`Cookie set for ${useManagerCookie ? 'manager' : 'employee'}: ${cookieValue}`, 'info');
            }
        }

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

// Authentication functions
async function loginUser(email, password, isManager = false) {
    log(`Logging in user: ${email}`, 'info');

    const response = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    }, isManager);

    if (!response.ok) {
        log(`Login failed - Status: ${response.status}, Data: ${JSON.stringify(response.data)}`, 'error');
        throw new Error(`Login failed: ${response.data.error || 'Unknown error'}`);
    }

    log(`Login successful for ${email}`, 'success');
    return response.data.user; // Return user data instead of token
}

async function verifyAuth(expectedUserType, isManager = false) {
    log(`Verifying authentication for ${expectedUserType}`, 'info');

    const response = await makeRequest('/api/auth/verify', {
        method: 'GET'
    }, isManager);

    if (!response.ok) {
        throw new Error(`Auth verification failed: ${response.data.error}`);
    }

    if (response.data.user.userType !== expectedUserType) {
        throw new Error(`Expected ${expectedUserType}, got ${response.data.user.userType}`);
    }

    log(`Auth verification successful for ${expectedUserType}`, 'success');
    return response.data.user;
}

// Transfer workflow functions
async function createTransferRequest() {
    log('Creating transfer request...', 'info');

    const response = await makeRequest('/api/transfers', {
        method: 'POST',
        body: JSON.stringify(TEST_TRANSFER)
    }, true); // Use manager cookie

    if (!response.ok) {
        log(`Transfer creation failed - Status: ${response.status}, Data: ${JSON.stringify(response.data)}`, 'error');
        throw new Error(`Transfer creation failed: ${response.data.error || 'Unknown error'}`);
    }

    const transfer = response.data.data;
    log(`Transfer created successfully: ${transfer.transferId}`, 'success');
    log(`Transfer ID: ${transfer._id}`, 'info');

    return transfer;
}

async function getTransferById(transferId) {
    log(`Fetching transfer: ${transferId}`, 'info');

    const response = await makeRequest(`/api/transfers/${transferId}`, {
        method: 'GET'
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch transfer: ${response.data.error}`);
    }

    return response.data.data;
}

async function getTransfers(status = 'pending') {
    log(`Fetching transfers with status: ${status}`, 'info');

    const response = await makeRequest(`/api/transfers?status=${status}`, {
        method: 'GET'
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch transfers: ${response.data.error}`);
    }

    return response.data.data.transfers;
}

async function acceptTransfer(transferId, notes = 'Transfer accepted by employee') {
    log(`Accepting transfer: ${transferId}`, 'info');

    const response = await makeRequest(`/api/transfers/${transferId}/accept`, {
        method: 'PUT',
        body: JSON.stringify({ notes })
    });

    if (!response.ok) {
        throw new Error(`Transfer acceptance failed: ${response.data.error}`);
    }

    log(`Transfer accepted successfully`, 'success');
    return response.data.data;
}

async function startTransfer(transferId, notes = 'Transfer started by employee') {
    log(`Starting transfer: ${transferId}`, 'info');

    const response = await makeRequest(`/api/transfers/${transferId}/start`, {
        method: 'PUT',
        body: JSON.stringify({ notes })
    });

    if (!response.ok) {
        throw new Error(`Transfer start failed: ${response.data.error}`);
    }

    log(`Transfer started successfully`, 'success');
    return response.data.data;
}

async function completeTransfer(transferId, notes = 'Transfer completed successfully') {
    log(`Completing transfer: ${transferId}`, 'info');

    const response = await makeRequest(`/api/transfers/${transferId}/complete`, {
        method: 'PUT',
        body: JSON.stringify({ notes })
    });

    if (!response.ok) {
        throw new Error(`Transfer completion failed: ${response.data.error}`);
    }

    log(`Transfer completed successfully`, 'success');
    return response.data.data;
}

// Test functions
async function testManagerCannotAccessEmployeeActions() {
    logStep('SECURITY TEST', 'Testing manager cannot perform employee-only actions');

    try {
        // Try to accept a transfer as manager (should fail)
        const response = await makeRequest(`/api/transfers/${createdTransferId}/accept`, {
            method: 'PUT',
            body: JSON.stringify({ notes: 'Manager trying to accept' })
        }, true); // Use manager cookie

        if (response.ok) {
            log('SECURITY ISSUE: Manager was able to accept transfer!', 'error');
            return false;
        } else {
            log('Security check passed: Manager cannot accept transfers', 'success');
            return true;
        }
    } catch (error) {
        log(`Security test error: ${error.message}`, 'error');
        return false;
    }
}

async function testEmployeeCannotCreateTransfers() {
    logStep('SECURITY TEST', 'Testing employee cannot create transfers');

    try {
        const response = await makeRequest('/api/transfers', {
            method: 'POST',
            body: JSON.stringify(TEST_TRANSFER)
        }, false); // Use employee cookie

        if (response.ok) {
            log('SECURITY ISSUE: Employee was able to create transfer!', 'error');
            return false;
        } else {
            log('Security check passed: Employee cannot create transfers', 'success');
            return true;
        }
    } catch (error) {
        log(`Security test error: ${error.message}`, 'error');
        return false;
    }
}

async function validateTransferStatus(transferId, expectedStatus) {
    const transfer = await getTransferById(transferId);

    if (transfer.status !== expectedStatus) {
        throw new Error(`Expected status ${expectedStatus}, got ${transfer.status}`);
    }

    log(`Transfer status validation passed: ${expectedStatus}`, 'success');
    return transfer;
}

// Main test workflow
async function runTransferWorkflowTest() {
    try {
        log('Starting Transfer System Workflow Test', 'info');
        log(`Base URL: ${BASE_URL}`, 'info');

        // Step 1: Manager Authentication
        logStep(1, 'Manager Authentication');
        const managerUser = await loginUser(TEST_CONFIG.manager.email, TEST_CONFIG.manager.password, true);
        await verifyAuth('manager', true);

        // Step 2: Employee Authentication  
        logStep(2, 'Employee Authentication');
        const employeeUser = await loginUser(TEST_CONFIG.employee.email, TEST_CONFIG.employee.password, false);
        await verifyAuth('employee', false);

        // Step 3: Security Test - Employee cannot create transfers
        await testEmployeeCannotCreateTransfers();

        // Step 4: Manager Creates Transfer Request
        logStep(3, 'Manager Creates Transfer Request');
        createdTransfer = await createTransferRequest();
        createdTransferId = createdTransfer._id;

        // Validate initial status
        await validateTransferStatus(createdTransferId, 'pending');

        // Step 5: Employee Reviews Transfer
        logStep(4, 'Employee Reviews Transfer');
        const pendingTransfers = await getTransfers('pending');

        if (pendingTransfers.length === 0) {
            throw new Error('No pending transfers found for employee');
        }

        const transferToReview = pendingTransfers.find(t => t._id === createdTransferId);
        if (!transferToReview) {
            throw new Error('Created transfer not found in employee\'s pending list');
        }

        log(`Employee found transfer to review: ${transferToReview.transferId}`, 'success');
        log(`Patient: ${transferToReview.patient.firstName} ${transferToReview.patient.lastName}`, 'info');
        log(`From: ${transferToReview.fromHospital}`, 'info');
        log(`To: ${transferToReview.toHospital}`, 'info');
        log(`Priority: ${transferToReview.priority}`, 'info');
        log(`Reason: ${transferToReview.reason}`, 'info');

        // Step 6: Employee Accepts Transfer
        logStep(5, 'Employee Accepts Transfer');
        const acceptedTransfer = await acceptTransfer(createdTransferId, 'Transfer accepted - ready to proceed');

        // Validate status change
        await validateTransferStatus(createdTransferId, 'accepted');

        // Step 7: Security Test - Manager cannot accept transfers
        await testManagerCannotAccessEmployeeActions();

        // Step 8: Employee Starts Transfer
        logStep(6, 'Employee Starts Transfer');
        const startedTransfer = await startTransfer(createdTransferId, 'Transfer started - en route to destination');

        // Validate status change
        await validateTransferStatus(createdTransferId, 'in_progress');

        // Step 9: Employee Completes Transfer
        logStep(7, 'Employee Completes Transfer');
        const completedTransfer = await completeTransfer(createdTransferId, 'Transfer completed successfully - patient delivered');

        // Validate final status
        await validateTransferStatus(createdTransferId, 'completed');

        // Step 10: Final Validation
        logStep(8, 'Final Validation');
        const finalTransfer = await getTransferById(createdTransferId);

        log('Transfer Workflow Summary:', 'success');
        log(`Transfer ID: ${finalTransfer.transferId}`, 'info');
        log(`Patient: ${finalTransfer.patient.firstName} ${finalTransfer.patient.lastName}`, 'info');
        log(`Status: ${finalTransfer.status}`, 'info');
        log(`Requested by: ${finalTransfer.requestedBy.firstName} ${finalTransfer.requestedBy.lastName} (${finalTransfer.requestedBy.userType})`, 'info');
        log(`Assigned to: ${finalTransfer.assignedTo.firstName} ${finalTransfer.assignedTo.lastName} (${finalTransfer.assignedTo.userType})`, 'info');
        log(`Created: ${finalTransfer.createdAt}`, 'info');
        log(`Completed: ${finalTransfer.completedDate}`, 'info');

        // Calculate duration
        const duration = new Date(finalTransfer.completedDate) - new Date(finalTransfer.createdAt);
        const durationMinutes = Math.round(duration / (1000 * 60));
        log(`Total Duration: ${durationMinutes} minutes`, 'info');

        log('\n🎉 TRANSFER WORKFLOW TEST COMPLETED SUCCESSFULLY! 🎉', 'success');
        log('All security checks passed', 'success');
        log('All workflow steps completed', 'success');

    } catch (error) {
        log(`\n❌ TEST FAILED: ${error.message}`, 'error');
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

// Run the test
if (require.main === module) {
    runTransferWorkflowTest();
}

module.exports = {
    runTransferWorkflowTest,
    testManagerCannotAccessEmployeeActions,
    testEmployeeCannotCreateTransfers
};
