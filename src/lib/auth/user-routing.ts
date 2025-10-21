/**
 * User Routing Utilities
 * 
 * This module provides clean routing logic based on user types
 * to ensure users are directed to the correct dashboard after login.
 */

export type UserType = 'employee' | 'manager' | 'admin' | 'super_admin';

export interface User {
  _id: string;
  email: string;
  userType: UserType;
  firstName: string;
  lastName: string;
  status: string;
}

/**
 * Get the appropriate dashboard route for a user type
 */
export function getDashboardRoute(userType: UserType): string {
  switch (userType) {
    case 'admin':
    case 'super_admin':
      return '/admin/dashboard';
    case 'employee':
    case 'manager':
    default:
      return '/dashboard';
  }
}

/**
 * Check if a user has admin privileges
 */
export function isAdmin(userType: UserType): boolean {
  return userType === 'admin' || userType === 'super_admin';
}

/**
 * Check if a user has super admin privileges
 */
export function isSuperAdmin(userType: UserType): boolean {
  return userType === 'super_admin';
}

/**
 * Get user type display name
 */
export function getUserTypeDisplayName(userType: UserType): string {
  switch (userType) {
    case 'employee':
      return 'Employee';
    case 'manager':
      return 'Manager';
    case 'admin':
      return 'Administrator';
    case 'super_admin':
      return 'Super Administrator';
    default:
      return 'User';
  }
}

/**
 * Check if a route requires admin access
 */
export function requiresAdminAccess(pathname: string): boolean {
  return pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
}

/**
 * Check if a user can access a specific route
 */
export function canAccessRoute(userType: UserType, pathname: string): boolean {
  if (requiresAdminAccess(pathname)) {
    return isAdmin(userType);
  }
  return true;
}

/**
 * Get redirect route for authenticated user trying to access login
 */
export function getLoginRedirectRoute(userType: UserType): string {
  return getDashboardRoute(userType);
}
