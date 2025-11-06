/**
 * User Types
 * 
 * User-related types for authentication and user management.
 */

import { ObjectId, BaseEntity } from '../common';
import { Permission, UserRole } from './permissions.types';
import { IDocumentReference, ILoginHistory } from './security.types';

export interface IUser extends BaseEntity {
  userType: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  post?: string;
  ciusss?: ObjectId;
  hospital?: ObjectId;
  documents?: IDocumentReference[];
  
  // Admin-specific
  permissions?: Permission[];
  
  // Security & Activity
  loginHistory?: ILoginHistory[];
  accountLockedUntil?: Date;
  
  // Approval system
  status: UserStatus;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  suspendedBy?: string;
  suspendedAt?: Date;
  suspensionReason?: string;
  
  // Password reset
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

export enum UserStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended'
}

// Note: DTOs moved to /types/dto/user.dto.ts to avoid conflicts

export interface CreateUserDTO {
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

export interface UpdateUserDTO {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  post?: string;
  ciusss?: string;
  hospital?: string;
  permissions?: Permission[];
}

export interface UserFilters {
  search?: string;
  userType?: UserRole[];
  status?: UserStatus[];
  organization?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  verificationStatus?: string[];
  activityStatus?: string[];
}

export interface UserStats {
  total: number;
  approved: number;
  pending: number;
  suspended: number;
  rejected: number;
  newThisWeek: number;
  newThisMonth: number;
  byRole: {
    employees: number;
    managers: number;
    admins: number;
    superAdmins: number;
  };
  byOrganization: {
    [organizationId: string]: {
      name: string;
      count: number;
    };
  };
  loginActivity: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  accountHealth: {
    approved: number;
    pending: number;
    locked: number;
    superAdmin: number;
  };
}
