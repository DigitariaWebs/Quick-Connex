/**
 * User DTOs
 * 
 * Data Transfer Objects for User-related API responses.
 * Safe data structures without sensitive information.
 */

import { UserRole, Permission } from '../auth/permissions.types';
import { UserStatus } from '../auth/user.types';
import { IDocumentReference, ILoginHistory } from '../auth/security.types';

export interface UserDTO {
  _id: string;
  userType: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: UserStatus;
  post?: string;
  ciusss?: {
    _id: string;
    name: string;
    code: string;
  };
  hospital?: {
    _id: string;
    name: string;
    address: string;
  };
  permissions?: Permission[];
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  lastLoginIp?: string;
}

export interface UserProfileDTO extends UserDTO {
  documents?: IDocumentReference[];
  loginHistory?: ILoginHistory[];
  accountLockedUntil?: Date;
}

export interface UserListDTO {
  users: UserDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UserStatsDTO {
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

export interface UserActivityDTO {
  _id: string;
  userId: string;
  action: string;
  description: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface UserActivityListDTO {
  activities: UserActivityDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
