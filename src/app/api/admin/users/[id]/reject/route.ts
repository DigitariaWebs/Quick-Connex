import { NextRequest, NextResponse } from 'next/server';
import User from '@/models/User';
import { AuthService } from '@/lib/auth';
import { CommunicationService } from '@/lib/communication';
import { EmailMessage } from '@/lib/communication/core/types';
import { TemplateLoader } from '@/lib/communication/templates/core/TemplateLoader';

/**
 * POST /api/admin/users/[id]/reject
 * 
 * Reject a pending user registration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reason = 'Rejected by administrator' } = body;

    // Verify admin authentication
    const { user: admin } = await AuthService.requireAuth(request, {
      roles: ['admin', 'super_admin'],
      requireSession: true
    });
    // DatabaseService handles connection automatically
// Get user details
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `User is already ${user.status}` },
        { status: 400 }
      );
    }

    // Update user status
    const updateData = {
      status: 'rejected',
      approvedBy: admin.email,
      approvedAt: new Date(),
      rejectionReason: reason
    };

    await User.findByIdAndUpdate(id, updateData);

    // Send notification email to user
    await sendUserNotificationEmail(user, 'reject', reason);

    console.log(`❌ User ${user.email} rejected by ${admin.email}. Reason: ${reason}`);

    return NextResponse.json({
      success: true,
      message: 'User rejected successfully',
      data: {
        userId: id,
        status: 'rejected',
        rejectedBy: admin.email,
        rejectedAt: new Date(),
        rejectionReason: reason
      }
    });

  } catch (error) {
    console.error('Error rejecting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reject user' },
      { status: 500 }
    );
  }
}

/**
 * Send notification email to user about rejection
 */
async function sendUserNotificationEmail(user: any, action: string, reason: string) {
  try {
    const communicationService = CommunicationService.getInstance();
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    const emailMessage: EmailMessage = {
      id: `notification-${user._id}-${Date.now()}`,
      channel: 'email',
      status: 'pending',
      recipient: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      },
      content: (() => {
        const templateLoader = TemplateLoader.getInstance();
        const templateData = {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          baseUrl
        };
        const { html, text } = templateLoader.renderTemplateWithText('email/user/account-rejected.html', templateData);
        return {
          subject: 'Account Registration Update',
          html,
          text
        };
      })(),
      metadata: {
        source: 'user-approval-system',
        category: 'user-notification',
        userId: (user._id as any).toString()
      },
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await communicationService.sendEmail(emailMessage);
    console.log(`✅ ${action} notification email sent to ${user.email}`);

  } catch (error) {
    console.error(`❌ Error sending ${action} notification email:`, error);
  }
}

