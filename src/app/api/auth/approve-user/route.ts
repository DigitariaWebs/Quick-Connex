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
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
          line-height: 1.6; 
          color: #374151; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: #f9fafb;
        }
        .container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 700;
        }
        .header p {
          margin: 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .content { 
          padding: 40px 30px; 
        }
        .success { 
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); 
          border: 1px solid #a7f3d0; 
          padding: 24px; 
          border-radius: 12px; 
          margin: 0 0 30px 0;
          border-left: 4px solid #10b981;
        }
        .success h3 {
          margin: 0 0 12px 0;
          color: #065f46;
          font-size: 20px;
          font-weight: 600;
        }
        .success p {
          margin: 0 0 8px 0;
          color: #047857;
        }
        .success strong {
          color: #065f46;
          font-weight: 600;
        }
        .section h3 {
          margin: 0 0 16px 0;
          color: #1f2937;
          font-size: 20px;
          font-weight: 600;
        }
        .section p {
          margin: 0 0 12px 0;
          color: #4b5563;
        }
        .section ul {
          margin: 0 0 20px 0;
          padding-left: 20px;
        }
        .section li {
          margin: 0 0 8px 0;
          color: #4b5563;
        }
        .section strong {
          color: #1f2937;
          font-weight: 600;
        }
        .cta { 
          text-align: center; 
          margin: 40px 0; 
        }
        .btn { 
          display: inline-block; 
          padding: 16px 32px; 
          background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
          color: white; 
          text-decoration: none; 
          border-radius: 12px; 
          font-weight: 600;
          font-size: 16px;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .btn:hover { 
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }
        .features { 
          background: #f1f5f9; 
          padding: 24px; 
          border-radius: 12px; 
          margin: 30px 0;
          border-left: 4px solid #64748b;
        }
        .features h4 {
          margin: 0 0 16px 0;
          color: #1f2937;
          font-size: 18px;
          font-weight: 600;
        }
        .features p {
          margin: 0 0 12px 0;
          color: #4b5563;
        }
        .features ul {
          margin: 0;
          padding-left: 20px;
        }
        .features li {
          margin: 0 0 8px 0;
          color: #4b5563;
        }
        .footer { 
          text-align: center; 
          color: #6b7280; 
          font-size: 14px; 
          margin-top: 40px; 
          padding: 30px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 0 0 8px 0;
        }
        .platform-name {
          font-weight: 700;
          color: #10b981;
        }
        @media (max-width: 600px) {
          .content {
            padding: 30px 20px;
          }
          .header {
            padding: 30px 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Congratulations!</h1>
          <p>Your Account Has Been Approved</p>
        </div>
        
        <div class="content">
          <div class="success">
            <h3>✅ Account Approved</h3>
            <p>Dear <strong>${user.firstName}</strong>,</p>
            <p>Great news! Your registration for <span class="platform-name">Groupe BZ Services</span> has been approved by our administrators.</p>
          </div>
          
          <div class="section">
            <h3>What's Next?</h3>
            <p>You can now access <span class="platform-name">Groupe BZ Services</span> with your registered credentials:</p>
            <ul>
              <li><strong>Email:</strong> ${user.email}</li>
              <li><strong>User Type:</strong> ${user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}</li>
            </ul>
          </div>
          
          <div class="cta">
            <a href="${baseUrl}/login" class="btn">Login to Your Account</a>
          </div>
          
          <div class="features">
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
          <p>Welcome to <span class="platform-name">Groupe BZ Services</span>!</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>
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
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
          line-height: 1.6; 
          color: #374151; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: #f9fafb;
        }
        .container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 700;
        }
        .header p {
          margin: 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .content { 
          padding: 40px 30px; 
        }
        .notice { 
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
          border: 1px solid #f59e0b; 
          padding: 24px; 
          border-radius: 12px; 
          margin: 0 0 30px 0;
          border-left: 4px solid #f59e0b;
        }
        .notice h3 {
          margin: 0 0 12px 0;
          color: #92400e;
          font-size: 20px;
          font-weight: 600;
        }
        .notice p {
          margin: 0 0 8px 0;
          color: #92400e;
        }
        .notice strong {
          color: #92400e;
          font-weight: 600;
        }
        .section h3 {
          margin: 0 0 16px 0;
          color: #1f2937;
          font-size: 20px;
          font-weight: 600;
        }
        .section p {
          margin: 0 0 12px 0;
          color: #4b5563;
        }
        .cta { 
          text-align: center; 
          margin: 40px 0; 
        }
        .btn { 
          display: inline-block; 
          padding: 16px 32px; 
          background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
          color: white; 
          text-decoration: none; 
          border-radius: 12px; 
          font-weight: 600;
          font-size: 16px;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .btn:hover { 
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }
        .next-steps { 
          background: #f1f5f9; 
          padding: 24px; 
          border-radius: 12px; 
          margin: 30px 0;
          border-left: 4px solid #64748b;
        }
        .next-steps h4 {
          margin: 0 0 16px 0;
          color: #1f2937;
          font-size: 18px;
          font-weight: 600;
        }
        .next-steps p {
          margin: 0 0 12px 0;
          color: #4b5563;
        }
        .next-steps ul {
          margin: 0;
          padding-left: 20px;
        }
        .next-steps li {
          margin: 0 0 8px 0;
          color: #4b5563;
        }
        .footer { 
          text-align: center; 
          color: #6b7280; 
          font-size: 14px; 
          margin-top: 40px; 
          padding: 30px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 0 0 8px 0;
        }
        .platform-name {
          font-weight: 700;
          color: #10b981;
        }
        @media (max-width: 600px) {
          .content {
            padding: 30px 20px;
          }
          .header {
            padding: 30px 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Account Registration Update</h1>
          <p>Important Information About Your Application</p>
        </div>
        
        <div class="content">
          <div class="notice">
            <h3>📝 Application Status Update</h3>
            <p>Dear <strong>${user.firstName}</strong>,</p>
            <p>Thank you for your interest in <span class="platform-name">Groupe BZ Services</span>. After careful review of your application, we regret to inform you that your registration could not be approved at this time.</p>
          </div>
          
          <div class="section">
            <h3>What This Means</h3>
            <p>Your account registration has been reviewed by our administrators, and unfortunately, it does not meet our current requirements.</p>
          </div>
          
          <div class="next-steps">
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
          <p>Thank you for your interest in <span class="platform-name">Groupe BZ Services</span>.</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>
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
ACCOUNT REGISTRATION UPDATE

Dear ${user.firstName},

Thank you for your interest in Groupe BZ Services. After careful review of your application, we regret to inform you that your registration could not be approved at this time.

WHAT THIS MEANS:
Your account registration has been reviewed by our administrators, and unfortunately, it does not meet our current requirements.

NEXT STEPS:
If you believe this decision was made in error or if you have additional information to provide, please:
- Contact our support team for more information
- Review the registration requirements
- Consider reapplying with updated information

APPLY AGAIN: ${baseUrl}/signup

Thank you for your interest in Groupe BZ Services.
If you have any questions, please contact our support team.
  `;
}
