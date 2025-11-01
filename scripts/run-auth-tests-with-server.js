#!/usr/bin/env node

/**
 * Authentication Test Runner with Server
 * 
 * Starts the backend server and runs authentication tests.
 * Useful for automated testing and CI/CD.
 */

const { spawn } = require('child_process');
const path = require('path');

const SERVER_PORT = 3001;
const SERVER_STARTUP_TIMEOUT = 10000; // 10 seconds
const TEST_TIMEOUT = 30000; // 30 seconds

let serverProcess = null;

// Utility functions
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
}

function waitForServer() {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const checkServer = async () => {
            try {
                const axios = require('axios');
                const response = await axios.get(`http://localhost:${SERVER_PORT}/api/health`, {
                    timeout: 1000
                });
                resolve(true);
            } catch (error) {
                if (Date.now() - startTime > SERVER_STARTUP_TIMEOUT) {
                    reject(new Error('Server startup timeout'));
                } else {
                    setTimeout(checkServer, 500);
                }
            }
        };

        checkServer();
    });
}

function startServer() {
    return new Promise((resolve, reject) => {
        log('Starting backend server...');

        serverProcess = spawn('npm', ['run', 'dev:server'], {
            cwd: path.join(__dirname, '..'),
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let serverOutput = '';

        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            serverOutput += output;

            // Look for server startup indicators
            if (output.includes('Server running on port') ||
                output.includes('listening on port') ||
                output.includes('started on port')) {
                log('Server startup detected');
                resolve();
            }
        });

        serverProcess.stderr.on('data', (data) => {
            const output = data.toString();
            serverOutput += output;
            log(`Server stderr: ${output}`, 'error');
        });

        serverProcess.on('error', (error) => {
            log(`Failed to start server: ${error.message}`, 'error');
            reject(error);
        });

        serverProcess.on('exit', (code) => {
            if (code !== 0) {
                log(`Server exited with code ${code}`, 'error');
                reject(new Error(`Server exited with code ${code}`));
            }
        });

        // Timeout for server startup
        setTimeout(() => {
            if (!serverProcess.killed) {
                log('Server startup timeout, but continuing...');
                resolve();
            }
        }, SERVER_STARTUP_TIMEOUT);
    });
}

function stopServer() {
    return new Promise((resolve) => {
        if (serverProcess && !serverProcess.killed) {
            log('Stopping server...');
            serverProcess.kill('SIGTERM');

            setTimeout(() => {
                if (!serverProcess.killed) {
                    serverProcess.kill('SIGKILL');
                }
                resolve();
            }, 5000);
        } else {
            resolve();
        }
    });
}

async function runTests() {
    return new Promise((resolve, reject) => {
        log('Running authentication tests...');

        const testProcess = spawn('npm', ['run', 'test:auth'], {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit'
        });

        testProcess.on('exit', (code) => {
            if (code === 0) {
                log('All tests passed!', 'success');
                resolve();
            } else {
                log(`Tests failed with exit code ${code}`, 'error');
                reject(new Error(`Tests failed with exit code ${code}`));
            }
        });

        testProcess.on('error', (error) => {
            log(`Failed to run tests: ${error.message}`, 'error');
            reject(error);
        });

        // Test timeout
        setTimeout(() => {
            testProcess.kill('SIGKILL');
            reject(new Error('Test timeout'));
        }, TEST_TIMEOUT);
    });
}

async function main() {
    try {
        log('🚀 Starting Authentication Test Suite with Server');
        log('================================================');

        // Start server
        await startServer();

        // Wait for server to be ready
        try {
            await waitForServer();
            log('Server is ready!', 'success');
        } catch (error) {
            log('Server may not be fully ready, but continuing with tests...');
        }

        // Run tests
        await runTests();

        log('🎯 Test suite completed successfully!', 'success');

    } catch (error) {
        log(`❌ Test suite failed: ${error.message}`, 'error');
        process.exit(1);
    } finally {
        // Cleanup
        await stopServer();
        log('Cleanup completed');
    }
}

// Handle process signals
process.on('SIGINT', async () => {
    log('Received SIGINT, cleaning up...');
    await stopServer();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    log('Received SIGTERM, cleaning up...');
    await stopServer();
    process.exit(0);
});

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        log(`Fatal error: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = { main };
