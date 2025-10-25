import { CommunicationService } from '../core/CommunicationService';
import { EmailMessage } from '../core/types';

/**
 * Send notification email to user about approval/rejection
 */
export async function sendUserNotificationEmail(user: any, action: string) {
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
        subject: action === 'approve'
          ? '🎉 Your Account Has Been Approved!'
          : '❌ Account Application Update',
        html: action === 'approve'
          ? generateApprovalEmail(user, baseUrl)
          : generateRejectionEmail(user, baseUrl),
        text: action === 'approve'
          ? generateApprovalEmailText(user, baseUrl)
          : generateRejectionEmailText(user, baseUrl)
      },
      metadata: {
        source: 'user-approval-system',
        category: 'user-notification',
        userId: user._id.toString()
      },
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await communicationService.sendEmail(emailMessage);
    console.log(`✅ Notification email sent to ${user.email} for ${action}`);
  } catch (error) {
    console.error('❌ Failed to send notification email:', error);
    throw error;
  }
}

/**
 * Generate approval email HTML
 */
function generateApprovalEmail(user: any, baseUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎉 Account Approved!</h1>
        <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">Welcome to the Patient Management System</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Congratulations, ${user.firstName}!</h2>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Your account has been successfully approved by our administrators. You can now access the Patient Management System and start using all available features.
        </p>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 18px;">Your Account Details</h3>
          <p style="color: #166534; margin: 0; font-size: 14px;"><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
          <p style="color: #166534; margin: 5px 0 0 0; font-size: 14px;"><strong>Email:</strong> ${user.email}</p>
          <p style="color: #166534; margin: 5px 0 0 0; font-size: 14px;"><strong>Role:</strong> ${user.userType}</p>
          <p style="color: #166534; margin: 5px 0 0 0; font-size: 14px;"><strong>Status:</strong> Active</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/login" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
            🚀 Access Your Account
          </a>
        </div>
        
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">What's Next?</h3>
          <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.6;">
            <li>Log in to your account using your email and password</li>
            <li>Complete your profile setup if needed</li>
            <li>Explore the dashboard and available features</li>
            <li>Contact support if you have any questions</li>
          </ul>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
          If you have any questions or need assistance, please don't hesitate to contact our support team.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; color: #6b7280; font-size: 14px;">
        <p style="margin: 0;">This is an automated message from the Patient Management System.</p>
        <p style="margin: 5px 0 0 0;">Please do not reply to this email.</p>
      </div>
    </div>
  `;
}

/**
 * Generate rejection email HTML
 */
function generateRejectionEmail(user: any, baseUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">❌ Account Application Update</h1>
        <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 16px;">Your account application has been reviewed</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Dear ${user.firstName},</h2>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Thank you for your interest in the Patient Management System. After careful review, we regret to inform you that your account application has not been approved at this time.
        </p>
        
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #dc2626; margin: 0 0 10px 0; font-size: 18px;">Application Details</h3>
          <p style="color: #dc2626; margin: 0; font-size: 14px;"><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
          <p style="color: #dc2626; margin: 5px 0 0 0; font-size: 14px;"><strong>Email:</strong> ${user.email}</p>
          <p style="color: #dc2626; margin: 5px 0 0 0; font-size: 14px;"><strong>Status:</strong> Rejected</p>
        </div>
        
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Next Steps</h3>
          <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.6;">
            <li>You may reapply in the future if your circumstances change</li>
            <li>Contact our support team if you have questions about the decision</li>
            <li>Consider reaching out to your organization's administrator</li>
          </ul>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
          If you believe this decision was made in error or have additional information to provide, please contact our support team.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; color: #6b7280; font-size: 14px;">
        <p style="margin: 0;">This is an automated message from the Patient Management System.</p>
        <p style="margin: 5px 0 0 0;">Please do not reply to this email.</p>
      </div>
    </div>
  `;
}

/**
 * Generate approval email text
 */
function generateApprovalEmailText(user: any, baseUrl: string): string {
  return `
🎉 Account Approved!

Congratulations, ${user.firstName}!

Your account has been successfully approved by our administrators. You can now access the Patient Management System and start using all available features.

Your Account Details:
- Name: ${user.firstName} ${user.lastName}
- Email: ${user.email}
- Role: ${user.userType}
- Status: Active

What's Next?
- Log in to your account using your email and password
- Complete your profile setup if needed
- Explore the dashboard and available features
- Contact support if you have any questions

Access your account: ${baseUrl}/login

If you have any questions or need assistance, please don't hesitate to contact our support team.

This is an automated message from the Patient Management System.
Please do not reply to this email.
  `.trim();
}

/**
 * Generate rejection email text
 */
function generateRejectionEmailText(user: any, baseUrl: string): string {
  return `
❌ Account Application Update

Dear ${user.firstName},

Thank you for your interest in the Patient Management System. After careful review, we regret to inform you that your account application has not been approved at this time.

Application Details:
- Name: ${user.firstName} ${user.lastName}
- Email: ${user.email}
- Status: Rejected

Next Steps:
- You may reapply in the future if your circumstances change
- Contact our support team if you have questions about the decision
- Consider reaching out to your organization's administrator

If you believe this decision was made in error or have additional information to provide, please contact our support team.

This is an automated message from the Patient Management System.
Please do not reply to this email.
  `.trim();
}
