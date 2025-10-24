/**
 * Async Helpers
 * 
 * Asynchronous operation utilities for handling promises, retries, and concurrency.
 * Provides robust async patterns and error handling.
 */

// ===== TYPES =====

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (error: Error, attempt: number) => void;
  onError?: (error: Error) => void;
}

export interface TimeoutOptions {
  timeout: number;
  errorMessage?: string;
}

export interface BatchProcessOptions {
  batchSize: number;
  delayBetweenBatches?: number;
  onBatchComplete?: (batch: any[], index: number) => void;
  onError?: (error: Error, item: any, index: number) => void;
}

export interface ParallelOptions {
  limit: number;
  onComplete?: (result: any, index: number) => void;
  onError?: (error: Error, index: number) => void;
}

// ===== RETRY UTILITIES =====

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
    onError
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (onRetry) {
        onRetry(lastError, attempt);
      }
      
      if (attempt === maxAttempts) {
        if (onError) {
          onError(lastError);
        }
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      );
      
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

/**
 * Retry wrapper with simple options
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  return retry(fn, { maxAttempts, baseDelay: delay });
}

/**
 * Retry with custom retry condition
 */
export async function retryWithCondition<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: Error, attempt: number) => boolean,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
    onError
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (!shouldRetry(lastError, attempt)) {
        if (onError) {
          onError(lastError);
        }
        throw lastError;
      }
      
      if (onRetry) {
        onRetry(lastError, attempt);
      }
      
      if (attempt === maxAttempts) {
        if (onError) {
          onError(lastError);
        }
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      );
      
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

// ===== TIMEOUT UTILITIES =====

/**
 * Add timeout to promise
 */
export async function timeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions
): Promise<T> {
  const { timeout: timeoutMs, errorMessage = 'Operation timed out' } = options;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Timeout wrapper for functions
 */
export function withTimeout<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  timeoutMs: number,
  errorMessage?: string
) {
  return async (...args: T): Promise<R> => {
    return timeout(fn(...args), { timeout: timeoutMs, errorMessage });
  };
}

/**
 * Create timeout promise
 */
export function createTimeout(timeoutMs: number, errorMessage?: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage || 'Timeout'));
    }, timeoutMs);
  });
}

// ===== BATCH PROCESSING =====

/**
 * Process items in batches
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchProcessOptions
): Promise<R[]> {
  const {
    batchSize,
    delayBetweenBatches = 0,
    onBatchComplete,
    onError
  } = options;

  const results: R[] = [];
  const batches = chunk(items, batchSize);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchResults: R[] = [];
    
    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const index = i * batchSize + j;
      
      try {
        const result = await processor(item, index);
        batchResults.push(result);
        results.push(result);
      } catch (error) {
        if (onError) {
          onError(error as Error, item, index);
        }
        // Continue processing other items
      }
    }
    
    if (onBatchComplete) {
      onBatchComplete(batchResults, i);
    }
    
    // Add delay between batches if specified
    if (delayBetweenBatches > 0 && i < batches.length - 1) {
      await sleep(delayBetweenBatches);
    }
  }
  
  return results;
}

/**
 * Process items sequentially
 */
export async function sequential<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const result = await processor(items[i], i);
    results.push(result);
  }
  
  return results;
}

/**
 * Process items in parallel with concurrency limit
 */
export async function parallel<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: ParallelOptions
): Promise<R[]> {
  const { limit, onComplete, onError } = options;
  const results: R[] = [];
  const executing: Promise<void>[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const promise = processor(item, i)
      .then(result => {
        results[i] = result;
        if (onComplete) {
          onComplete(result, i);
        }
      })
      .catch(error => {
        if (onError) {
          onError(error, i);
        }
        throw error;
      });
    
    executing.push(promise);
    
    if (executing.length >= limit) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }
  
  await Promise.all(executing);
  return results;
}

// ===== CONCURRENCY UTILITIES =====

/**
 * Limit concurrency of async operations
 */
export function createConcurrencyLimiter(limit: number) {
  const queue: Array<() => void> = [];
  let running = 0;
  
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        running++;
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          running--;
          if (queue.length > 0) {
            const next = queue.shift()!;
            next();
          }
        }
      };
      
      if (running < limit) {
        execute();
      } else {
        queue.push(execute);
      }
    });
  };
}

/**
 * Create semaphore for resource limiting
 */
export function createSemaphore(count: number) {
  let permits = count;
  const queue: Array<() => void> = [];
  
  return {
    async acquire(): Promise<void> {
      return new Promise(resolve => {
        if (permits > 0) {
          permits--;
          resolve();
        } else {
          queue.push(resolve);
        }
      });
    },
    
    release(): void {
      permits++;
      if (queue.length > 0) {
        const next = queue.shift()!;
        permits--;
        next();
      }
    }
  };
}

