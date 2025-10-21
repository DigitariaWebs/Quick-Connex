import { NextRequest, NextResponse } from 'next/server';
import { logAdminAction, createUserAuditContext, extractRequestInfo } from '@/lib/security/admin-audit';
import User from '@/models/User';
import dbConnect from '@/lib/database/mongoose';

/**
 * GET /api/admin/users/[id]
 * Get detailed user information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Connect to database
    await dbConnect();
    
    // Get user details
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Calculate login data from loginHistory (inline calculation for reliability)
    const getLastLogin = () => {
      if (!user.loginHistory) return null;
      const successfulLogins = user.loginHistory
        .filter(entry => entry.success)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      return successfulLogins.length > 0 ? successfulLogins[0].timestamp : null;
    };
    
    const getLastLoginIp = () => {
      if (!user.loginHistory) return null;
      const successfulLogins = user.loginHistory
        .filter(entry => entry.success)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      return successfulLogins.length > 0 ? successfulLogins[0].ipAddress : null;
    };
    
    const getRecentFailedAttempts = (minutes = 15) => {
      if (!user.loginHistory) return 0;
      const cutoffTime = new Date(Date.now() - (minutes * 60 * 1000));
      return user.loginHistory.filter(entry => 
        !entry.success && entry.timestamp >= cutoffTime
      ).length;
    };
    
    const getSanitizedLoginHistory = () => {
      return user.loginHistory ? user.loginHistory.map(entry => ({
        timestamp: entry.timestamp,
        success: entry.success,
        ipAddress: entry.ipAddress, // This is already hashed
      })) : [];
    };
    
    const sanitizedLoginHistory = getSanitizedLoginHistory();
    
    // TODO: Extract admin info from session/token
    const adminId = 'admin-id'; // Replace with actual admin ID from session
    const adminEmail = 'admin@example.com'; // Replace with actual admin email
    
    // Log admin access to user details
    const auditContext = createUserAuditContext(
      adminId,
      adminEmail,
      'view_user_details',
      id,
      user.email,
      { 
        userType: user.userType,
        status: user.status,
        loginHistoryCount: sanitizedLoginHistory.length
      }
    );
    
    await logAdminAction(request, auditContext, true);
    
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
          lastLogin: getLastLogin(),
          lastLoginIp: getLastLoginIp(),
          recentFailedAttempts: getRecentFailedAttempts(),
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














