import { NextRequest, NextResponse } from 'next/server';
import User from '@/models/User';
import { AuthService } from '@/lib/auth';
import { sendUserNotificationEmail } from '@/lib/communication/user-notifications';

export async function POST(request: NextRequest) {
  try {
    const { userIds, reason } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User IDs are required' },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Verify admin authentication
    const { user: adminUser } = await AuthService.requireAuth(request, {
      roles: ['admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
// Find all users to reject
    const usersToReject = await User.find({
      _id: { $in: userIds },
      status: 'pending'
    });

    if (usersToReject.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No pending users found to reject' },
        { status: 400 }
      );
    }

    // Update all users to rejected status
    const updateResult = await User.updateMany(
      { _id: { $in: usersToReject.map(u => u._id) } },
      {
        status: 'rejected',
        approvedBy: adminUser.email,
        approvedAt: new Date(),
        rejectionReason: reason
      }
    );

    // Send notification emails to all rejected users
    const emailPromises = usersToReject.map(user => 
      sendUserNotificationEmail(user, 'reject').catch(error => {
        console.error(`Failed to send rejection email to ${user.email}:`, error);
        return null; // Don't fail the whole operation for email errors
      })
    );

    await Promise.allSettled(emailPromises);

    console.log(`❌ Bulk rejected ${updateResult.modifiedCount} users by ${adminUser.email}. Reason: ${reason}`);

    return NextResponse.json({
      success: true,
      message: `Successfully rejected ${updateResult.modifiedCount} users`,
      rejectedCount: updateResult.modifiedCount,
      data: {
        rejectedUsers: usersToReject.map(u => ({
          id: u._id,
          email: u.email,
          name: `${u.firstName} ${u.lastName}`
        })),
        rejectedBy: adminUser.email,
        rejectedAt: new Date(),
        rejectionReason: reason
      }
    });

  } catch (error) {
    console.error('Error bulk rejecting users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reject users' },
      { status: 500 }
    );
  }
}
