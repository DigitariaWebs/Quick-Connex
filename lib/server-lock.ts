import { createServer, Server } from 'net';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

/**
 * Server Lock Manager
 * Prevents multiple server instances from running on the same port
 * with improved error handling, race condition prevention, and cross-platform support
 */

interface LockData {
  pid: number;
  port: number;
  timestamp: string;
  hostname: string;
  ttl?: number;
}

interface ServerLockOptions {
  timeout?: number;           // Lock acquisition timeout
  retryAttempts?: number;    // Number of retry attempts
  retryDelay?: number;       // Delay between retries
  lockFileTTL?: number;      // Lock file TTL (5 minutes)
}

interface LockStatus {
  locked: boolean;
  pid?: number;
  timestamp?: string;
  hostname?: string;
  expired?: boolean;
  processRunning?: boolean;
  error?: string;
  message?: string;
}

interface CleanupHandler {
  event: string;
  handler: () => void;
}

export class ServerLock {
  private port: number;
  private options: Required<ServerLockOptions>;
  private lockFile: string;
  private server: Server | null = null;
  private isLocked: boolean = false;
  private cleanupHandlers: Set<CleanupHandler> = new Set();

  constructor(port: number = 3000, options: ServerLockOptions = {}) {
    this.port = port;
    this.options = {
      timeout: 5000,           // Lock acquisition timeout
      retryAttempts: 3,       // Number of retry attempts
      retryDelay: 1000,        // Delay between retries
      lockFileTTL: 300000,     // Lock file TTL (5 minutes)
      ...options
    };
    
    this.lockFile = path.join(os.tmpdir(), `patients-management-server-${port}.lock`);
  }

