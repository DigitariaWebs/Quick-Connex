import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { EmailService } from '@/lib/communication/email-service';
import { EmailMessage } from '@/types/communication-types';

/**
 * Approve or reject a user registration
 */
export async function GET(request: Request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const adminEmail = searchParams.get('admin') || 'system@admin.com';
    
    if (!userId || !action) {
      return NextResponse.json(
        { error: 'User ID and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.status !== 'pending') {
      return NextResponse.json(
        { error: `User is already ${user.status}` },
        { status: 400 }
      );
    }

    // Update user status
    const updateData: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approvedBy: adminEmail,
      approvedAt: new Date()
    };

    if (action === 'reject') {
      updateData.rejectionReason = 'Rejected by administrator';
    }

    await User.findByIdAndUpdate(userId, updateData);

    // Send notification email to user
    await sendUserNotificationEmail(user, action);

    // Return success response with redirect
    const redirectUrl = action === 'approve' 
      ? '/admin/users?message=user-approved'
      : '/admin/users?message=user-rejected';

    return NextResponse.redirect(new URL(redirectUrl, request.url));

  } catch (error) {
    console.error('Error processing user approval:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Send notification email to user about approval/rejection
 */
async function sendUserNotificationEmail(user: any, action: string) {
  try {
    const emailService = new EmailService();
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
        subject: action === 'approve' 
          ? '🎉 Account Approved - Welcome to Patient Management System'
          : '❌ Account Registration Update',
        html: action === 'approve' 
          ? generateApprovalNotificationHTML(user, baseUrl)
          : generateRejectionNotificationHTML(user, baseUrl),
        text: action === 'approve'
          ? generateApprovalNotificationText(user, baseUrl)
          : generateRejectionNotificationText(user, baseUrl)
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

    await emailService.sendEmail(emailMessage);
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
      <title>Account Approved</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1f2937; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
        <p style="color: #1f2937; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Your Account Has Been Approved</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #a7f3d0; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 12px 0; color: #065f46; font-size: 20px; font-weight: 600;">✅ Account Approved</h3>
          <p style="margin: 0 0 8px 0; color: #047857;">Dear <strong>${user.firstName}</strong>,</p>
          <p style="margin: 0; color: #047857;">Great news! Your registration for <strong>Groupe BZ Services</strong> has been approved by our administrators.</p>
        </div>
        
        <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">🚀 What's Next?</h3>
          <p style="margin: 0 0 12px 0; color: #4b5563;">You can now access <strong>Groupe BZ Services</strong> with your registered credentials:</p>
          <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>User Type:</strong> ${user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}</p>
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="${baseUrl}/login" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
            🎯 Login to Your Account
          </a>
        </div>
        
        <div style="background: #f1f5f9; padding: 24px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #64748b;">
          <h4 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px; font-weight: 600;">🌟 Getting Started</h4>
          <p style="margin: 0 0 12px 0; color: #4b5563;">Once you log in, you'll be able to:</p>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
            <li style="margin: 0 0 8px 0;">Access your personalized dashboard</li>
            <li style="margin: 0 0 8px 0;">Manage patient transfers</li>
            <li style="margin: 0 0 8px 0;">View and update your profile</li>
            <li style="margin: 0 0 8px 0;">Collaborate with your team</li>
          </ul>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          Welcome to <strong>Groupe BZ Services</strong>!<br>
          If you have any questions, please contact our support team.
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML for rejection notification
 */
function generateRejectionNotificationHTML(user: any, baseUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Registration Update</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1f2937; margin: 0; font-size: 28px;">❌ Registration Update</h1>
        <p style="color: #1f2937; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Account Registration Status</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 1px solid #fca5a5; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #ef4444;">
          <h3 style="margin: 0 0 12px 0; color: #991b1b; font-size: 20px; font-weight: 600;">❌ Registration Not Approved</h3>
          <p style="margin: 0 0 8px 0; color: #b91c1c;">Dear <strong>${user.firstName}</strong>,</p>
          <p style="margin: 0; color: #b91c1c;">We regret to inform you that your registration for <strong>Groupe BZ Services</strong> has not been approved at this time.</p>
        </div>
        
        <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #64748b;">
          <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">📋 Next Steps</h3>
          <p style="margin: 0 0 12px 0; color: #4b5563;">If you believe this is an error or would like to reapply, please:</p>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
            <li style="margin: 0 0 8px 0;">Contact our support team for more information</li>
            <li style="margin: 0 0 8px 0;">Review your application details</li>
            <li style="margin: 0 0 8px 0;">Submit a new application if needed</li>
          </ul>
        </div>
        
        <div style="background: #f1f5f9; padding: 24px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #64748b;">
          <h4 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px; font-weight: 600;">💬 Contact Support</h4>
          <p style="margin: 0 0 12px 0; color: #4b5563;">If you have any questions about this decision, please don't hesitate to contact our support team. We're here to help.</p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          Thank you for your interest in <strong>Groupe BZ Services</strong>.<br>
          We appreciate your understanding.
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
CONGRATULATIONS! YOUR ACCOUNT HAS BEEN APPROVED

Dear ${user.firstName},

Great news! Your registration for Groupe BZ Services has been approved by our administrators.

WHAT'S NEXT?
You can now access Groupe BZ Services with your registered credentials:
- Email: ${user.email}
- User Type: ${user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}

LOGIN TO YOUR ACCOUNT: ${baseUrl}/login

GETTING STARTED:
Once you log in, you'll be able to:
- Access your personalized dashboard
- Manage patient transfers
- View and update your profile
- Collaborate with your team

Welcome to Groupe BZ Services!
If you have any questions, please contact our support team.
  `;
}

/**
 * Generate plain text for rejection notification
 */
function generateRejectionNotificationText(user: any, baseUrl: string): string {
  return `
REGISTRATION UPDATE

Dear ${user.firstName},

We regret to inform you that your registration for Groupe BZ Services has not been approved at this time.

NEXT STEPS:
If you believe this is an error or would like to reapply, please:
- Contact our support team for more information
- Review your application details
- Submit a new application if needed

CONTACT SUPPORT:
If you have any questions about this decision, please don't hesitate to contact our support team. We're here to help.

Thank you for your interest in Groupe BZ Services.
We appreciate your understanding.
  `;
}