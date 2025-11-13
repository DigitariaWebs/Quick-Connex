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
      content: (() => {
        const templateLoader = TemplateLoader.getInstance();
        const templateData = {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          userType: user.userType,
          baseUrl
        };
        
        const templatePath = action === 'approve' 
          ? 'email/user/account-approved.html' 
          : 'email/user/account-rejected.html';
        
        const { html, text } = templateLoader.renderTemplateWithText(templatePath, templateData);
        
        return {
          subject: action === 'approve'
            ? 'Your Account Has Been Approved!'
            : 'Account Application Update',
          html,
          text
        };
      })(),
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
