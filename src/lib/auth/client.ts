/**
 * Auth API Client
 * 
 * Client functions for authentication using Next.js API routes
 * with simple fetch-based requests.
 */

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => undefined);
  if (!res.ok) {
    const error = (data && (data.error || data)) || { message: 'Request failed' };
    const code = (data && (data.code || data.errorCode)) || 'REQUEST_FAILED';
    const err: any = new Error(error.message || error);
    err.code = code;
    err.status = res.status;
    err.error = data;
    throw err;
  }
  return data as T;
}
import { User } from '../../types/user';

// Simplified Session interface for client responses
export interface Session {
  sessionId: string;
  userId: string;
  expiresAt: string;
  isActive: boolean;
  deviceInfo: {
    userAgent: string;
    platform: string;
    browser: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
  };
  createdAt: string;
  lastAccessedAt: string;
}

// Auth request/response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  session: Session;
}

export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  userType: 'employee' | 'manager';
  post?: string;
  ciusss?: string;
}

export interface SignupResponse {
  user: User;
  session: Session;
}

export interface MeResponse {
  user: User;
}

/**
 * Login user with email and password
 */
export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return requestJson<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Signup new user
 */
export async function signup(payload: SignupRequest): Promise<SignupResponse> {
  return requestJson<SignupResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Get current user info
 */
export async function me(): Promise<MeResponse> {
  return requestJson<MeResponse>('/api/auth/me', { method: 'GET' });
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  await requestJson('/api/auth/logout', { method: 'POST' });
}
