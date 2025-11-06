/**
 * Credentials Types
 * 
 * Login and signup form data types.
 */

import { UserRole } from './user.types';

export type UserType = 'manager' | 'employee';

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  userType: UserType;
  post?: string;
  ciusss?: string;
  termsAccepted: boolean;
}

