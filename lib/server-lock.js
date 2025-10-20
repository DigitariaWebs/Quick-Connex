const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Server Lock Manager
 * Prevents multiple server instances from running on the same port
 */
class ServerLock {
    constructor(port = 3000) {
        this.port = port;
        this.lockFile = path.join(os.tmpdir(), `patients-management-server-${port}.lock`);
        this.server = null;
        this.isLocked = false;
    }

    /**
     * Check if port is available and create lock
     */
    async acquireLock() {
        return new Promise((resolve, reject) => {
            // First, try to create a lock file atomically
            try {
                if (fs.existsSync(this.lockFile)) {
                    // Check if the process in the lock file is still running
                    const lockData = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));
                    if (this.isProcessRunning(lockData.pid)) {
                        reject(new Error(`Server already running on port ${this.port} (PID: ${lockData.pid})`));
                        return;
                    } else {
                        // Process is dead, remove stale lock file
                        fs.unlinkSync(this.lockFile);
                    }
                }
            } catch (error) {
                // Lock file is corrupted or doesn't exist, continue
            }

            // Create a test server to check if port is available
            this.server = net.createServer();

            this.server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    reject(new Error(`Port ${this.port} is already in use`));
                } else {
                    reject(err);
                }
            });

            this.server.listen(this.port, () => {
                // Port is available, create lock file
                const lockData = {
                    pid: process.pid,
                    port: this.port,
                    timestamp: new Date().toISOString(),
                    hostname: os.hostname()
                };

                try {
                    fs.writeFileSync(this.lockFile, JSON.stringify(lockData, null, 2));
                    this.isLocked = true;

                    console.log(`🔒 Server lock acquired for port ${this.port}`);
                    resolve();
                } catch (error) {
                    this.server.close();
                    reject(new Error(`Failed to create lock file: ${error.message}`));
                }
            });
        });
    }

    /**
     * Check if a process is still running
     */
    isProcessRunning(pid) {
        try {
            process.kill(pid, 0);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Release the lock and close the test server
     */
    releaseLock() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }

        if (this.isLocked && fs.existsSync(this.lockFile)) {
            try {
                fs.unlinkSync(this.lockFile);
                console.log(`🔓 Server lock released for port ${this.port}`);
            } catch (error) {
                console.warn(`⚠️  Could not remove lock file: ${error.message}`);
            }
            this.isLocked = false;
        }
    }

    /**
     * Clean up on process exit
     */
    setupCleanup() {
        const cleanup = () => {
            this.releaseLock();
            process.exit(0);
        };

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('exit', cleanup);
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            cleanup();
        });
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            cleanup();
        });
    }
}

module.exports = ServerLock;
