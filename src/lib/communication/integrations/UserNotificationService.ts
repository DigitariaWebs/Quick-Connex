import { CommunicationService } from '../core/CommunicationService';
import { EmailMessage } from '../core/types';
import { TemplateLoader } from '../templates/core/TemplateLoader';

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
        html: (() => {
          const templateLoader = TemplateLoader.getInstance();
          const templateData = {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            userType: user.userType,
            baseUrl
          };
          return action === 'approve'
            ? templateLoader.renderTemplate('email/user/account-approved.html', templateData)
            : templateLoader.renderTemplate('email/user/account-rejected.html', templateData);
        })(),
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
