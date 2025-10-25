import { NextRequest, NextResponse } from 'next/server';
import User from '@/models/User';
import { AuthService } from '@/lib/auth';
import { CommunicationService } from '@/lib/communication';
import { EmailMessage } from '@/lib/communication/core/types';

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
      content: {
        subject: '❌ Account Registration Update',
        html: generateRejectionNotificationHTML(user, baseUrl, reason),
        text: generateRejectionNotificationText(user, baseUrl, reason)
      },
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

/**
 * Generate HTML for rejection notification
 */
function generateRejectionNotificationHTML(user: any, baseUrl: string, reason: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Registration Update</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 28px;">❌ Account Registration Update</h1>
        <p style="color: white; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Update from <strong>Groupe BZ Services</strong></p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 1px solid #ef4444; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #ef4444;">
          <h3 style="margin: 0 0 8px 0; color: #991b1b; font-size: 18px; font-weight: 600;">📋 Registration Update</h3>
          <p style="margin: 0; color: #991b1b;">We regret to inform you that your account registration could not be approved at this time.</p>
        </div>
        
        <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #ef4444;">
          <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">👤 Your Registration Details</h3>
          <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
          <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>User Type:</strong> ${user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}</p>
          <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>Status:</strong> <span style="color: #ef4444; font-weight: 600;">Rejected</span></p>
        </div>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 16px; font-weight: 600;">📝 Reason for Rejection</h3>
          <p style="margin: 0; color: #92400e; font-size: 14px;">${reason}</p>
        </div>
        
        <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 30px 0 0 0; border-left: 4px solid #64748b;">
          <p style="margin: 0; color: #475569; font-size: 14px;"><strong>Next Steps:</strong> If you believe this decision was made in error or if you have additional information to provide, please contact our support team for further assistance.</p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          This is an automated message from <strong>Groupe BZ Services</strong>.<br>
          If you have any questions, please contact the system administrator.
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text for rejection notification
 */
function generateRejectionNotificationText(user: any, baseUrl: string, reason: string): string {
  return `
ACCOUNT REGISTRATION UPDATE - GROUPE BZ SERVICES

We regret to inform you that your account registration could not be approved at this time.

YOUR REGISTRATION DETAILS:
- Name: ${user.firstName} ${user.lastName}
- Email: ${user.email}
- User Type: ${user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}
- Status: Rejected

REASON FOR REJECTION:
${reason}

NEXT STEPS:
If you believe this decision was made in error or if you have additional information to provide, please contact our support team for further assistance.

This is an automated message from Groupe BZ Services.
If you have any questions, please contact the system administrator.
  `;
}
