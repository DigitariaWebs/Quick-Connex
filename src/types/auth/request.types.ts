/**
 * Request Types
 * 
 * Request-related types for authentication.
 */

export interface RequestInfo {
  ipAddress: string;
  userAgent: string;
  method?: string;
  endpoint?: string;
  requestId?: string;
  sessionId?: string;
  deviceFingerprint?: string;
}

export interface AuthenticatedRequest {
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
    sessionId: string;
  };
}

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

