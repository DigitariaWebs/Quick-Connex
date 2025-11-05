import { NextRequest, NextResponse } from 'next/server';
import { AuditService } from '@/lib/audit';
import { UserAuditContext } from '@/lib/audit';
import { DatabaseService } from '@/lib/database';
import User from '@/models/User';
import AuditLog, { ActorType, AuditAction, TargetResourceType, AuditCategory } from '@/models/AuditLog';
import { AuthService } from '@/lib/auth';
/**
 * GET /api/admin/users/[id]
 * Get detailed user information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const { user: adminUser } = await AuthService.requireAuth(request, {
      roles: ['admin', 'super_admin'],
      requireSession: true
    });
    
    const { id } = await params;
    
    // Get user details
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get login data from AuditLog
    const getLastLoginInfo = async () => {
      const lastLogin = await DatabaseService.findOne(AuditLog, {
        actorId: id,
        action: AuditAction.LOGIN_SUCCESS,
        category: AuditCategory.AUTHENTICATION
      }, {
        sort: { timestamp: -1 }
      });
      return {
        timestamp: lastLogin?.timestamp || null,
        ipAddress: lastLogin?.requestInfo?.ipAddress || null
      };
    };
    
    const getRecentFailedAttempts = async (minutes = 15) => {
      const cutoffTime = new Date(Date.now() - (minutes * 60 * 1000));
      const count = await DatabaseService.count(AuditLog, {
        actorId: id,
        action: AuditAction.LOGIN_FAILED,
        category: AuditCategory.AUTHENTICATION,
        timestamp: { $gte: cutoffTime }
      });
      return count;
    };
    
    const getSanitizedLoginHistory = async () => {
      const loginHistory = await DatabaseService.findMany(AuditLog, {
        actorId: id,
        action: { $in: [AuditAction.LOGIN_SUCCESS, AuditAction.LOGIN_FAILED] },
        category: AuditCategory.AUTHENTICATION
      }, {
        sort: { timestamp: -1 },
        limit: 50
      });
      
      return loginHistory.map((log: any) => ({
        timestamp: log.timestamp,
        success: log.action === AuditAction.LOGIN_SUCCESS,
        ipAddress: log.requestInfo?.ipAddress || 'unknown'
      }));
    };
    
    const [lastLoginInfo, recentFailedAttempts, sanitizedLoginHistory] = await Promise.all([
      getLastLoginInfo(),
      getRecentFailedAttempts(),
      getSanitizedLoginHistory()
    ]);
    
    const lastLogin = lastLoginInfo.timestamp;
    const lastLoginIp = lastLoginInfo.ipAddress;
    
    // Extract admin info from session
    const adminId = (adminUser._id as any)?.toString() || 'unknown';
    const adminEmail = adminUser.email || 'unknown';
    
    // Log admin access to user details
    const userContext: UserAuditContext = {
      actorId: adminId,
      actorType: ActorType.ADMIN,
      actorEmail: adminEmail,
      actorName: adminUser.firstName && adminUser.lastName 
        ? `${adminUser.firstName} ${adminUser.lastName}` 
        : adminUser.email || 'Admin User',
      actorRole: 'admin',
      action: AuditAction.USER_PROFILE_VIEWED,
      description: `Admin viewed user profile for ${user.email}`,
      targetResourceType: TargetResourceType.USER,
      targetResourceId: id,
      targetResourceName: `${user.firstName} ${user.lastName}`,
      metadata: {
        userType: user.userType,
        status: user.status,
        loginHistoryCount: sanitizedLoginHistory?.length || 0
      },
      requestInfo: AuditService.extractRequestInfo(request),
      success: true
    };
    
    await AuditService.logUserAction(userContext);
    
    return NextResponse.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          userType: user.userType,
          status: user.status,
          lastLogin: lastLogin,
          lastLoginIp: lastLoginIp,
          recentFailedAttempts: recentFailedAttempts,
          accountLockedUntil: user.accountLockedUntil,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        loginHistory: sanitizedLoginHistory
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user information
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // TODO: Implement update user
    
    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      data: { userId: id }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete user (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // TODO: Implement delete user
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      data: { userId: id }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}














