/*
 * SSE Facade - Environment-based implementation switch
 *
 * Use SSE_IMPLEMENTATION env var to choose between 'vercel' (default) and 'original'.
 * All app imports should use '@/lib/sse' only.
 */

// Common exports (implementation-agnostic)
export { SSECleanup } from './SSECleanup';

// Default to Vercel-compatible implementation
export { vercelSSEManager as sseManager } from './vercel/SSEManager';
export { VercelSSEService as SSEService } from './vercel/SSEService';
export { VercelSSERepository as SSERepository } from './vercel/SSERepository';
export { VercelSSECache as SSECache, VERCEL_SSE_CACHE_CONFIG as SSE_CACHE_CONFIG } from './vercel/SSECache';
export { vercelSSEClient as sseClient } from './vercel/SSEClient';
export * from './vercel/index';
