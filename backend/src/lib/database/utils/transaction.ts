/**
 * Transaction Utilities
 * 
 * Utilities for transaction wrapper, session management,
 * retry logic, and rollback operations.
 */

import { ClientSession } from 'mongoose';
import { log } from '../../logging';
import { 
  TransactionOptions, 
  TransactionCallback,
  TransactionError
} from '../../../types/database';
import { TIMEOUTS, RETRY_CONFIG } from '../core/constants';

/**
 * Execute operation with transaction wrapper
 */
export async function withTransaction<T>(
  session: ClientSession,
  callback: TransactionCallback<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await session.withTransaction(async () => {
      return await callback(session);
    }, {
      ...(options.readPreference ? { readPreference: options.readPreference } : {}),
      ...(options.readConcern ? { readConcern: options.readConcern } : {}),
      ...(options.writeConcern ? { writeConcern: options.writeConcern } : {}),
      ...(options.maxCommitTimeMS ? { maxCommitTimeMS: options.maxCommitTimeMS } : {}),
      ...(options.retryWrites !== undefined ? { retryWrites: options.retryWrites } : {})
    });
    
    const executionTime = Date.now() - startTime;
    
    log.database(`Transaction completed successfully in ${executionTime}ms`, { duration: executionTime });
    
    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    log.error(`Transaction failed after ${executionTime}ms`, error, { duration: executionTime });
    
    throw new TransactionError(
      `Transaction failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        originalError: error,
        executionTime,
        options
      }
    );
  }
}

/**
 * Start a new session with options
 */
export async function startSession(
  connection: any,
  options: TransactionOptions = {}
): Promise<ClientSession> {
  try {
    const session = await connection.startSession();
    
    // Configure session options
    if (options.readPreference) {
      session.options.readPreference = options.readPreference;
    }
    
    if (options.readConcern) {
      session.options.readConcern = options.readConcern;
    }
    
    if (options.writeConcern) {
      session.options.writeConcern = options.writeConcern;
    }
    
    return session;
  } catch (error) {
    throw new TransactionError(
      `Failed to start session: ${error instanceof Error ? error.message : String(error)}`,
      { originalError: error }
    );
  }
}

/**
 * End session safely
 */
export async function endSession(session: ClientSession): Promise<void> {
  try {
    await session.endSession();
  } catch (error) {
    log.error('Error ending session', error);
    // Don't throw here as session cleanup should be best effort
  }
}

/**
 * Execute multiple operations in a single transaction
 */
export async function executeInTransaction<T>(
  session: ClientSession,
  operations: TransactionCallback<T>[],
  options: TransactionOptions = {}
): Promise<T[]> {
  const results: T[] = [];
  
  try {
    await session.withTransaction(async () => {
      for (const operation of operations) {
        const result = await operation(session);
        results.push(result);
      }
    }, options);
    
    return results;
  } catch (error) {
    throw new TransactionError(
      `Batch transaction failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        originalError: error,
        operationCount: operations.length,
        completedOperations: results.length
      }
    );
  }
}

/**
 * Retry transaction with exponential backoff
 */
export async function retryTransaction<T>(
  session: ClientSession,
  callback: TransactionCallback<T>,
  options: TransactionOptions & {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? RETRY_CONFIG.MAX_ATTEMPTS;
  const baseDelay = options.baseDelay ?? RETRY_CONFIG.BACKOFF_MULTIPLIER * 1000;
  const maxDelay = options.maxDelay ?? TIMEOUTS.MAX_RETRY_DELAY;
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withTransaction(session, callback, options);
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        break;
      }
      
      // Check if error is retryable
      if (!isRetryableTransactionError(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt - 1) + Math.random() * 1000,
        maxDelay
      );
      
      log.warn(`Transaction attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Check if transaction error is retryable
 */
export function isRetryableTransactionError(error: any): boolean {
  const retryableErrors = [
    'TransientTransactionError',
    'UnknownTransactionCommitResult',
    'MongoNetworkError',
    'MongoTimeoutError'
  ];
  
  const retryableErrorCodes = [
    6, 7, 8, 24, 50, 51, 64, 91, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200
  ];
  
  return retryableErrors.includes(error.name) || 
         retryableErrors.includes(error.codeName) ||
         (error.code && retryableErrorCodes.includes(error.code));
}

/**
 * Create transaction timeout
 */
export function createTransactionTimeout(timeout: number = TIMEOUTS.TRANSACTION): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new TransactionError(`Transaction timeout after ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Wrap operation with timeout
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeout: number = TIMEOUTS.TRANSACTION
): Promise<T> {
  return Promise.race([
    operation,
    createTransactionTimeout(timeout)
  ]);
}

/**
 * Validate session state
 */
export function validateSession(session: ClientSession): boolean {
  return session && !session.hasEnded;
}

/**
 * Get session info for logging
 */
export function getSessionInfo(session: ClientSession): Record<string, any> {
  return {
    id: session.id,
    hasEnded: session.hasEnded,
    serverSession: session.serverSession ? {
      id: session.serverSession.id,
      lastUse: session.serverSession.lastUse
    } : null
  };
}

/**
 * Create transaction context
 */
export function createTransactionContext(
  session: ClientSession,
  options: TransactionOptions = {}
): TransactionContext {
  return {
    session,
    options,
    startTime: Date.now(),
    operations: [],
    retryCount: 0
  };
}

/**
 * Transaction context interface
 */
export interface TransactionContext {
  session: ClientSession;
  options: TransactionOptions;
  startTime: number;
  operations: string[];
  retryCount: number;
}

/**
 * Add operation to transaction context
 */
export function addOperationToContext(
  context: TransactionContext,
  operation: string
): void {
  context.operations.push(operation);
}

/**
 * Get transaction statistics
 */
export function getTransactionStats(context: TransactionContext): Record<string, any> {
  return {
    duration: Date.now() - context.startTime,
    operationCount: context.operations.length,
    operations: context.operations,
    retryCount: context.retryCount,
    sessionId: context.session.id
  };
}

/**
 * Cleanup transaction resources
 */
export async function cleanupTransaction(session: ClientSession): Promise<void> {
  try {
    if (!session.hasEnded) {
      await session.abortTransaction();
    }
  } catch (error) {
    log.error('Error aborting transaction', error);
  } finally {
    await endSession(session);
  }
}

/**
 * Transaction middleware for automatic cleanup
 */
export function withTransactionCleanup<T>(
  session: ClientSession,
  callback: TransactionCallback<T>,
  options: TransactionOptions = {}
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await withTransaction(session, callback, options);
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      await cleanupTransaction(session);
    }
  });
}
