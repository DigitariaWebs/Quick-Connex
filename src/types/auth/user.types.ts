/**
 * User Types
 * 
 * User domain types and related interfaces.
 */

export type UserRole = 'employee' | 'manager' | 'admin' | 'super_admin';

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: UserRole;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  phone: string;
  post?: string;
  ciusss?: {
    _id: string;
    code: string;
    name: string;
    region?: string;
    isActive: boolean;
  };
  hospital?: {
    _id: string;
    name: string;
    address: string;
    organization: {
      type: 'CIUSSS' | 'CISSS' | 'CUSM';
      name: string;
      region: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    contact?: {
      phone?: string;
      email?: string;
      website?: string;
    };
    specialties?: string[];
    capacity?: {
      totalBeds?: number;
      icuBeds?: number;
      emergencyBeds?: number;
    };
    isActive: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  permissions?: string[];
  accountLockedUntil?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  suspendedBy?: string;
  suspendedAt?: Date;
  suspensionReason?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  // Calculated fields from AuditLog (computed on-demand)
  lastLogin?: Date | null;
  lastLoginIp?: string | null;
  recentFailedAttempts?: number;
  documents?: Array<{
    fileId: string;
    documentType: 'cv' | 'opiqPermit' | 'rcr';
    originalName: string;
    mimeType: string;
    size: number;
    checksum: string;
    uploadedAt: Date;
  }>;
}

export interface AuthUser {
  _id: string;
  email: string;
  userType: UserRole;
  firstName: string;
  lastName: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
}

export interface IDocumentReference {
  fileId: string;
  documentType: 'cv' | 'opiqPermit' | 'rcr';
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  uploadedAt: Date;
}

// User Management Types
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

export interface UserFilters {
  search: string;
  userType: string[];
  status: string[];
  organization: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  verificationStatus: string[];
  activityStatus: string[];
}

export interface UserActivity {
  _id: string;
  userId: string;
  action: string;
  description: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface UserPermission {
  _id: string;
  name: string;
  description: string;
  category: string;
  level: 'read' | 'write' | 'admin';
}

// UserRole - Database role interface (different from UserRole type alias)
export interface UserRoleInterface {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  level: number;
  isSystemRole: boolean;
}

export interface BulkUserOperation {
  action: 'activate' | 'suspend' | 'delete' | 'changeRole' | 'export';
  userIds: string[];
  parameters?: {
    newRole?: string;
    reason?: string;
    exportFormat?: 'csv' | 'json' | 'pdf';
  };
}

export interface UserExportOptions {
  format: 'csv' | 'json' | 'pdf';
  fields: string[];
  filters: UserFilters;
  includeActivity: boolean;
  includePermissions: boolean;
}

// UI Configuration Types
export interface UserAction {
  id: string;
  label: string;
  icon: string;
  buttonClass: string;
  requiresConfirmation: boolean;
  isDestructive: boolean;
  permissions: string[];
}

export interface UserStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  badgeClass: string;
  icon: any;
}

// User role configuration for consistent styling (UI configuration)
export interface UserRoleConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  badgeClass: string;
  icon: any;
  level: number;
}

export interface UserStatCard {
  id: string;
  title: string;
  value: number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: any;
  color: string;
  bgColor: string;
  textColor: string;
  valueColor: string;
  iconColor: string;
  borderColor: string;
}

