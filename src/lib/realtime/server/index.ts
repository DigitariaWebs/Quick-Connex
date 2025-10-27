/**
 * Realtime Server Module
 * 
 * Server-side components for Socket.io and authentication.
 */

// Authentication middleware
export {
  authenticateSocket,
  createRateLimitMiddleware,
  validateConnection,
  requireRole,
  trackActivity
} from './auth';

// Types
export type { AuthenticatedSocket } from '../core/types';
