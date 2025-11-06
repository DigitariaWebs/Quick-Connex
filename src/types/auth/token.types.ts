/**
 * Token Types
 * 
 * JWT token and payload types.
 */

import { UserRole } from './user.types';

export interface TokenPayload {
  userId: string;
  email: string;
  userType: UserRole;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  userType: string;
  iat: number;
  exp: number;
}

