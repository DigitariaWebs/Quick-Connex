/**
 * Database Transaction Utilities
 * 
 * Transaction management and execution utilities for database operations.
 */

import { ClientSession, Types } from 'mongoose';
import { log } from '@/lib/logging';
import { DatabaseError } from '../../utils/error-handling';
import { TransactionOptions } from '../core/types';

/**
 * Create transaction options
 */
export function createTransactionOptions(options: Partial<TransactionOptions> = {}): TransactionOptions {
  return {
    readPreference: 'primary',
    writeConcern: { w: 'majority', j: true },
    maxCommitTimeMS: 30000,
    ...options
  };
}

/**
 * Execute database transaction
 */
export async function executeTransaction<T>(
  callback: (session: ClientSession) => Promise<T>,
  options: Partial<TransactionOptions> = {}
): Promise<T> {
  const session = await startSession();
  
  try {
    await session.withTransaction(async () => {
      return await callback(session);
    }, createTransactionOptions(options));
    
    return await callback(session);
  } catch (error) {
    log.error('Transaction failed:', error);
    throw new DatabaseError(`Transaction failed: ${(error as Error).message}`);
  } finally {
    await session.endSession();
  }
}

/**
 * Start database session
 */
export async function startSession(): Promise<ClientSession> {
  try {
    const mongoose = await import('mongoose');
    return await mongoose.startSession();
  } catch (error) {
    throw new DatabaseError(`Failed to start session: ${(error as Error).message}`);
  }
}

/**
 * Commit transaction
 */
export async function commitTransaction(session: ClientSession): Promise<void> {
  try {
    await session.commitTransaction();
  } catch (error) {
    throw new DatabaseError(`Failed to commit transaction: ${(error as Error).message}`);
  }
}

/**
 * Abort transaction
 */
export async function abortTransaction(session: ClientSession): Promise<void> {
  try {
    await session.abortTransaction();
  } catch (error) {
    throw new DatabaseError(`Failed to abort transaction: ${(error as Error).message}`);
  }
}

/**
 * Check if session is in transaction
 */
export function isInTransaction(session: ClientSession): boolean {
  return session.inTransaction();
}

/**
 * Get transaction state
 */
export function getTransactionState(session: ClientSession): string {
  if (!session.inTransaction()) {
    return 'not_started';
  }

  return (session.transaction as any)?.state || 'unknown';
}

// Note: TransactionOptions is now imported from core/types
