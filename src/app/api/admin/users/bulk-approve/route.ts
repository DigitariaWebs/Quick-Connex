import { NextRequest, NextResponse } from 'next/server';
import User from '@/models/User';
import { AuthService } from '@/lib/auth';
import { sendUserNotificationEmail } from '@/lib/communication/integrations/UserNotificationService';

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User IDs are required' },
        { status: 400 }
      );
    }

    // Verify admin authentication
    const { user: adminUser } = await AuthService.requireAuth(request, {
      roles: ['admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
// Find all users to approve
    const usersToApprove = await User.find({
      _id: { $in: userIds },
      status: 'pending'
    });

    if (usersToApprove.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No pending users found to approve' },
        { status: 400 }
      );
    }

    // Update all users to approved status
    const updateResult = await User.updateMany(
      { _id: { $in: usersToApprove.map(u => u._id) } },
      {
        status: 'approved',
        approvedBy: adminUser.email,
        approvedAt: new Date(),
        rejectionReason: undefined
      }
    );

    // Send notification emails to all approved users
    const emailPromises = usersToApprove.map(user => 
      sendUserNotificationEmail(user, 'approve').catch(error => {
        console.error(`Failed to send approval email to ${user.email}:`, error);
        return null; // Don't fail the whole operation for email errors
      })
    );

    await Promise.allSettled(emailPromises);

    console.log(`✅ Bulk approved ${updateResult.modifiedCount} users by ${adminUser.email}`);

    return NextResponse.json({
      success: true,
      message: `Successfully approved ${updateResult.modifiedCount} users`,
      approvedCount: updateResult.modifiedCount,
      data: {
        approvedUsers: usersToApprove.map(u => ({
          id: u._id,
          email: u.email,
          name: `${u.firstName} ${u.lastName}`
        })),
        approvedBy: adminUser.email,
        approvedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error bulk approving users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve users' },
      { status: 500 }
    );
  }
}
