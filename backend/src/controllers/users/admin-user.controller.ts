/**
 * Admin User Controller
 * 
 * Administrative user management operations.
 */

import { Response } from 'express';
import { ResponseBuilder } from '@/utils/response.util';
import { DatabaseService } from '@/lib/database';
import User from '@/models/User';
import { CIUSSS } from '@/models/CIUSSS';
import Hospital from '@/models/Hospital';
import { CommunicationService } from '@/lib/communication';
import { EmailMessage } from '@/types/communication';
import { AuthenticatedRequest } from '@/types';
import mongoose from 'mongoose';

/**
 * GET /api/admin/users - List users with filtering
 */
export async function getUsers(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    // Extract query parameters
    const {
      search,
      userType,
      status,
      startDate,
      endDate,
      page = '1',
      limit = '25'
    } = req.query;

    // Build filter object
    const filter: any = {};

    // Search filter
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } }
      ];
    }

    // UserType filter
    if (userType) {
      const userTypes = Array.isArray(userType) ? userType : [userType];
      filter.userType = { $in: userTypes };
    }

    // Status filter
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      filter.status = { $in: statuses };
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate as string);
      }
    }

    // Calculate pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Fetch users with pagination
    const [users, total] = await Promise.all([
      DatabaseService.findMany(User, filter, {
        sort: { createdAt: -1 },
        skip,
        limit: limitNum
      }),
      DatabaseService.count(User, filter)
    ]);

    // Manually populate CIUSSS and Hospital references
    const populatedUsers = await Promise.all(users.map(async (user: any) => {
      const populatedUser = { ...user };
      
      // Handle CIUSSS population
      if (user.ciusss) {
        try {
          if (typeof user.ciusss === 'string') {
            const ciusss = await DatabaseService.findOne(CIUSSS, { code: user.ciusss });
            populatedUser.ciusss = ciusss?._id as any;
          } else {
            const ciusss = await DatabaseService.findById(CIUSSS, user.ciusss.toString());
            populatedUser.ciusss = ciusss?._id as any;
          }
        } catch (error) {
          console.warn(`Failed to populate CIUSSS for user ${user._id}:`, error);
          populatedUser.ciusss = undefined;
        }
      }
      
      // Handle Hospital population
      if (user.hospital) {
        try {
          if (typeof user.hospital === 'string') {
            const hospital = await DatabaseService.findOne(Hospital, { name: user.hospital });
            populatedUser.hospital = hospital?._id as any;
          } else {
            const hospital = await DatabaseService.findById(Hospital, user.hospital.toString());
            populatedUser.hospital = hospital?._id as any;
          }
        } catch (error) {
          console.warn(`Failed to populate Hospital for user ${user._id}:`, error);
          populatedUser.hospital = undefined;
        }
      }
      
      return populatedUser;
    }));

    const totalPages = Math.ceil(total / limitNum);

    return ResponseBuilder.success(res, {
      users: populatedUsers,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return ResponseBuilder.serverError(res, 'Failed to fetch users');
  }
}

/**
 * POST /api/admin/users - Create new user
 */
export async function createUser(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    const {
      firstName,
      lastName,
      email,
      userType,
      ciusssId,
      hospitalId,
      phone,
      post
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !userType) {
      return ResponseBuilder.badRequest(res, 'Missing required fields');
    }

    // Check if user already exists
    const existingUser = await DatabaseService.findOne(User, { email });
    if (existingUser) {
      return ResponseBuilder.badRequest(res, 'User with this email already exists');
    }

    // Validate CIUSSS and Hospital references for managers
    if (userType === 'manager') {
      // Validate CIUSSS reference
      if (ciusssId) {
        if (!mongoose.Types.ObjectId.isValid(ciusssId)) {
          return ResponseBuilder.badRequest(res, 'CIUSSS reference must be a valid ObjectId');
        }
        
        const ciusssExists = await DatabaseService.findById(CIUSSS, ciusssId);
        if (!ciusssExists) {
          return ResponseBuilder.badRequest(res, 'CIUSSS reference not found in database');
        }
      }
      
      // Validate Hospital reference
      if (hospitalId) {
        if (!mongoose.Types.ObjectId.isValid(hospitalId)) {
          return ResponseBuilder.badRequest(res, 'Hospital reference must be a valid ObjectId');
        }
        
        const hospitalExists = await DatabaseService.findById(Hospital, hospitalId);
        if (!hospitalExists) {
          return ResponseBuilder.badRequest(res, 'Hospital reference not found in database');
        }
      }
    }

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      email,
      userType,
      phone,
      ciusss: ciusssId,
      hospital: hospitalId,
      post,
      status: 'pending'
    });

    await newUser.save();

    // Populate related data
    await newUser.populate('ciusss', 'code name region isActive');
    await newUser.populate('hospital', 'name address organization specialties isActive');

    return ResponseBuilder.created(res, { user: newUser });

  } catch (error) {
    console.error('Error creating user:', error);
    return ResponseBuilder.serverError(res, 'Failed to create user');
  }
}

