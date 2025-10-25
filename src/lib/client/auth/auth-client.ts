/**
 * Auth Client Service
 * 
 * Client-side authentication service that handles all auth-related API calls
 * and business logic. Extracted from hooks to follow Clean Architecture.
 */

import { ApiClient, ApiError } from '../api-client';
import {
  LoginCredentials,
  SignupData,
  LoginResult,
  SignupResult,
  PasswordResetRequest,
  PasswordResetData,
  AuthClientOptions,
} from './auth-client-types';

export class AuthClient {
  private apiClient: ApiClient;

  constructor(options: AuthClientOptions = {}) {
    this.apiClient = new ApiClient({
      baseURL: options.baseURL || '',
      timeout: options.timeout || 10000,
      retries: options.retries || 3,
    });
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      const result = await this.apiClient.post<LoginResult>('/api/auth/login', credentials);
      
      // The API returns { message, user, session } structure
      // Check if we have the required data
      if (!result.user || !result.session) {
        throw new ApiError(
          result.message || 'Login failed - missing user or session data',
          400,
          undefined,
          result
        );
      }

      return {
        success: true,
        user: result.user,
        session: result.session,
        message: result.message
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Login failed',
        500
      );
    }
  }

  /**
   * Sign up a new user
   */
  async signup(data: SignupData): Promise<SignupResult> {
    try {
      // Create FormData for multipart form submission
      const formData = new FormData();
      formData.append('email', data.email);
      formData.append('password', data.password);
      formData.append('confirmPassword', data.confirmPassword);
      formData.append('firstName', data.firstName);
      formData.append('lastName', data.lastName);
      formData.append('userType', data.userType);
      
      if (data.hospital) {
        formData.append('hospital', data.hospital);
      }
      if (data.ciusss) {
        formData.append('ciusss', data.ciusss);
      }

      const result = await this.apiClient.post<SignupResult>('/api/auth/signup', formData);
      
      return result;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Signup failed',
        500
      );
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await this.apiClient.post('/api/auth/logout');
    } catch (error) {
      // Logout should not throw errors, just log them
      console.warn('Logout request failed:', error);
    }
  }

  /**
   * Refresh current session
   */
  async refreshSession(): Promise<void> {
    try {
      await this.apiClient.post('/api/auth/refresh');
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : 'Session refresh failed',
        401
      );
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      await this.apiClient.post('/api/auth/forgot-password', { email });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Password reset request failed',
        500
      );
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: PasswordResetData): Promise<void> {
    try {
      await this.apiClient.post('/api/auth/reset-password', data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Password reset failed',
        500
      );
    }
  }

  /**
   * Get redirect path based on user type
   * Business logic extracted from hooks
   */
  getRedirectPath(userType: string): string {
    switch (userType) {
      case 'admin':
      case 'super_admin':
        return '/admin/dashboard';
      case 'manager':
        return '/dashboard';
      case 'employee':
        return '/dashboard';
      default:
        return '/dashboard';
    }
  }

  /**
   * Verify current session
   */
  async verifySession(): Promise<{ user: any; session: any }> {
    try {
      const result = await this.apiClient.get<{ user: any; session: any }>('/api/auth/verify');
      return result;
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : 'Session verification failed',
        401
      );
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<any> {
    try {
      const result = await this.apiClient.get('/api/users/profile');
      return result;
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to fetch profile',
        500
      );
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<any>): Promise<any> {
    try {
      const result = await this.apiClient.put('/api/users/profile', data);
      return result;
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to update profile',
        500
      );
    }
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await this.apiClient.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Password change failed',
        500
      );
    }
  }
}

// Default instance
export const authClient = new AuthClient();
