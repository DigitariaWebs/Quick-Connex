#!/usr/bin/env node

/**
 * Master Test Runner
 * Runs all authentication and security tests
 */

const { spawn } = require('child_process');
const path = require('path');

const tests = [
    {
        name: 'Quick Authentication Test',
        script: 'quick-auth-test.js',
        description: 'Basic connectivity and endpoint tests'
    },
    {
        name: 'JWT Authentication Test',
        script: 'test-jwt.js',
        description: 'JWT token creation, validation, and security'
    },
    {
        name: 'API Endpoints Test',
        script: 'test-api-endpoints.js',
        description: 'API endpoint authentication and functionality'
    },
    {
        name: 'Comprehensive Security Test',
        script: 'test-authentication.js',
        description: 'Full security test suite including rate limiting'
    }
];

function runTest(test) {
    return new Promise((resolve, reject) => {
        console.log(`\n🚀 Running ${test.name}`);
        console.log(`📝 ${test.description}`);
        console.log('='.repeat(50));

        const scriptPath = path.join(__dirname, test.script);
        const child = spawn('node', [scriptPath], {
            stdio: 'inherit',
            cwd: __dirname
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`\n✅ ${test.name} completed successfully`);
                resolve({ name: test.name, passed: true, code });
            } else {
                console.log(`\n❌ ${test.name} failed with exit code ${code}`);
                resolve({ name: test.name, passed: false, code });
            }
        });

        child.on('error', (error) => {
            console.log(`\n❌ ${test.name} failed to start: ${error.message}`);
            reject(error);
        });
    });
}

async function runAllTests() {
    console.log('🧪 Master Test Suite Runner');
    console.log('============================');
    console.log('This will run all authentication and security tests.\n');

    const results = [];
    let totalPassed = 0;
    let totalFailed = 0;

    for (const test of tests) {
        try {
            const result = await runTest(test);
            results.push(result);

            if (result.passed) {
                totalPassed++;
            } else {
                totalFailed++;
            }
        } catch (error) {
            console.log(`❌ Failed to run ${test.name}: ${error.message}`);
            results.push({ name: test.name, passed: false, code: -1 });
            totalFailed++;
        }
    }

    // Print final results
    console.log('\n📊 Final Test Results');
    console.log('=====================');
    console.log(`Total Test Suites: ${tests.length}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Success Rate: ${((totalPassed / tests.length) * 100).toFixed(1)}%`);

    console.log('\n📋 Detailed Results:');
    results.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        console.log(`  ${status} ${result.name} (exit code: ${result.code})`);
    });

    if (totalFailed === 0) {
        console.log('\n🎉 All test suites passed!');
        console.log('Your authentication system is secure and working correctly.');
    } else {
        console.log('\n⚠️  Some test suites failed.');
        console.log('Please review the failed tests and fix any issues.');
    }

    // Exit with appropriate code
    process.exit(totalFailed > 0 ? 1 : 0);
}

// Handle script execution
if (require.main === module) {
    runAllTests().catch(error => {
        console.log(`Fatal error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { runAllTests };