/**
 * GET /api/admin/users/stats - User statistics
 */
export async function getUserStats(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    // Get current date for calculations
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Calculate all statistics in parallel
    const [
      totalUsers,
      approvedUsers,
      pendingUsers,
      suspendedUsers,
      rejectedUsers,
      newThisWeek,
      newThisMonth,
      usersByRole,
      loginActivityToday,
      loginActivityThisWeek,
      loginActivityThisMonth,
      lockedUsers,
      superAdminUsers
    ] = await Promise.all([
      DatabaseService.count(User, {}),
      DatabaseService.count(User, { status: 'approved' }),
      DatabaseService.count(User, { status: 'pending' }),
      DatabaseService.count(User, { status: 'suspended' }),
      DatabaseService.count(User, { status: 'rejected' }),
      DatabaseService.count(User, { createdAt: { $gte: startOfWeek } }),
      DatabaseService.count(User, { createdAt: { $gte: startOfMonth } }),
      DatabaseService.aggregate(User, [
        { $group: { _id: '$userType', count: { $sum: 1 } } }
      ]),
      DatabaseService.count(User, { lastLogin: { $gte: startOfToday } }),
      DatabaseService.count(User, { lastLogin: { $gte: startOfWeek } }),
      DatabaseService.count(User, { lastLogin: { $gte: startOfMonth } }),
      DatabaseService.count(User, { accountLockedUntil: { $gt: new Date() } }),
      DatabaseService.count(User, { userType: 'super_admin' })
    ]);

    // Process role statistics
    const roleStats = {
      employees: 0,
      managers: 0,
      admins: 0,
      superAdmins: 0
    };

    usersByRole.forEach((role: any) => {
      switch (role._id) {
        case 'employee':
          roleStats.employees = role.count;
          break;
        case 'manager':
          roleStats.managers = role.count;
          break;
        case 'admin':
          roleStats.admins = role.count;
          break;
        case 'super_admin':
          roleStats.superAdmins = role.count;
          break;
      }
    });

    // Compile final statistics
    const stats = {
      total: totalUsers,
      approved: approvedUsers,
      pending: pendingUsers,
      suspended: suspendedUsers,
      rejected: rejectedUsers,
      newThisWeek,
      newThisMonth,
      byRole: roleStats,
      loginActivity: {
        today: loginActivityToday,
        thisWeek: loginActivityThisWeek,
        thisMonth: loginActivityThisMonth
      },
      accountHealth: {
        approved: approvedUsers,
        pending: pendingUsers,
        locked: lockedUsers,
        superAdmin: superAdminUsers
      }
    };

    return ResponseBuilder.success(res, {
      stats,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('Error fetching user statistics:', error);
    return ResponseBuilder.serverError(res, 'Failed to fetch user statistics');
  }
}

/**
 * POST /api/admin/users/bulk-approve - Bulk approve users
 */
export async function bulkApprove(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return ResponseBuilder.badRequest(res, 'User IDs are required');
    }

    // Find all users to approve
    const usersToApprove = await DatabaseService.findMany(User, {
      _id: { $in: userIds },
      status: 'pending'
    });

    if (usersToApprove.length === 0) {
      return ResponseBuilder.badRequest(res, 'No pending users found to approve');
    }

    // Update all users to approved status
    const updateResult = await User.updateMany(
      { _id: { $in: usersToApprove.map((u: any) => u._id) } },
      {
        status: 'approved',
        approvedBy: user.email,
        approvedAt: new Date(),
        rejectionReason: undefined
      }
    );

    // Send notification emails to all approved users
    const emailPromises = usersToApprove.map((userToApprove: any) => 
      sendApprovalEmail(userToApprove).catch(error => {
        console.error(`Failed to send approval email to ${userToApprove.email}:`, error);
        return null;
      })
    );

    await Promise.allSettled(emailPromises);

    return ResponseBuilder.success(res, {
      message: `Successfully approved ${updateResult.modifiedCount} users`,
      approvedCount: updateResult.modifiedCount,
      approvedUsers: usersToApprove.map((u: any) => ({
        id: u._id,
        email: u.email,
        name: `${u.firstName} ${u.lastName}`
      })),
      approvedBy: user.email,
      approvedAt: new Date()
    });

  } catch (error) {
    console.error('Error bulk approving users:', error);
    return ResponseBuilder.serverError(res, 'Failed to approve users');
  }
}

