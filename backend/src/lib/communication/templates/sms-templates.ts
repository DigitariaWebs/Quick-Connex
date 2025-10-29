/**
 * SMS Templates
 * 
 * SMS template generation and management.
 */

import { CommunicationTemplate, CommunicationContent } from '../../../types/communication';

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
 * Render SMS template
 */
export async function renderSMSTemplate(templateId: string, data: Record<string, any>): Promise<CommunicationContent> {
  // For SMS, we use simple text templates
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
export function getSMSTemplates(): CommunicationTemplate[] {
  return [
    {
      id: 'transfer_request_sms',
      name: 'Transfer Request SMS',
      channel: 'sms',
      category: 'transfer',
      text: 'New transfer request for {{patientName}} from {{fromHospital}} to {{toHospital}}. Priority: {{priority}}',
      variables: ['patientName', 'fromHospital', 'toHospital', 'priority'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'transfer_approved_sms',
      name: 'Transfer Approved SMS',
      channel: 'sms',
      category: 'transfer',
      text: 'Transfer {{transferId}} approved for {{patientName}}. From: {{fromHospital}} To: {{toHospital}}',
      variables: ['transferId', 'patientName', 'fromHospital', 'toHospital'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'urgent_notification_sms',
      name: 'Urgent Notification SMS',
      channel: 'sms',
      category: 'system',
      text: 'URGENT: {{message}}',
      variables: ['message'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ];
}

