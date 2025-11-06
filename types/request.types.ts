/**
 * Request Types
 * 
 * Shared type definitions for Next.js request objects.
 */

import { NextRequest } from 'next/server';

/**
 * Authenticated Request Interface
 * 
 * Extends NextRequest to include user information from authentication middleware.
 * This interface is used across all API routes that require authentication.
 */
export interface AuthenticatedRequest extends NextRequest {
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
