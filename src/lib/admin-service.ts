/**
 * Admin Service
 * 
 * This service handles admin-related operations including:
 * - Getting admin users
 * - Admin approval workflows
 * - Admin notifications
 */

import dbConnect from './mongoose';
import User from '@/models/User';

export interface AdminUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  userType: 'manager';
  post: string;
  ciusss: string;
}

export class AdminService {
  /**
   * Get all admin users (managers with admin privileges)
   * Admin users are identified by specific email patterns or post titles
   */
  static async getAdminUsers(): Promise<AdminUser[]> {
    try {
      await dbConnect();
      
      // Get admin users based on email patterns and post titles
      const adminUsers = await User.find({
        userType: 'manager',
        status: 'approved',
        $or: [
          { email: { $regex: /admin@patients-management\.com/i } },
          { post: { $regex: /administrator|admin/i } },
          { email: { $regex: /admin@/i } }
        ]
      }).select('firstName lastName email phone userType post ciusss');

      return adminUsers.map(user => user.toObject());
    } catch (error) {
      console.error('Error getting admin users:', error);
      return [];
    }
  }

  /**
   * Get primary admin user (first admin found)
   */
  static async getPrimaryAdmin(): Promise<AdminUser | null> {
    try {
      const admins = await this.getAdminUsers();
      return admins.length > 0 ? admins[0] : null;
    } catch (error) {
      console.error('Error getting primary admin:', error);
      return null;
    }
  }

  /**
   * Check if a user is an admin
   */
  static async isAdmin(userId: string): Promise<boolean> {
    try {
      await dbConnect();
      
      const user = await User.findById(userId).select('email post userType status');
      if (!user) return false;

      return user.userType === 'manager' && 
             user.status === 'approved' &&
             (user.email?.includes('admin@patients-management.com') ||
              user.post?.toLowerCase().includes('administrator') ||
              user.post?.toLowerCase().includes('admin'));
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Get admin contact information for notifications
   */
  static async getAdminContactInfo(): Promise<{
    email: string;
    phone: string;
    name: string;
  } | null> {
    try {
      const primaryAdmin = await this.getPrimaryAdmin();
      if (!primaryAdmin) {
        // Fallback to environment variables or default admin
        return {
          email: process.env.ADMIN_EMAIL || 'admin@patients-management.com',
          phone: process.env.ADMIN_PHONE || '+15140000000',
          name: process.env.ADMIN_NAME || 'System Administrator'
        };
      }

      return {
        email: primaryAdmin.email,
        phone: primaryAdmin.phone,
        name: `${primaryAdmin.firstName} ${primaryAdmin.lastName}`
      };
    } catch (error) {
      console.error('Error getting admin contact info:', error);
      return {
        email: process.env.ADMIN_EMAIL || 'admin@patients-management.com',
        phone: process.env.ADMIN_PHONE || '+15140000000',
        name: process.env.ADMIN_NAME || 'System Administrator'
      };
    }
  }
}

export default AdminService;