/**
 * POST /api/admin/users/bulk-reject - Bulk reject users
 */
export async function bulkReject(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    const { userIds, reason } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return ResponseBuilder.badRequest(res, 'User IDs are required');
    }

    if (!reason || reason.trim().length === 0) {
      return ResponseBuilder.badRequest(res, 'Rejection reason is required');
    }

    // Find all users to reject
    const usersToReject = await DatabaseService.findMany(User, {
      _id: { $in: userIds },
      status: 'pending'
    });

    if (usersToReject.length === 0) {
      return ResponseBuilder.badRequest(res, 'No pending users found to reject');
    }

    // Update all users to rejected status
    const updateResult = await User.updateMany(
      { _id: { $in: usersToReject.map((u: any) => u._id) } },
      {
        status: 'rejected',
        approvedBy: user.email,
        approvedAt: new Date(),
        rejectionReason: reason
      }
    );

    // Send notification emails to all rejected users
    const emailPromises = usersToReject.map((userToReject: any) => 
      sendRejectionEmail(userToReject, reason).catch(error => {
        console.error(`Failed to send rejection email to ${userToReject.email}:`, error);
        return null;
      })
    );

    await Promise.allSettled(emailPromises);

    return ResponseBuilder.success(res, {
      message: `Successfully rejected ${updateResult.modifiedCount} users`,
      rejectedCount: updateResult.modifiedCount,
      rejectedUsers: usersToReject.map((u: any) => ({
        id: u._id,
        email: u.email,
        name: `${u.firstName} ${u.lastName}`
      })),
      rejectedBy: user.email,
      rejectedAt: new Date(),
      rejectionReason: reason
    });

  } catch (error) {
    console.error('Error bulk rejecting users:', error);
    return ResponseBuilder.serverError(res, 'Failed to reject users');
  }
}

/**
 * POST /api/admin/users/bulk-suspend - Bulk suspend users
 */
export async function bulkSuspend(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    const { userIds, reason } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return ResponseBuilder.badRequest(res, 'User IDs are required');
    }

    if (!reason || reason.trim().length === 0) {
      return ResponseBuilder.badRequest(res, 'Suspension reason is required');
    }

    // Find all users to suspend
    const usersToSuspend = await DatabaseService.findMany(User, {
      _id: { $in: userIds },
      status: 'approved'
    });

    if (usersToSuspend.length === 0) {
      return ResponseBuilder.badRequest(res, 'No approved users found to suspend');
    }

    // Update all users to suspended status
    const updateResult = await User.updateMany(
      { _id: { $in: usersToSuspend.map((u: any) => u._id) } },
      {
        status: 'suspended',
        approvedBy: user.email,
        approvedAt: new Date(),
        rejectionReason: reason
      }
    );

    // Send notification emails to all suspended users
    const emailPromises = usersToSuspend.map((userToSuspend: any) => 
      sendSuspensionEmail(userToSuspend, reason).catch(error => {
        console.error(`Failed to send suspension email to ${userToSuspend.email}:`, error);
        return null;
      })
    );

    await Promise.allSettled(emailPromises);

    return ResponseBuilder.success(res, {
      message: `Successfully suspended ${updateResult.modifiedCount} users`,
      suspendedCount: updateResult.modifiedCount,
      suspendedUsers: usersToSuspend.map((u: any) => ({
        id: u._id,
        email: u.email,
        name: `${u.firstName} ${u.lastName}`
      })),
      suspendedBy: user.email,
      suspendedAt: new Date(),
      suspensionReason: reason
    });

  } catch (error) {
    console.error('Error bulk suspending users:', error);
    return ResponseBuilder.serverError(res, 'Failed to suspend users');
  }
}

