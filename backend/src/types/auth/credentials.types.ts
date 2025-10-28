/**
 * Credentials Types
 * 
 * Login, signup, and authentication credential types.
 */

import { UserRole } from './permissions.types';
import { IDocumentReference } from './security.types';
import { UserDTO } from '../dto/user.dto';
import { SessionDTO } from '../dto/session.dto';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  user?: UserDTO;
  session?: SessionDTO;
  error?: string;
  errorCode?: string;
  securityFlags?: string[];
  riskScore?: number;
}

export interface SignupData {
  userType: 'employee' | 'manager';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  post?: string;
  ciusss?: string;
  hospital?: string;
  documents?: IDocumentReference[];
}

export interface SignupResult {
  success: boolean;
  userId?: string;
  message?: string;
  error?: string;
  errorCode?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetRequestResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface PasswordReset {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface PasswordResetResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ChangePassword {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface AuthContext {
  user: UserDTO;
  session: SessionDTO;
  isValid: boolean;
  securityRisk: 'low' | 'medium' | 'high';
}

export interface AuthOptions {
  roles?: UserRole[];
  requireSession?: boolean;
  requireActiveStatus?: boolean;
  skipRateLimit?: boolean;
}

export interface TokenPayload {
  userId: string;
  email: string;
  userType: UserRole;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

export interface SessionValidation {
  success: boolean;
  user?: UserDTO;
  session?: SessionDTO;
  error?: string;
  errorCode?: string;
}
