/**
 * Email Templates
 * 
 * Email template generation and management.
 */

import { CommunicationTemplate, CommunicationContent } from '../../../types/communication';

/**
 * Create email from notification
 */
export function createEmailFromNotification(notification: any, user: any): any {
  return {
    id: `email_${notification._id}_${user.id}`,
    channel: 'email' as const,
    priority: notification.priority || 'medium',
    status: 'pending' as const,
    recipient: {
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      userType: user.userType
    },
    content: {
      subject: notification.title,
      text: notification.message,
      html: generateEmailHTML(notification, user)
    },
    metadata: {
      source: 'notification_system',
      category: notification.type,
      notificationId: notification._id?.toString(),
      userId: user.id
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Generate email HTML
 */
export function generateEmailHTML(notification: any, user: any): string {
  const isUrgent = notification.priority === 'urgent';
  const borderColor = isUrgent ? '#ff0000' : '#007bff';
  const headerColor = isUrgent ? '#ff0000' : '#333333';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; border: 2px solid ${borderColor}; padding: 20px; border-radius: 5px;">
        <h2 style="color: ${headerColor};">${notification.title}</h2>
        <p>${notification.message}</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          This is an automated message from the Patient Management System.
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Render email template
 */
export async function renderEmailTemplate(templateId: string, _data: Record<string, any>): Promise<CommunicationContent> {
  // TODO: Implement template rendering
  // For now, return basic content
  return {
    subject: `Template: ${templateId}`,
    text: `Template content for ${templateId}`,
    html: `<p>Template content for ${templateId}</p>`
  };
}

/**
 * Get email templates
 */
export function getEmailTemplates(): CommunicationTemplate[] {
  return [
    {
      id: 'transfer_request_email',
      name: 'Transfer Request Email',
      channel: 'email',
      category: 'transfer',
      text: 'New transfer request for {{patientName}} from {{fromHospital}} to {{toHospital}}',
      html: '{{TRANSFER_REQUEST_HTML}}',
      variables: ['patientName', 'fromHospital', 'toHospital', 'priority', 'requestedBy'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'transfer_approved_email',
      name: 'Transfer Approved Email',
      channel: 'email',
      category: 'transfer',
      text: 'Transfer approved for {{patientName}} from {{fromHospital}} to {{toHospital}}',
      html: '{{TRANSFER_APPROVED_HTML}}',
      variables: ['patientName', 'fromHospital', 'toHospital', 'transferId', 'approvedBy'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'user_approval_email',
      name: 'User Approval Email',
      channel: 'email',
      category: 'user',
      text: 'Your account has been {{status}} by {{approvedBy}}',
      html: '{{USER_APPROVAL_HTML}}',
      variables: ['status', 'approvedBy', 'reason'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ];
}

