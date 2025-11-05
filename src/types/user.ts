/**
 * User Management Types
 * 
 * Comprehensive type definitions for user management system
 */

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: 'employee' | 'manager' | 'admin' | 'super_admin';
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

export interface UserRole {
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

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UserStatsResponse {
  stats: UserStats;
  lastUpdated: Date;
}

export interface UserActivityResponse {
  activities: UserActivity[];
  total: number;
  page: number;
  limit: number;
}

// User action types for the floating action menu
export interface UserAction {
  id: string;
  label: string;
  icon: string;
  buttonClass: string;
  requiresConfirmation: boolean;
  isDestructive: boolean;
  permissions: string[];
}

// User status configuration for consistent styling
export interface UserStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  badgeClass: string;
  icon: any;
}

// User role configuration for consistent styling
export interface UserRoleConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  badgeClass: string;
  icon: any;
  level: number;
}

// User statistics card configuration
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
