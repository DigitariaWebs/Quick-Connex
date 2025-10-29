/**
 * User Notification Service
 * 
 * Handles user-related notifications like account approvals, rejections, etc.
 */

import { CommunicationService } from '../core/CommunicationService';
import { EmailMessage } from '../../../types/communication';
import { log } from '../../logging';
import { createCommunicationContext } from '../utils/logger';

export class UserNotificationService {
  private communicationService: CommunicationService;

  constructor() {
    this.communicationService = CommunicationService.getInstance();
  }

  /**
   * Send user approval notification
   */
  async sendUserApprovalNotification(user: any): Promise<void> {
    try {
      log.info('Sending user approval notification', 
        createCommunicationContext('user_notification_approval', {
          userId: user.id,
          userEmail: user.email
        })
      );

      const baseUrl = process.env['BASE_URL'] || 'http://localhost:3000';

      const emailMessage: EmailMessage = {
        id: `user-approval-${user.id}-${Date.now()}`,
        channel: 'email',
        status: 'pending',
        recipient: {
          userType: user.userType || 'employee',
          email: user.email,
          name: `${user.firstName} ${user.lastName}`
        },
        content: {
          subject: '🎉 Your Account Has Been Approved!',
          text: this.generateApprovalEmailText(user, baseUrl),
          html: this.generateApprovalEmailHTML(user, baseUrl)
        },
        priority: 'high',
        metadata: {
          source: 'user_approval_system',
          category: 'user_notification',
          userId: user.id,
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.communicationService.sendEmail(emailMessage);

      log.info('User approval notification sent successfully', 
        createCommunicationContext('user_notification_approval_complete', {
          userId: user.id,
          userEmail: user.email
        })
      );
    } catch (error) {
      log.error('Failed to send user approval notification', 
        createCommunicationContext('user_notification_approval_error', {
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      );
      throw error;
    }
  }

  /**
   * Send user rejection notification
   */
  async sendUserRejectionNotification(user: any, reason?: string): Promise<void> {
    try {
      log.info('Sending user rejection notification', 
        createCommunicationContext('user_notification_rejection', {
          userId: user.id,
          userEmail: user.email
        })
      );

      const baseUrl = process.env['BASE_URL'] || 'http://localhost:3001';

      const emailMessage: EmailMessage = {
        id: `user-rejection-${user.id}-${Date.now()}`,
        channel: 'email',
        status: 'pending',
        recipient: {
          userType: user.userType || 'employee',
          email: user.email,
          name: `${user.firstName} ${user.lastName}`
        },
        content: {
          subject: '❌ Account Application Update',
          text: this.generateRejectionEmailText(user, baseUrl, reason),
          html: this.generateRejectionEmailHTML(user, baseUrl, reason)
        },
        priority: 'medium',
        metadata: {
          source: 'user_approval_system',
          category: 'user_notification',
          userId: user.id
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.communicationService.sendEmail(emailMessage);

      log.info('User rejection notification sent successfully', 
        createCommunicationContext('user_notification_rejection_complete', {
          userId: user.id,
          userEmail: user.email
        })
      );
    } catch (error) {
      log.error('Failed to send user rejection notification', 
        createCommunicationContext('user_notification_rejection_error', {
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      );
      throw error;
    }
  }

  /**
   * Send password reset notification
   */
  async sendPasswordResetNotification(user: any, resetToken: string): Promise<void> {
    try {
      log.info('Sending password reset notification', 
        createCommunicationContext('user_notification_password_reset', {
          userId: user.id,
          userEmail: user.email
        })
      );

      const baseUrl = process.env['BASE_URL'] || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

      const emailMessage: EmailMessage = {
        id: `password-reset-${user.id}-${Date.now()}`,
        channel: 'email',
        status: 'pending',
        recipient: {
          userType: user.userType || 'employee',
          email: user.email,
          name: `${user.firstName} ${user.lastName}`
        },
        content: {
          subject: '🔐 Password Reset Request',
          text: this.generatePasswordResetEmailText(user, resetUrl),
          html: this.generatePasswordResetEmailHTML(user, resetUrl)
        },
        priority: 'high',
        metadata: {
          source: 'user_auth_system',
          category: 'user_notification',
          userId: user.id
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.communicationService.sendEmail(emailMessage);

      log.info('Password reset notification sent successfully', 
        createCommunicationContext('user_notification_password_reset_complete', {
          userId: user.id,
          userEmail: user.email
        })
      );
    } catch (error) {
      log.error('Failed to send password reset notification', 
        createCommunicationContext('user_notification_password_reset_error', {
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      );
      throw error;
    }
  }

  // Template generation methods
  private generateApprovalEmailText(user: any, baseUrl: string): string {
    return `
Congratulations ${user.firstName}!

Your account has been approved and you can now access the Patient Management System.

Login URL: ${baseUrl}/login
Email: ${user.email}

You can now:
- View and manage patient transfers
- Access hospital resources
- Collaborate with your team

If you have any questions, please contact your administrator.

Best regards,
Patient Management System Team
    `.trim();
  }

  private generateApprovalEmailHTML(user: any, baseUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Approved</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #10b981;">🎉 Congratulations ${user.firstName}!</h2>
    
    <p>Your account has been approved and you can now access the Patient Management System.</p>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="margin-top: 0; color: #1f2937;">Login Information</h3>
      <p><strong>Login URL:</strong> <a href="${baseUrl}/login" style="color: #2563eb;">${baseUrl}/login</a></p>
      <p><strong>Email:</strong> ${user.email}</p>
    </div>
    
    <h3 style="color: #1f2937;">What you can do now:</h3>
    <ul>
      <li>View and manage patient transfers</li>
      <li>Access hospital resources</li>
      <li>Collaborate with your team</li>
    </ul>
    
    <p>If you have any questions, please contact your administrator.</p>
    
    <p>Best regards,<br>Patient Management System Team</p>
  </div>
</body>
</html>
    `.trim();
  }

  private generateRejectionEmailText(user: any, _baseUrl: string, reason?: string): string {
    return `
Dear ${user.firstName},

We regret to inform you that your account application has not been approved at this time.

${reason ? `Reason: ${reason}` : 'Please contact your administrator for more information.'}

If you believe this is an error or have additional information to provide, please contact your administrator.

Best regards,
Patient Management System Team
    `.trim();
  }

  private generateRejectionEmailHTML(user: any, _baseUrl: string, reason?: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Application Update</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #dc2626;">❌ Account Application Update</h2>
    
    <p>Dear ${user.firstName},</p>
    
    <p>We regret to inform you that your account application has not been approved at this time.</p>
    
    ${reason ? `
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
      <h3 style="margin-top: 0; color: #1f2937;">Reason</h3>
      <p style="margin: 0;">${reason}</p>
    </div>
    ` : ''}
    
    <p>If you believe this is an error or have additional information to provide, please contact your administrator.</p>
    
    <p>Best regards,<br>Patient Management System Team</p>
  </div>
</body>
</html>
    `.trim();
  }

  private generatePasswordResetEmailText(user: any, resetUrl: string): string {
    return `
Hello ${user.firstName},

You requested a password reset for your account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email or contact your administrator.

Best regards,
Patient Management System Team
    `.trim();
  }

  private generatePasswordResetEmailHTML(user: any, resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset Request</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">🔐 Password Reset Request</h2>
    
    <p>Hello ${user.firstName},</p>
    
    <p>You requested a password reset for your account.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Reset Password
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
      This link will expire in 1 hour for security reasons.
    </p>
    
    <p>If you didn't request this password reset, please ignore this email or contact your administrator.</p>
    
    <p>Best regards,<br>Patient Management System Team</p>
  </div>
</body>
</html>
    `.trim();
  }
}
