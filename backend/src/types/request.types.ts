/**
 * Request Types
 * 
 * Shared type definitions for Express request objects.
 */

import { Request } from 'express';

/**
 * Authenticated Request Interface
 * 
 * Extends Express Request to include user information from authentication middleware.
 * This interface is used across all controllers that require authentication.
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
    sessionId: string;
  };
}

/**
 * Admin Request Interface
 * 
 * Extends AuthenticatedRequest for admin-only operations.
 * Ensures user has admin or super_admin privileges.
 */
export interface AdminRequest extends AuthenticatedRequest {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    userType: 'admin' | 'super_admin';
    sessionId: string;
  };
}
