/**
 * Message Formatters
 * 
 * Core message formatting functions for the communication system.
 */

import {
  EmailMessage,
  SMSMessage,
  CommunicationServiceResponse,
  CommunicationContent
} from '../core/types';
// import { renderTemplate } from '../utils';

/**
 * Convert notification to email message
 */
export function createEmailFromNotification(notification: any, user: any): EmailMessage {
  return {
    id: `${notification.id}_email_${Date.now()}`,
    channel: 'email',
    priority: notification.priority,
    status: 'pending',
    recipient: {
      id: user._id.toString(),
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      userType: user.userType,
    },
    content: {
      subject: notification.title,
      text: notification.message,
      html: generateEmailHTML(notification),
    },
    metadata: {
      source: 'notification_system',
      category: notification.type,
      notificationId: notification.id,
      transferId: notification.transferId,
      userId: notification.createdBy,
    },
    tracking: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Convert notification to SMS message
 */
export function createSMSFromNotification(notification: any, user: any): SMSMessage {
  return {
    id: `${notification.id}_sms_${Date.now()}`,
    channel: 'sms',
    priority: notification.priority,
    status: 'pending',
    recipient: {
      id: user._id.toString(),
      phone: user.phone,
      name: `${user.firstName} ${user.lastName}`,
      userType: user.userType,
      countryCode: '1'
    },
    content: {
      text: generateSMSText(notification),
    },
    metadata: {
      source: 'notification_system',
      category: notification.type,
      notificationId: notification.id,
      transferId: notification.transferId,
      userId: notification.createdBy,
    },
    tracking: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Generate HTML content for email notifications
 */
export function generateEmailHTML(notification: any): string {
  const isUrgent = notification.priority === 'urgent';
  const borderColor = isUrgent ? '#ff0000' : '#007bff';
  const headerColor = isUrgent ? '#ff0000' : '#333333';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid ${borderColor}; padding: 20px;">
      <h2 style="color: ${headerColor};">${notification.title}</h2>
      <p>${notification.message}</p>
      ${notification.data?.transfer ? `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3>Transfer Details</h3>
          <p><strong>Patient:</strong> ${notification.data.transfer.patient?.firstName} ${notification.data.transfer.patient?.lastName}</p>
          <p><strong>From:</strong> ${notification.data.transfer.fromHospitalName || notification.data.transfer.fromHospital}</p>
          <p><strong>To:</strong> ${notification.data.transfer.toHospitalName || notification.data.transfer.toHospital}</p>
          <p><strong>Status:</strong> ${notification.data.transfer.status}</p>
          <p><strong>Priority:</strong> ${notification.data.transfer.priority}</p>
        </div>
      ` : ''}
      <hr>
      <p><small>This is an automated message from the Patient Management System.</small></p>
    </div>
  `;
}

/**
 * Generate SMS text for notifications
 */
export function generateSMSText(notification: any): string {
  let text = `${notification.title}: ${notification.message}`;
  
  if (notification.data?.transfer) {
    const transfer = notification.data.transfer;
    text += ` Patient: ${transfer.patient?.firstName} ${transfer.patient?.lastName}`;
    text += ` From: ${transfer.fromHospitalName || transfer.fromHospital} To: ${transfer.toHospitalName || transfer.toHospital}`;
  }

  // Truncate if too long
  if (text.length > 160) {
    text = text.substring(0, 157) + '...';
  }

  return text;
}

/**
 * Render email template
 */
export async function renderEmailTemplate(templateId: string, data: Record<string, any>): Promise<CommunicationContent> {
  // Email templates are generated dynamically
  // This would typically load from a template system
  throw new Error(`Email template ${templateId} not found`);
}

/**
 * Render SMS template
 */
export async function renderSMSTemplate(templateId: string, data: Record<string, any>): Promise<CommunicationContent> {
  const templates = getSMSTemplates();
  const template = templates.find(t => t.id === templateId);
  
  if (!template) {
    throw new Error(`SMS template ${templateId} not found`);
  }

  return {
    text: template.text.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match),
    template: templateId,
    templateData: data,
  };
}

// Import getSMSTemplates from sms-templates
import { getSMSTemplates } from './sms-templates';