// ===== DEBOUNCE AND THROTTLE =====

/**
 * Debounce function
 */
export function debounce<T extends any[]>(
  fn: (...args: T) => void,
  delay: number
): (...args: T) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: T) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Debounce async function
 */
export function debounceAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  delay: number
): (...args: T) => Promise<R> {
  let timeoutId: NodeJS.Timeout;
  let currentPromise: Promise<R> | null = null;
  
  return (...args: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(async () => {
        try {
          if (!currentPromise) {
            currentPromise = fn(...args);
          }
          const result = await currentPromise;
          currentPromise = null;
          resolve(result);
        } catch (error) {
          currentPromise = null;
          reject(error);
        }
      }, delay);
    });
  };
}

/**
 * Throttle function
 */
export function throttle<T extends any[]>(
  fn: (...args: T) => void,
  interval: number
): (...args: T) => void {
  let lastCall = 0;
  
  return (...args: T) => {
    const now = Date.now();
    if (now - lastCall >= interval) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * Throttle async function
 */
export function throttleAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  interval: number
): (...args: T) => Promise<R> {
  let lastCall = 0;
  let lastPromise: Promise<R> | null = null;
  
  return (...args: T): Promise<R> => {
    const now = Date.now();
    
    if (now - lastCall >= interval) {
      lastCall = now;
      lastPromise = fn(...args);
    }
    
    return lastPromise!;
  };
}

// ===== UTILITY FUNCTIONS =====

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create resolved promise
 */
export function resolved<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

/**
 * Create rejected promise
 */
export function rejected<T = never>(error: Error): Promise<T> {
  return Promise.reject(error);
}

/**
 * Wrap function with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorHandler?: (error: Error) => R | Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (errorHandler) {
        return await errorHandler(error as Error);
      }
      throw error;
    }
  };
}

/**
 * Create promise that never resolves
 */
export function never(): Promise<never> {
  return new Promise(() => {});
}

/**
 * Create promise that resolves after condition
 */
export function waitFor(
  condition: () => boolean,
  checkInterval: number = 100,
  timeout: number = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime >= timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, checkInterval);
      }
    };
    
    check();
  });
}

/**
 * Create promise that resolves when event occurs
 */
export function waitForEvent<T>(
  emitter: { on: (event: string, listener: (data: T) => void) => void; off: (event: string, listener: (data: T) => void) => void },
  event: string,
  timeout?: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const listener = (data: T) => {
      emitter.off(event, listener);
      resolve(data);
    };
    
    emitter.on(event, listener);
    
    if (timeout) {
      setTimeout(() => {
        emitter.off(event, listener);
        reject(new Error('Timeout waiting for event'));
      }, timeout);
    }
  });
}

/**
 * Create promise that resolves with first successful result
 */
export async function firstSuccess<T>(
  promises: Promise<T>[]
): Promise<T> {
  const errors: Error[] = [];
  
  for (const promise of promises) {
    try {
      return await promise;
    } catch (error) {
      errors.push(error as Error);
    }
  }
  
  throw new Error(`All promises failed: ${errors.map(e => e.message).join(', ')}`);
}

/**
 * Create promise that resolves with all results (including errors)
 */
export async function allSettled<T>(
  promises: Promise<T>[]
): Promise<Array<{ status: 'fulfilled'; value: T } | { status: 'rejected'; reason: Error }>> {
  return Promise.allSettled(promises);
}

/**
 * Create promise that resolves with first result (success or failure)
 */
export async function firstSettled<T>(
  promises: Promise<T>[]
): Promise<{ status: 'fulfilled'; value: T } | { status: 'rejected'; reason: Error }> {
  return Promise.race(
    promises.map(promise =>
      promise
        .then(value => ({ status: 'fulfilled' as const, value }))
        .catch(reason => ({ status: 'rejected' as const, reason }))
    )
  );
}

// ===== HELPER FUNCTIONS =====

/**
 * Chunk array into smaller arrays
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Create async iterator from array
 */
export async function* createAsyncIterator<T>(
  items: T[],
  processor: (item: T, index: number) => Promise<any>
): AsyncGenerator<any, void, unknown> {
  for (let i = 0; i < items.length; i++) {
    yield await processor(items[i], i);
  }
}

/**
 * Process async iterator
 */
export async function processAsyncIterator<T>(
  iterator: AsyncIterator<T>,
  processor: (item: T) => Promise<void>
): Promise<void> {
  let result = await iterator.next();
  
  while (!result.done) {
    await processor(result.value);
    result = await iterator.next();
  }
}
