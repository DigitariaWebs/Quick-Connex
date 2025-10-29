/**
 * SMS Templates
 * 
 * Simple SMS template functions using string replacement.
 */

import { CommunicationContent } from '../../../types/communication';

/**
 * Create SMS from notification
 */
export function createSMSFromNotification(notification: any, user: any): any {
  return {
    id: `sms_${notification._id}_${user.id}`,
    channel: 'sms' as const,
    priority: notification.priority || 'medium',
    status: 'pending' as const,
    recipient: {
      phone: user.phone,
      name: `${user.firstName} ${user.lastName}`,
      userType: user.userType,
      countryCode: '1'
    },
    content: {
      text: generateSMSText(notification, user)
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
 * Generate SMS text
 */
export function generateSMSText(notification: any, user: any): string {
  let text = `${notification.title}: ${notification.message}`;
  
  // Truncate if too long
  if (text.length > 160) {
    text = text.substring(0, 157) + '...';
  }

  return text;
}

/**
 * Render SMS template with simple string replacement
 */
export function renderSMSTemplate(templateId: string, data: Record<string, any>): CommunicationContent {
  const templates = getSMSTemplates();
  const template = templates.find(t => t.id === templateId);
  
  if (!template) {
    throw new Error(`SMS template ${templateId} not found`);
  }
  
  let text = template.text;
  
  // Simple variable replacement
  for (const [key, value] of Object.entries(data)) {
    text = text.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  
  return {
    text
  };
}

/**
 * Get SMS templates
 */
export function getSMSTemplates() {
  return [
    {
      id: 'transfer_request_sms',
      name: 'Transfer Request SMS',
      text: 'New transfer request for {{patientName}} from {{fromHospital}} to {{toHospital}}. Priority: {{priority}}',
      variables: ['patientName', 'fromHospital', 'toHospital', 'priority']
    },
    {
      id: 'transfer_approved_sms',
      name: 'Transfer Approved SMS',
      text: 'Transfer {{transferId}} approved for {{patientName}}. From: {{fromHospital}} To: {{toHospital}}',
      variables: ['transferId', 'patientName', 'fromHospital', 'toHospital']
    },
    {
      id: 'urgent_notification_sms',
      name: 'Urgent Notification SMS',
      text: 'URGENT: {{message}}',
      variables: ['message']
    },
    {
      id: 'user_approval_sms',
      name: 'User Approval SMS',
      text: 'Account {{status}} by {{approvedBy}}. {{reason}}',
      variables: ['status', 'approvedBy', 'reason']
    },
    {
      id: 'signup_request_sms',
      name: 'Signup Request SMS',
      text: 'New signup request from {{firstName}} {{lastName}} ({{userType}})',
      variables: ['firstName', 'lastName', 'userType']
    }
  ];
}