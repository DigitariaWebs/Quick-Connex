import { NextResponse } from 'next/server';
import User from '@/models/User';
import { sendUserNotificationEmail } from '@/lib/communication/user-notifications';

/**
 * Approve or reject a user registration
 */
export async function GET(request: Request) {
  try {
    // DatabaseService handles connection automatically
const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const adminEmail = searchParams.get('admin') || 'system@admin.com';
    
    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing userId or action parameter' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user status
    if (action === 'approve') {
      user.status = 'active';
      user.approvedAt = new Date();
      user.approvedBy = adminEmail;
    } else {
      user.status = 'rejected';
      user.rejectedAt = new Date();
      user.rejectedBy = adminEmail;
    }

    await user;

    // Send notification email
    try {
      await sendUserNotificationEmail(user, action);
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: `User ${action}d successfully`,
      user: {
        id: user._id,
        email: user.email,
        status: user.status,
        approvedAt: user.approvedAt,
        rejectedAt: user.rejectedAt
      }
    });

  } catch (error) {
    console.error('Error in approve-user route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}