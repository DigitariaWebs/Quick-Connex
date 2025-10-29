/**
 * Email Templates
 * 
 * Simple email template functions using string replacement.
 */

import { CommunicationContent } from '../../../types/communication';

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
 * Render email template with simple string replacement
 */
export function renderEmailTemplate(templateId: string, data: Record<string, any>): CommunicationContent {
  const templates = getEmailTemplates();
  const template = templates.find(t => t.id === templateId);
  
  if (!template) {
    throw new Error(`Email template ${templateId} not found`);
  }
  
  let subject = template.subject || '';
  let text = template.text || '';
  let html = template.html || '';
  
  // Simple variable replacement
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
    text = text.replace(new RegExp(placeholder, 'g'), String(value));
    html = html.replace(new RegExp(placeholder, 'g'), String(value));
  }
  
  return {
    subject,
    text,
    html
  };
}

/**
 * Get email templates
 */
export function getEmailTemplates() {
  return [
    {
      id: 'transfer_request_email',
      name: 'Transfer Request Email',
      subject: 'New Transfer Request - {{transferId}}',
      text: 'New transfer request for {{patientName}} from {{fromHospital}} to {{toHospital}}. Priority: {{priority}}',
      html: `
        <h2>New Transfer Request</h2>
        <p><strong>Transfer ID:</strong> {{transferId}}</p>
        <p><strong>Patient:</strong> {{patientName}}</p>
        <p><strong>From:</strong> {{fromHospital}}</p>
        <p><strong>To:</strong> {{toHospital}}</p>
        <p><strong>Priority:</strong> {{priority}}</p>
        <p><strong>Requested by:</strong> {{requestedBy}}</p>
      `,
      variables: ['patientName', 'fromHospital', 'toHospital', 'priority', 'requestedBy', 'transferId']
    },
    {
      id: 'transfer_approved_email',
      name: 'Transfer Approved Email',
      subject: 'Transfer Approved - {{transferId}}',
      text: 'Transfer {{transferId}} has been approved for {{patientName}} from {{fromHospital}} to {{toHospital}}',
      html: `
        <h2>Transfer Approved</h2>
        <p><strong>Transfer ID:</strong> {{transferId}}</p>
        <p><strong>Patient:</strong> {{patientName}}</p>
        <p><strong>From:</strong> {{fromHospital}}</p>
        <p><strong>To:</strong> {{toHospital}}</p>
        <p><strong>Approved by:</strong> {{approvedBy}}</p>
      `,
      variables: ['patientName', 'fromHospital', 'toHospital', 'transferId', 'approvedBy']
    },
    {
      id: 'user_approval_email',
      name: 'User Approval Email',
      subject: 'Account {{status}} - {{firstName}} {{lastName}}',
      text: 'Your account has been {{status}} by {{approvedBy}}. {{reason}}',
      html: `
        <h2>Account {{status}}</h2>
        <p>Hello {{firstName}} {{lastName}},</p>
        <p>Your account has been {{status}} by {{approvedBy}}.</p>
        <p>{{reason}}</p>
      `,
      variables: ['status', 'approvedBy', 'reason', 'firstName', 'lastName']
    },
    {
      id: 'signup_request_email',
      name: 'Signup Request Email',
      subject: 'New User Signup Request - {{firstName}} {{lastName}}',
      text: 'New user signup request from {{firstName}} {{lastName}} ({{email}}). User type: {{userType}}',
      html: `
        <h2>New User Signup Request</h2>
        <p><strong>Name:</strong> {{firstName}} {{lastName}}</p>
        <p><strong>Email:</strong> {{email}}</p>
        <p><strong>User Type:</strong> {{userType}}</p>
        <p><strong>Requested at:</strong> {{requestedAt}}</p>
      `,
      variables: ['firstName', 'lastName', 'email', 'userType', 'requestedAt']
    }
  ];
}