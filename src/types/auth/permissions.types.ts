/**
 * Permissions Types
 * 
 * Permission enums and related types.
 */

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
  EXECUTE_QUERIES = 'execute_queries',
}

