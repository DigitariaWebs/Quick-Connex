/**
 * Auth API Client
 * 
 * Client functions for authentication endpoints using the new backend
 * with ResponseBuilder flattening.
 */

import { request } from '../api/core/api-client';
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
  const response = await request<LoginResponse>({
    method: 'POST',
    url: '/api/auth/login',
    data: payload,
  });
  return response.data;
}

/**
 * Signup new user
 */
export async function signup(payload: SignupRequest): Promise<SignupResponse> {
  const response = await request<SignupResponse>({
    method: 'POST',
    url: '/api/auth/signup',
    data: payload,
  });
  return response.data;
}

/**
 * Get current user info
 */
export async function me(): Promise<MeResponse> {
  const response = await request<MeResponse>({
    method: 'GET',
    url: '/api/auth/me',
  });
  return response.data;
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  await request<void>({
    method: 'POST',
    url: '/api/auth/logout',
  });
}
