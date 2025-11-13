/**
 * Email Templates
 * 
 * Email template definitions and management for the communication system.
 */

import { CommunicationTemplate } from '../core/types';

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
      id: 'transfer_rejected_email',
      name: 'Transfer Rejected Email',
      channel: 'email',
      category: 'transfer',
      text: 'Transfer rejected: {{patientName}} from {{fromHospital}} to {{toHospital}}. Reason: {{reason}}',
      html: '{{TRANSFER_REJECTED_HTML}}',
      variables: ['transferId', 'patientName', 'fromHospital', 'toHospital', 'priority', 'rejectedBy', 'rejectedAt', 'reason'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'password_reset_email',
      name: 'Password Reset Email',
      channel: 'email',
      category: 'auth',
      text: 'Password reset requested for {{firstName}} {{lastName}}. Reset link expires in {{expirationMinutes}} hour(s).',
      html: '{{PASSWORD_RESET_HTML}}',
      variables: ['firstName', 'lastName', 'resetUrl', 'expirationMinutes'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'email_verification_email',
      name: 'Email Verification Email',
      channel: 'email',
      category: 'auth',
      text: 'Your email verification code is {{code}}. Valid for {{expirationMinutes}} minutes.',
      html: '{{EMAIL_VERIFICATION_HTML}}',
      variables: ['code', 'expirationMinutes', 'currentYear'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'user_approval_request_email',
      name: 'User Approval Request Email',
      channel: 'email',
      category: 'user',
      text: 'New user registration requires approval: {{name}} ({{email}}) - {{userType}}',
      html: '{{USER_APPROVAL_REQUEST_HTML}}',
      variables: ['name', 'email', 'phone', 'userType', 'userTypeDisplay', 'signupDate', 'post', 'ciusss', 'isManager', 'documents', 'hasDocuments', 'dashboardUrl'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'account_approved_email',
      name: 'Account Approved Email',
      channel: 'email',
      category: 'user',
      text: 'Your account has been approved. Welcome {{firstName}} {{lastName}}!',
      html: '{{ACCOUNT_APPROVED_HTML}}',
      variables: ['firstName', 'lastName', 'email', 'userType', 'baseUrl'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'account_rejected_email',
      name: 'Account Rejected Email',
      channel: 'email',
      category: 'user',
      text: 'Your account application has been rejected. We regret to inform you that your application was not approved.',
      html: '{{ACCOUNT_REJECTED_HTML}}',
      variables: ['firstName', 'lastName', 'email', 'baseUrl'],
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
    },
    {
      id: 'generic_notification_email',
      name: 'Generic Notification Email',
      channel: 'email',
      category: 'notification',
      text: '{{title}}: {{message}}',
      html: '{{GENERIC_NOTIFICATION_HTML}}',
      variables: ['title', 'message', 'borderColor', 'headerColor', 'hasTransferData', 'transferPatientName', 'transferFromHospital', 'transferToHospital', 'transferStatus', 'transferPriority'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ];
}

/**
 * Get email template by ID
 */
export function getEmailTemplateById(templateId: string): CommunicationTemplate | undefined {
  return getEmailTemplates().find(template => template.id === templateId);
}

/**
 * Get email templates by category
 */
export function getEmailTemplatesByCategory(category: string): CommunicationTemplate[] {
  return getEmailTemplates().filter(template => template.category === category);
}
