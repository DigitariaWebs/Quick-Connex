#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Test configuration
const TESTS = [
    {
        name: 'GridFS Utilities Test',
        script: 'gridfs-utilities-test.js',
        description: 'Tests GridFS utilities, file validation, and basic operations'
    },
    {
        name: 'Comprehensive GridFS Test',
        script: 'comprehensive-gridfs-test.js',
        description: 'Full test suite with all GridFS operations and edge cases'
    },
    {
        name: 'File-User Relationships Verification',
        script: 'verify-file-user-relationships.js',
        description: 'Verifies data integrity and file-user associations'
    }
];

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

function runTest(test) {
    return new Promise((resolve) => {
        console.log(`\n${colorize('🧪', 'cyan')} Running: ${colorize(test.name, 'bright')}`);
        console.log(`${colorize('📝', 'blue')} Description: ${test.description}`);
        console.log(`${colorize('📄', 'blue')} Script: ${test.script}`);
        console.log('─'.repeat(60));

        const scriptPath = path.join(__dirname, test.script);
        const child = spawn('node', [scriptPath], {
            stdio: 'inherit',
            cwd: __dirname
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`${colorize('✅', 'green')} ${test.name} completed successfully`);
                resolve({ name: test.name, status: 'PASS', code });
            } else {
                console.log(`${colorize('❌', 'red')} ${test.name} failed with exit code ${code}`);
                resolve({ name: test.name, status: 'FAIL', code });
            }
        });

        child.on('error', (error) => {
            console.log(`${colorize('❌', 'red')} ${test.name} failed to start: ${error.message}`);
            resolve({ name: test.name, status: 'ERROR', code: -1, error: error.message });
        });
    });
}

async function runAllTests() {
    console.log(colorize('🚀 GridFS Test Suite Runner', 'bright'));
    console.log('='.repeat(60));
    console.log(`${colorize('📊', 'blue')} Total Tests: ${TESTS.length}`);
    console.log(`${colorize('⏰', 'blue')} Started at: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));

    const startTime = Date.now();
    const results = [];

    // Run tests sequentially to avoid conflicts
    for (const test of TESTS) {
        const result = await runTest(test);
        results.push(result);

        // Add a small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log(colorize('📊 TEST SUMMARY', 'bright'));
    console.log('='.repeat(60));
    console.log(`${colorize('⏱️', 'blue')} Total Time: ${totalTime}ms`);
    console.log(`${colorize('✅', 'green')} Passed: ${results.filter(r => r.status === 'PASS').length}`);
    console.log(`${colorize('❌', 'red')} Failed: ${results.filter(r => r.status === 'FAIL').length}`);
    console.log(`${colorize('⚠️', 'yellow')} Errors: ${results.filter(r => r.status === 'ERROR').length}`);
    console.log(`${colorize('📊', 'blue')} Total: ${results.length}`);

    // Detailed results
    console.log('\n' + colorize('📋 DETAILED RESULTS', 'bright'));
    console.log('─'.repeat(60));

    results.forEach(result => {
        const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
        const statusColor = result.status === 'PASS' ? 'green' : result.status === 'FAIL' ? 'red' : 'yellow';
        console.log(`${statusIcon} ${colorize(result.name, statusColor)} - ${result.status} (exit code: ${result.code})`);
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    });

    // Success rate
    const successRate = (results.filter(r => r.status === 'PASS').length / results.length) * 100;
    console.log(`\n${colorize('📈', 'blue')} Success Rate: ${successRate.toFixed(1)}%`);

    if (successRate === 100) {
        console.log(colorize('\n🎉 All tests passed! GridFS implementation is working correctly.', 'green'));
    } else {
        console.log(colorize('\n⚠️ Some tests failed. Please review the results above.', 'yellow'));
    }

    console.log('\n' + '='.repeat(60));
    console.log(`${colorize('🏁', 'cyan')} Test suite completed at: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));

    // Exit with appropriate code
    const hasFailures = results.some(r => r.status === 'FAIL' || r.status === 'ERROR');
    process.exit(hasFailures ? 1 : 0);
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(colorize('GridFS Test Suite Runner', 'bright'));
    console.log('\nUsage:');
    console.log('  node run-gridfs-tests.js [options]');
    console.log('\nOptions:');
    console.log('  --help, -h     Show this help message');
    console.log('  --list, -l     List available tests');
    console.log('  --single <n>   Run only the nth test (1-based index)');
    console.log('\nAvailable Tests:');
    TESTS.forEach((test, index) => {
        console.log(`  ${index + 1}. ${test.name}`);
        console.log(`     ${test.description}`);
    });
    process.exit(0);
}

if (args.includes('--list') || args.includes('-l')) {
    console.log(colorize('Available GridFS Tests:', 'bright'));
    TESTS.forEach((test, index) => {
        console.log(`\n${index + 1}. ${colorize(test.name, 'cyan')}`);
        console.log(`   Description: ${test.description}`);
        console.log(`   Script: ${test.script}`);
    });
    process.exit(0);
}

const singleTestIndex = args.findIndex(arg => arg === '--single' || arg === '-s');
if (singleTestIndex !== -1 && args[singleTestIndex + 1]) {
    const testNumber = parseInt(args[singleTestIndex + 1]);
    if (testNumber >= 1 && testNumber <= TESTS.length) {
        const test = TESTS[testNumber - 1];
        console.log(colorize(`Running single test: ${test.name}`, 'bright'));
        runTest(test).then(result => {
            const statusIcon = result.status === 'PASS' ? '✅' : '❌';
            console.log(`\n${statusIcon} Test completed: ${result.status}`);
            process.exit(result.status === 'PASS' ? 0 : 1);
        }).catch(console.error);
    } else {
        console.log(colorize('❌ Invalid test number. Use --list to see available tests.', 'red'));
        process.exit(1);
    }
} else {
    // Run all tests
    runAllTests().catch(console.error);
}
