import { NextRequest, NextResponse } from 'next/server';
import User from '@/models/User';
import { AuthService } from '@/lib/auth';
import { CommunicationService } from '@/lib/communication';
import { EmailMessage } from '@/lib/communication/core/types';

/**
 * POST /api/admin/users/[id]/approve
 * 
 * Approve a pending user registration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reason = 'Approved by administrator' } = body;

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
      status: 'approved',
      approvedBy: admin.email,
      approvedAt: new Date(),
      rejectionReason: undefined // Clear any previous rejection reason
    };

    await User.findByIdAndUpdate(id, updateData);

    // Send notification email to user
    await sendUserNotificationEmail(user, 'approve');

    console.log(`✅ User ${user.email} approved by ${admin.email}`);

    return NextResponse.json({
      success: true,
      message: 'User approved successfully',
      data: {
        userId: id,
        status: 'approved',
        approvedBy: admin.email,
        approvedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error approving user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve user' },
      { status: 500 }
    );
  }
}

/**
 * Send notification email to user about approval
 */
async function sendUserNotificationEmail(user: any, action: string) {
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
        subject: '🎉 Account Approved - Welcome to Patient Management System',
        html: generateApprovalNotificationHTML(user, baseUrl),
        text: generateApprovalNotificationText(user, baseUrl)
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
 * Generate HTML for approval notification
 */
function generateApprovalNotificationHTML(user: any, baseUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Approved - Welcome!</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Account Approved!</h1>
        <p style="color: white; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Welcome to <strong>Groupe BZ Services</strong></p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #10b981; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 8px 0; color: #065f46; font-size: 18px; font-weight: 600;">✅ Great News!</h3>
          <p style="margin: 0; color: #065f46;">Your account has been approved and you can now access <strong>Groupe BZ Services</strong>.</p>
        </div>
        
        <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">👤 Your Account Details</h3>
          <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
          <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>User Type:</strong> ${user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}</p>
          <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>Status:</strong> <span style="color: #10b981; font-weight: 600;">Approved</span></p>
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="${baseUrl}/login" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
            🚀 Access Your Account
          </a>
        </div>
        
        <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 30px 0 0 0; border-left: 4px solid #64748b;">
          <p style="margin: 0; color: #475569; font-size: 14px;"><strong>Next Steps:</strong> You can now log in to your account and start using <strong>Groupe BZ Services</strong>. If you have any questions, please contact our support team.</p>
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
 * Generate plain text for approval notification
 */
function generateApprovalNotificationText(user: any, baseUrl: string): string {
  return `
ACCOUNT APPROVED - WELCOME TO GROUPE BZ SERVICES!

Great news! Your account has been approved and you can now access Groupe BZ Services.

YOUR ACCOUNT DETAILS:
- Name: ${user.firstName} ${user.lastName}
- Email: ${user.email}
- User Type: ${user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}
- Status: Approved

NEXT STEPS:
You can now log in to your account and start using Groupe BZ Services.

ACCESS YOUR ACCOUNT: ${baseUrl}/login

If you have any questions, please contact our support team.

This is an automated message from Groupe BZ Services.
If you have any questions, please contact the system administrator.
  `;
}