/**
 * Send approval email notification
 */
async function sendApprovalEmail(user: any): Promise<void> {
  try {
    const communicationService = CommunicationService.getInstance();
    
    const emailMessage: EmailMessage = {
      id: `approval-${user._id}-${Date.now()}`,
      channel: 'email',
      status: 'pending',
      recipient: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      },
      content: {
        subject: 'Account Approved - Groupe BZ Services',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Account Approved</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Welcome to Groupe BZ Services</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello ${user.firstName} ${user.lastName},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Great news! Your account has been approved and you can now access Groupe BZ Services.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/login" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                  Login to Your Account
                </a>
              </div>
            </div>
          </div>
        `,
        text: `Account Approved - Groupe BZ Services\n\nHello ${user.firstName} ${user.lastName},\n\nGreat news! Your account has been approved and you can now access Groupe BZ Services.\n\nLogin at: ${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/login`
      },
      metadata: {
        source: 'user-approval-system',
        category: 'user-notification',
        userId: user._id.toString()
      },
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await communicationService.sendEmail(emailMessage);
  } catch (error) {
    console.error('Error sending approval email:', error);
  }
}

/**
 * Send rejection email notification
 */
async function sendRejectionEmail(user: any, reason: string): Promise<void> {
  try {
    const communicationService = CommunicationService.getInstance();
    
    const emailMessage: EmailMessage = {
      id: `rejection-${user._id}-${Date.now()}`,
      channel: 'email',
      status: 'pending',
      recipient: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      },
      content: {
        subject: 'Account Application Rejected - Groupe BZ Services',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Application Rejected</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your account application was not approved</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello ${user.firstName} ${user.lastName},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We regret to inform you that your account application has been rejected.
              </p>
              
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <h3 style="color: #dc2626; margin: 0 0 8px 0; font-size: 16px;">Reason for Rejection:</h3>
                <p style="color: #7f1d1d; margin: 0; font-size: 14px;">${reason}</p>
              </div>
            </div>
          </div>
        `,
        text: `Application Rejected - Groupe BZ Services\n\nHello ${user.firstName} ${user.lastName},\n\nWe regret to inform you that your account application has been rejected.\n\nReason: ${reason}`
      },
      metadata: {
        source: 'user-rejection-system',
        category: 'user-notification',
        userId: user._id.toString()
      },
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await communicationService.sendEmail(emailMessage);
  } catch (error) {
    console.error('Error sending rejection email:', error);
  }
}

/**
 * Send suspension email notification
 */
async function sendSuspensionEmail(user: any, reason: string): Promise<void> {
  try {
    const communicationService = CommunicationService.getInstance();
    
    const emailMessage: EmailMessage = {
      id: `suspension-${user._id}-${Date.now()}`,
      channel: 'email',
      status: 'pending',
      recipient: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      },
      content: {
        subject: 'Account Suspended - Groupe BZ Services',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Account Suspended</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your account has been temporarily suspended</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello ${user.firstName} ${user.lastName},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your account has been suspended by an administrator. This means you will not be able to access Groupe BZ Services until further notice.
              </p>
              
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <h3 style="color: #dc2626; margin: 0 0 8px 0; font-size: 16px;">Reason for Suspension:</h3>
                <p style="color: #7f1d1d; margin: 0; font-size: 14px;">${reason}</p>
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                If you believe this suspension is in error, please contact our support team for assistance.
              </p>
            </div>
          </div>
        `,
        text: `Account Suspended - Groupe BZ Services\n\nHello ${user.firstName} ${user.lastName},\n\nYour account has been suspended by an administrator.\n\nReason: ${reason}\n\nIf you believe this suspension is in error, please contact our support team.`
      },
      metadata: {
        source: 'user-suspension-system',
        category: 'user-notification',
        userId: user._id.toString()
      },
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await communicationService.sendEmail(emailMessage);
  } catch (error) {
    console.error('Error sending suspension email:', error);
  }
}
