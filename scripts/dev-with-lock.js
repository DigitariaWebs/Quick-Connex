#!/usr/bin/env node

/**
 * Development server with port locking
 * Prevents multiple Next.js dev servers from running simultaneously
 */

const { spawn } = require('child_process');
const ServerLock = require('../lib/server-lock');

const PORT = 3000;
const serverLock = new ServerLock(PORT);

async function startDevServer() {
    try {
        // Try to acquire lock first
        await serverLock.acquireLock();
        serverLock.setupCleanup();

        console.log('🚀 Starting Next.js development server...');
        console.log('🔒 Port lock acquired - preventing multiple instances');

        // Start Next.js dev server
        const nextProcess = spawn('npx', ['next', 'dev', '--turbopack'], {
            stdio: 'inherit',
            shell: true
        });

        // Handle process exit
        nextProcess.on('exit', (code) => {
            console.log(`\n🛑 Next.js dev server exited with code ${code}`);
            serverLock.releaseLock();
            process.exit(code);
        });

        nextProcess.on('error', (error) => {
            console.error('❌ Failed to start Next.js:', error);
            serverLock.releaseLock();
            process.exit(1);
        });

    } catch (error) {
        if (error.message.includes('already running') || error.message.includes('already in use')) {
            console.error(`❌ ${error.message}`);
            console.error('💡 To kill existing servers, run: npm run kill-servers');
            console.error('💡 Or use: npm run check-servers to see what\'s running');
        } else {
            console.error('❌ Failed to start development server:', error.message);
        }
        process.exit(1);
    }
}

startDevServer();

