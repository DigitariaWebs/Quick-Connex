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
        category: 'user-notification',
        userId: user._id.toString(),
        action: action
      },
      priority: 'high'
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
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .cta { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .btn:hover { opacity: 0.9; }
        .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Congratulations!</h1>
        <p>Your Account Has Been Approved</p>
      </div>
      
      <div class="content">
        <div class="success">
          <h3>✅ Account Approved</h3>
          <p>Dear ${user.firstName},</p>
          <p>Great news! Your registration for the Patient Management System has been approved by our administrators.</p>
        </div>
        
        <h3>What's Next?</h3>
        <p>You can now access the Patient Management System with your registered credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${user.email}</li>
          <li><strong>User Type:</strong> ${user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}</li>
        </ul>
        
        <div class="cta">
          <a href="${baseUrl}/login" class="btn">Login to Your Account</a>
        </div>
        
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4>📋 Getting Started</h4>
          <p>Once you log in, you'll be able to:</p>
          <ul>
            <li>Access your personalized dashboard</li>
            <li>Manage patient transfers</li>
            <li>View and update your profile</li>
            <li>Collaborate with your team</li>
          </ul>
        </div>
      </div>
      
      <div class="footer">
        <p>Welcome to the Patient Management System!</p>
        <p>If you have any questions, please contact our support team.</p>
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
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .cta { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .btn:hover { opacity: 0.9; }
        .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 Account Registration Update</h1>
        <p>Important Information About Your Application</p>
      </div>
      
      <div class="content">
        <div class="notice">
          <h3>📝 Application Status Update</h3>
          <p>Dear ${user.firstName},</p>
          <p>Thank you for your interest in the Patient Management System. After careful review of your application, we regret to inform you that your registration could not be approved at this time.</p>
        </div>
        
        <h3>What This Means</h3>
        <p>Your account registration has been reviewed by our administrators, and unfortunately, it does not meet our current requirements.</p>
        
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4>💡 Next Steps</h4>
          <p>If you believe this decision was made in error or if you have additional information to provide, please:</p>
          <ul>
            <li>Contact our support team for more information</li>
            <li>Review the registration requirements</li>
            <li>Consider reapplying with updated information</li>
          </ul>
        </div>
        
        <div class="cta">
          <a href="${baseUrl}/signup" class="btn">Apply Again</a>
        </div>
      </div>
      
      <div class="footer">
        <p>Thank you for your interest in the Patient Management System.</p>
        <p>If you have any questions, please contact our support team.</p>
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

Great news! Your registration for the Patient Management System has been approved by our administrators.

WHAT'S NEXT?
You can now access the Patient Management System with your registered credentials:
- Email: ${user.email}
- User Type: ${user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}

LOGIN TO YOUR ACCOUNT: ${baseUrl}/login

GETTING STARTED:
Once you log in, you'll be able to:
- Access your personalized dashboard
- Manage patient transfers
- View and update your profile
- Collaborate with your team

Welcome to the Patient Management System!
If you have any questions, please contact our support team.
  `;
}

/**
 * Generate plain text for rejection notification
 */
function generateRejectionNotificationText(user: any, baseUrl: string): string {
  return `
ACCOUNT REGISTRATION UPDATE

Dear ${user.firstName},

Thank you for your interest in the Patient Management System. After careful review of your application, we regret to inform you that your registration could not be approved at this time.

WHAT THIS MEANS:
Your account registration has been reviewed by our administrators, and unfortunately, it does not meet our current requirements.

NEXT STEPS:
If you believe this decision was made in error or if you have additional information to provide, please:
- Contact our support team for more information
- Review the registration requirements
- Consider reapplying with updated information

APPLY AGAIN: ${baseUrl}/signup

Thank you for your interest in the Patient Management System.
If you have any questions, please contact our support team.
  `;
}
