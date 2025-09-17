#!/usr/bin/env node

/**
 * Transfer System Test Runner
 * 
 * This script orchestrates the complete testing of the transfer system:
 * 1. Sets up test users
 * 2. Runs the transfer workflow test
 * 3. Generates a test report
 * 
 * Usage: node scripts/run-transfer-tests.js [options]
 * 
 * Options:
 *   --skip-setup    Skip user setup (assumes users already exist)
 *   --url <url>     Set custom API base URL
 *   --verbose       Enable verbose logging
 */

const { setupTestUsers } = require('./setup-test-users');
const { runTransferWorkflowTest } = require('./test-transfer-workflow');

// Configuration
const args = process.argv.slice(2);
const config = {
    skipSetup: args.includes('--skip-setup'),
    verbose: args.includes('--verbose'),
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000'
};

// Extract custom URL if provided
const urlIndex = args.indexOf('--url');
if (urlIndex !== -1 && args[urlIndex + 1]) {
    config.baseUrl = args[urlIndex + 1];
    process.env.API_BASE_URL = config.baseUrl;
}

// Test results tracking
const testResults = {
    startTime: null,
    endTime: null,
    duration: null,
    setupSuccess: false,
    workflowSuccess: false,
    errors: [],
    warnings: []
};

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

    if (config.verbose || type === 'error' || type === 'success') {
        console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
    }
}

function logHeader(title) {
    console.log('\n' + '='.repeat(80));
    console.log(`  ${title}`);
    console.log('='.repeat(80));
}

function logSection(title) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  ${title}`);
    console.log(`${'─'.repeat(60)}`);
}

function generateTestReport() {
    logHeader('TRANSFER SYSTEM TEST REPORT');

    console.log(`Test Duration: ${testResults.duration}`);
    console.log(`Start Time: ${testResults.startTime}`);
    console.log(`End Time: ${testResults.endTime}`);
    console.log(`Base URL: ${config.baseUrl}`);

    logSection('Test Results');
    console.log(`✓ User Setup: ${testResults.setupSuccess ? 'PASSED' : 'FAILED'}`);
    console.log(`✓ Workflow Test: ${testResults.workflowSuccess ? 'PASSED' : 'FAILED'}`);

    if (testResults.errors.length > 0) {
        logSection('Errors');
        testResults.errors.forEach((error, index) => {
            console.log(`${index + 1}. ${error}`);
        });
    }

    if (testResults.warnings.length > 0) {
        logSection('Warnings');
        testResults.warnings.forEach((warning, index) => {
            console.log(`${index + 1}. ${warning}`);
        });
    }

    logSection('Overall Result');
    const allTestsPassed = testResults.setupSuccess && testResults.workflowSuccess;

    if (allTestsPassed) {
        console.log('🎉 ALL TESTS PASSED! 🎉');
        console.log('The transfer system is working correctly.');
        console.log('Manager-only transfer creation is properly enforced.');
        console.log('Employee workflow (accept → start → complete) is functional.');
    } else {
        console.log('❌ SOME TESTS FAILED');
        console.log('Please review the errors above and fix the issues.');
    }

    return allTestsPassed;
}

async function runSetupPhase() {
    if (config.skipSetup) {
        log('Skipping user setup phase', 'warning');
        testResults.setupSuccess = true;
        return;
    }

    logSection('Phase 1: User Setup');

    try {
        await setupTestUsers();
        testResults.setupSuccess = true;
        log('User setup completed successfully', 'success');
    } catch (error) {
        testResults.setupSuccess = false;
        testResults.errors.push(`User setup failed: ${error.message}`);
        log(`User setup failed: ${error.message}`, 'error');
        throw error;
    }
}

async function runWorkflowPhase() {
    logSection('Phase 2: Transfer Workflow Test');

    try {
        await runTransferWorkflowTest();
        testResults.workflowSuccess = true;
        log('Workflow test completed successfully', 'success');
    } catch (error) {
        testResults.workflowSuccess = false;
        testResults.errors.push(`Workflow test failed: ${error.message}`);
        log(`Workflow test failed: ${error.message}`, 'error');
        throw error;
    }
}

async function runAllTests() {
    testResults.startTime = new Date().toISOString();

    logHeader('TRANSFER SYSTEM COMPREHENSIVE TEST');
    log(`Starting tests at: ${testResults.startTime}`);
    log(`Base URL: ${config.baseUrl}`);
    log(`Skip Setup: ${config.skipSetup}`);
    log(`Verbose Mode: ${config.verbose}`);

    try {
        // Phase 1: Setup
        await runSetupPhase();

        // Phase 2: Workflow Test
        await runWorkflowPhase();

        // All tests passed
        testResults.endTime = new Date().toISOString();
        testResults.duration = new Date(testResults.endTime) - new Date(testResults.startTime);
        testResults.duration = `${Math.round(testResults.duration / 1000)}s`;

        const allPassed = generateTestReport();

        if (allPassed) {
            process.exit(0);
        } else {
            process.exit(1);
        }

    } catch (error) {
        testResults.endTime = new Date().toISOString();
        testResults.duration = new Date(testResults.endTime) - new Date(testResults.startTime);
        testResults.duration = `${Math.round(testResults.duration / 1000)}s`;

        generateTestReport();
        process.exit(1);
    }
}

// Help function
function showHelp() {
    console.log(`
Transfer System Test Runner

Usage: node scripts/run-transfer-tests.js [options]

Options:
  --skip-setup    Skip user setup (assumes users already exist)
  --url <url>     Set custom API base URL (default: http://localhost:3000)
  --verbose       Enable verbose logging
  --help          Show this help message

Examples:
  node scripts/run-transfer-tests.js
  node scripts/run-transfer-tests.js --skip-setup
  node scripts/run-transfer-tests.js --url http://localhost:3001 --verbose

Environment Variables:
  API_BASE_URL    Set the base URL for API requests
`);
}

// Main execution
if (require.main === module) {
    if (args.includes('--help')) {
        showHelp();
        process.exit(0);
    }

    runAllTests();
}

module.exports = {
    runAllTests,
    generateTestReport
};
