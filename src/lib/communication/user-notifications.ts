import { EmailService } from '@/lib/communication/channels/email/email-service';
import { EmailMessage } from '@/types/communication';

/**
 * Send notification email to user about approval/rejection
 */
export async function sendUserNotificationEmail(user: any, action: string) {
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

    await emailService.sendEmail(emailMessage);
    console.log(`✅ Notification email sent to ${user.email} for ${action}`);
  } catch (error) {
    console.error('❌ Failed to send notification email:', error);
    throw error;
  }
}

function generateApprovalEmail(user: any, baseUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Account Approved</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Congratulations!</h1>
          <h2>Your Account Has Been Approved</h2>
        </div>
        <div class="content">
          <p>Dear ${user.firstName} ${user.lastName},</p>
          
          <p>Great news! Your account application has been reviewed and <strong>approved</strong> by our administration team.</p>
          
          <p>You can now access your account and start using our services:</p>
          
          <div style="text-align: center;">
            <a href="${baseUrl}/login" class="button">Login to Your Account</a>
          </div>
          
          <h3>What's Next?</h3>
          <ul>
            <li>Log in to your account using your registered email and password</li>
            <li>Complete your profile setup if needed</li>
            <li>Explore the available features and services</li>
            <li>Contact support if you have any questions</li>
          </ul>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>Welcome to Groupe BZ Services!</p>
          
          <p>Best regards,<br>
          The Groupe BZ Services Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateApprovalEmailText(user: any, baseUrl: string): string {
  return `
Congratulations! Your Account Has Been Approved

Dear ${user.firstName} ${user.lastName},

Great news! Your account application has been reviewed and approved by our administration team.

You can now access your account and start using our services:
${baseUrl}/login

What's Next?
- Log in to your account using your registered email and password
- Complete your profile setup if needed
- Explore the available features and services
- Contact support if you have any questions

If you have any questions or need assistance, please don't hesitate to contact our support team.

Welcome to Groupe BZ Services!

Best regards,
The Groupe BZ Services Team

---
This is an automated message. Please do not reply to this email.
  `;
}

function generateRejectionEmail(user: any, baseUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Account Application Update</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f44336; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Account Application Update</h1>
        </div>
        <div class="content">
          <p>Dear ${user.firstName} ${user.lastName},</p>
          
          <p>Thank you for your interest in Groupe BZ Services. After careful review of your application, we regret to inform you that we are unable to approve your account at this time.</p>
          
          <p>This decision was made based on our current requirements and application criteria.</p>
          
          <h3>NEXT STEPS:</h3>
          <p>If you believe this is an error or would like to reapply, please:</p>
          <ul>
            <li>Contact our support team for more information</li>
            <li>Review your application details</li>
            <li>Submit a new application if needed</li>
          </ul>
          
          <h3>CONTACT SUPPORT:</h3>
          <p>If you have any questions about this decision, please don't hesitate to contact our support team. We're here to help.</p>
          
          <p>Thank you for your interest in Groupe BZ Services.<br>
          We appreciate your understanding.</p>
          
          <p>Best regards,<br>
          The Groupe BZ Services Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateRejectionEmailText(user: any, baseUrl: string): string {
  return `
Account Application Update

Dear ${user.firstName} ${user.lastName},

Thank you for your interest in Groupe BZ Services. After careful review of your application, we regret to inform you that we are unable to approve your account at this time.

This decision was made based on our current requirements and application criteria.

NEXT STEPS:
If you believe this is an error or would like to reapply, please:
- Contact our support team for more information
- Review your application details
- Submit a new application if needed

CONTACT SUPPORT:
If you have any questions about this decision, please don't hesitate to contact our support team. We're here to help.

Thank you for your interest in Groupe BZ Services.
We appreciate your understanding.

Best regards,
The Groupe BZ Services Team

---
This is an automated message. Please do not reply to this email.
  `;
}
