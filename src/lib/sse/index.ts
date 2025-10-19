/**
 * SSE System - Clean Exports
 * 
 * Clean, focused exports for the SSE system following clean architecture principles.
 * Similar to the session system's clean exports.
 */

// Main SSE Manager (Orchestrator)
export { sseManager, SSEManager } from './SSEManager';
export type { SSEManagerConfig } from './SSEManager';

// Core Components
export { SSESecurity, SSE_SECURITY_CONFIG } from './SSESecurity';
export { SSECache } from './SSECache';
export { SSECleanup } from './SSECleanup';
export { SSEMetrics, SSE_METRICS_CONFIG } from './SSEMetrics';

// Utility Components (Keep existing)
export { ExponentialBackoff } from './reconnection-strategy';
export { HeartbeatManager, ServerHeartbeatManager } from './heartbeat-manager';
export { SelectiveLogger } from './selective-logger';

// Type Definitions
export * from './SSETypes';

// Legacy Support (for backward compatibility)
export { sseClient, SSEClient } from './SSEClient';
export { sseServer, SSEServer } from './SSEServer';
