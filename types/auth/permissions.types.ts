/**
 * Permissions Types
 * 
 * User roles, permissions, and authorization types.
 */

export enum UserRole {
  EMPLOYEE = 'employee',
  MANAGER = 'manager',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export enum Permission {
  // User management
  VIEW_ALL_USERS = 'view_all_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  APPROVE_USERS = 'approve_users',
  SUSPEND_USERS = 'suspend_users',
  
  // Transfer management
  VIEW_ALL_TRANSFERS = 'view_all_transfers',
  CANCEL_ANY_TRANSFER = 'cancel_any_transfer',
  EDIT_ANY_TRANSFER = 'edit_any_transfer',
  FORCE_COMPLETE_TRANSFER = 'force_complete_transfer',
  REASSIGN_TRANSFERS = 'reassign_transfers',
  
  // System management
  VIEW_SYSTEM_METRICS = 'view_system_metrics',
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings',
  ACCESS_AUDIT_LOGS = 'access_audit_logs',
  MANAGE_NOTIFICATIONS = 'manage_notifications',
  VIEW_ERROR_LOGS = 'view_error_logs',
  
  // Data management
  EXPORT_DATA = 'export_data',
  DELETE_DATA = 'delete_data',
  BACKUP_DATABASE = 'backup_database',
  
  // Super admin only
  MANAGE_ADMINS = 'manage_admins',
  ACCESS_SYSTEM_LOGS = 'access_system_logs',
  EXECUTE_QUERIES = 'execute_queries'
}

export interface RolePermissions {
  [UserRole.EMPLOYEE]: Permission[];
  [UserRole.MANAGER]: Permission[];
  [UserRole.ADMIN]: Permission[];
  [UserRole.SUPER_ADMIN]: Permission[];
}

export interface PermissionCheck {
  hasPermission: boolean;
  requiredPermissions: Permission[];
  userPermissions: Permission[];
  missingPermissions: Permission[];
}

export interface RoleHierarchy {
  level: number;
  canManage: UserRole[];
  canAccess: Permission[];
}

export const ROLE_HIERARCHY: Record<UserRole, RoleHierarchy> = {
  [UserRole.EMPLOYEE]: {
    level: 1,
    canManage: [],
    canAccess: []
  },
  [UserRole.MANAGER]: {
    level: 2,
    canManage: [UserRole.EMPLOYEE],
    canAccess: [
      Permission.VIEW_ALL_TRANSFERS,
      Permission.REASSIGN_TRANSFERS
    ]
  },
  [UserRole.ADMIN]: {
    level: 3,
    canManage: [UserRole.EMPLOYEE, UserRole.MANAGER],
    canAccess: [
      Permission.VIEW_ALL_USERS,
      Permission.EDIT_USERS,
      Permission.APPROVE_USERS,
      Permission.SUSPEND_USERS,
      Permission.VIEW_ALL_TRANSFERS,
      Permission.CANCEL_ANY_TRANSFER,
      Permission.EDIT_ANY_TRANSFER,
      Permission.FORCE_COMPLETE_TRANSFER,
      Permission.REASSIGN_TRANSFERS,
      Permission.VIEW_SYSTEM_METRICS,
      Permission.MANAGE_SYSTEM_SETTINGS,
      Permission.ACCESS_AUDIT_LOGS,
      Permission.MANAGE_NOTIFICATIONS,
      Permission.VIEW_ERROR_LOGS,
      Permission.EXPORT_DATA,
      Permission.DELETE_DATA,
      Permission.BACKUP_DATABASE
    ]
  },
  [UserRole.SUPER_ADMIN]: {
    level: 4,
    canManage: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN],
    canAccess: Object.values(Permission) as Permission[]
  }
};

export interface UserPermission {
  _id: string;
  name: string;
  description: string;
  category: string;
  level: 'read' | 'write' | 'admin';
}

export interface UserRoleConfig {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  level: number;
  isSystemRole: boolean;
}
