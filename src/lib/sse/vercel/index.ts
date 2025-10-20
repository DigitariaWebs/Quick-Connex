/**
 * Vercel SSE System - Clean Exports
 * 
 * Clean, focused exports for the Vercel-compatible SSE system.
 * Follows clean architecture principles with proper separation of concerns.
 */

// Main SSE Manager (Orchestrator)
export { vercelSSEManager, VercelSSEManager } from './SSEManager';
export type { VercelSSEManagerConfig } from './SSEManager';

// Core Components
export { VercelSSEService } from './SSEService';
export type { TransferNotification, CreateNotificationRequest, GetNotificationsRequest } from './SSEService';

export { VercelSSERepository } from './SSERepository';
export type { NotificationData, NotificationQuery, NotificationStats } from './SSERepository';

export { VercelSSECache, VERCEL_SSE_CACHE_CONFIG } from './SSECache';
export type { VercelSSECacheConfig } from './SSECache';

// Legacy Support (for backward compatibility)
export { VercelNotificationService } from './NotificationService';
export { vercelSSEClient, VercelSSEClient } from './SSEClient';
