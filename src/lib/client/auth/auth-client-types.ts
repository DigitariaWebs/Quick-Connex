/**
 * Auth Client Types
 * 
 * Types specific to authentication client operations.
 */

import { User, Session, Message, FieldErrors } from '../client-types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  userType: 'admin' | 'super_admin' | 'manager' | 'employee';
  hospital?: string;
  ciusss?: string;
}

export interface LoginResult {
  success: boolean;
  user: User;
  session: Session;
  message?: string;
}

export interface SignupResult {
  success: boolean;
  user?: User;
  session?: Session;
  message: string;
  errors?: FieldErrors;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface AuthClientOptions {
  baseURL?: string;
  timeout?: number;
  retries?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export interface AuthHookResult {
  // State
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  signup: (data: SignupData) => Promise<SignupResult>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (data: PasswordResetData) => Promise<void>;
  
  // Utilities
  getRedirectPath: (userType: string) => string;
  clearError: () => void;
}