  /**
   * Acquire lock with improved error handling and retry logic
   */
  async acquireLock(): Promise<void> {
    let attempts = 0;
    const maxAttempts = this.options.retryAttempts;

    while (attempts < maxAttempts) {
      try {
        await this._attemptLockAcquisition();
        console.log(`🔒 Server lock acquired for port ${this.port} (attempt ${attempts + 1})`);
        return;
      } catch (error) {
        attempts++;
        
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to acquire lock after ${maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        console.log(`⚠️ Lock acquisition failed (attempt ${attempts}/${maxAttempts}): ${error instanceof Error ? error.message : String(error)}`);
        await this._delay(this.options.retryDelay);
      }
    }
  }

  /**
   * Attempt to acquire lock with race condition prevention
   */
  private async _attemptLockAcquisition(): Promise<void> {
    // Check for existing lock file
    await this._checkExistingLock();
    
    // Test port availability
    await this._testPortAvailability();
    
    // Create lock file atomically
    await this._createLockFile();
  }

  /**
   * Check existing lock file with improved error handling
   */
  private async _checkExistingLock(): Promise<void> {
    try {
      const lockData = await this._readLockFile();
      
      if (lockData) {
        // Check if lock is expired
        if (this._isLockExpired(lockData)) {
          console.log(`🧹 Removing expired lock file (TTL exceeded)`);
          await this._removeLockFile();
          return;
        }
        
        // Check if process is still running
        if (await this._isProcessRunning(lockData.pid)) {
          throw new Error(`Server already running on port ${this.port} (PID: ${lockData.pid}, started: ${lockData.timestamp})`);
        } else {
          console.log(`🧹 Removing stale lock file (process ${lockData.pid} not running)`);
          await this._removeLockFile();
        }
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // Lock file doesn't exist, continue
        return;
      }
      throw new Error(`Failed to check existing lock: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Test port availability with timeout
   */
  private async _testPortAvailability(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.server) {
          this.server.close();
        }
        reject(new Error(`Port ${this.port} test timed out`));
      }, this.options.timeout);

      this.server = createServer();
      
      this.server.on('error', (err: NodeJS.ErrnoException) => {
        clearTimeout(timeout);
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.port} is already in use by another application`));
        } else {
          reject(new Error(`Port test failed: ${err.message}`));
        }
      });

      this.server.on('listening', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.server.listen(this.port);
    });
  }

  /**
   * Create lock file atomically
   */
  private async _createLockFile(): Promise<void> {
    const lockData: LockData = {
      pid: process.pid,
      port: this.port,
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      ttl: this.options.lockFileTTL
    };

    try {
      // Use atomic write to prevent race conditions
      const tempFile = `${this.lockFile}.tmp`;
      await fs.writeFile(tempFile, JSON.stringify(lockData, null, 2), { flag: 'wx' });
      await fs.rename(tempFile, this.lockFile);
      
      this.isLocked = true;
    } catch (error) {
      if (this.server) {
        this.server.close();
      }
      throw new Error(`Failed to create lock file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Read lock file with error handling
   */
  private async _readLockFile(): Promise<LockData | null> {
    try {
      const data = await fs.readFile(this.lockFile, 'utf8');
      return JSON.parse(data) as LockData;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if lock file is expired
   */
  private _isLockExpired(lockData: LockData): boolean {
    const now = Date.now();
    const lockTime = new Date(lockData.timestamp).getTime();
    const ttl = lockData.ttl || this.options.lockFileTTL;
    
    return (now - lockTime) > ttl;
  }

  /**
   * Improved process detection with cross-platform support
   */
  private async _isProcessRunning(pid: number): Promise<boolean> {
    try {
      // Use process.kill with signal 0 (no-op signal)
      process.kill(pid, 0);
      return true;
    } catch (error) {
      // ESRCH = No such process
      if (error instanceof Error && 'code' in error && error.code === 'ESRCH') {
        return false;
      }
      // Other errors might indicate permission issues
      console.warn(`⚠️ Could not check process ${pid}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Remove lock file safely
   */
  private async _removeLockFile(): Promise<void> {
    try {
      await fs.unlink(this.lockFile);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
        console.warn(`⚠️ Could not remove lock file: ${error.message}`);
      }
    }
  }

  /**
   * Utility delay function
   */
  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Release lock with improved cleanup
   */
  async releaseLock(): Promise<void> {
    const cleanupPromises: Promise<void>[] = [];

    // Close test server
    if (this.server) {
      cleanupPromises.push(
        new Promise<void>((resolve) => {
          this.server!.close(() => resolve());
        })
      );
      this.server = null;
    }

    // Remove lock file
    if (this.isLocked) {
      cleanupPromises.push(this._removeLockFile());
      this.isLocked = false;
    }

    // Execute cleanup
    try {
      await Promise.all(cleanupPromises);
      console.log(`🔓 Server lock released for port ${this.port}`);
    } catch (error) {
      console.warn(`⚠️ Error during lock cleanup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Setup cleanup handlers with improved error handling
   */
  setupCleanup(): void {
    const cleanup = async (): Promise<void> => {
      try {
        await this.releaseLock();
        process.exit(0);
      } catch (error) {
        console.error(`❌ Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    };

    const handlers: Array<{ event: string; name: string }> = [
      { event: 'SIGINT', name: 'SIGINT' },
      { event: 'SIGTERM', name: 'SIGTERM' },
      { event: 'exit', name: 'exit' }
    ];

    handlers.forEach(({ event, name }) => {
      const handler = (): void => {
        console.log(`🛑 Received ${name}, cleaning up...`);
        cleanup();
      };
      
      process.on(event as NodeJS.Signals, handler);
      this.cleanupHandlers.add({ event, handler });
    });

    // Handle uncaught exceptions and rejections
    const errorHandler = (error: Error): void => {
      console.error(`🚨 Uncaught error: ${error.message || String(error)}`);
      cleanup();
    };

    process.on('uncaughtException', errorHandler);
    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      console.error(`🚨 Unhandled rejection: ${String(reason)}`);
      errorHandler(new Error(String(reason)));
    });
  }

  /**
   * Get lock status for debugging
   */
  async getLockStatus(): Promise<LockStatus> {
    try {
      const lockData = await this._readLockFile();
      if (!lockData) {
        return { locked: false, message: 'No lock file found' };
      }

      const isExpired = this._isLockExpired(lockData);
      const isProcessRunning = await this._isProcessRunning(lockData.pid);

      return {
        locked: !isExpired && isProcessRunning,
        pid: lockData.pid,
        timestamp: lockData.timestamp,
        hostname: lockData.hostname,
        expired: isExpired,
        processRunning: isProcessRunning
      };
    } catch (error) {
      return { 
        locked: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Check if lock is currently held
   */
  isLocked(): boolean {
    return this.isLocked;
  }

  /**
   * Get the port this lock is for
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Get lock file path for debugging
   */
  getLockFilePath(): string {
    return this.lockFile;
  }
}
