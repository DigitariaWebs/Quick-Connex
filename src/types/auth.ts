/**
 * Authentication System Types
 * 
 * This file contains all TypeScript interfaces and types for the authentication system.
 */

import { Types } from 'mongoose';

/**
 * User Role Types
 */
export type UserRole = 'manager' | 'employee' | 'admin';

/**
 * User Type
 */
export type UserType = 'manager' | 'employee';

/**
 * Authentication Status
 */
export type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading';

/**
 * Login Form Data
 */
export interface LoginFormData {
  email: string;
  password: string;
}

/**
 * Signup Form Data
 */
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

/**
 * User Interface
 */
export interface IUser {
  _id: Types.ObjectId;
  userType: UserType;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  post?: string;
  ciusss?: string;
  documents?: IDocumentReference[];
  isApproved: boolean;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Document Reference Interface
 */
export interface IDocumentReference {
  fileId: string;
  documentType: 'cv' | 'opiqPermit' | 'rcr';
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  uploadedAt: Date;
}

/**
 * Auth Context Type
 */
export interface AuthContextType {
  user: IUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (data: SignupFormData) => Promise<void>;
  refreshUser: () => Promise<void>;
}

/**
 * JWT Payload
 */
export interface JWTPayload {
  userId: string;
  email: string;
  userType: UserType;
  iat: number;
  exp: number;
}
