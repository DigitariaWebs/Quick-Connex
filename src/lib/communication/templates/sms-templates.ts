/**
 * SMS Templates
 * 
 * SMS template definitions and management for the communication system.
 */

import { CommunicationTemplate } from '../core/types';

/**
 * Get SMS templates
 */
export function getSMSTemplates(): CommunicationTemplate[] {
  return [
    {
      id: 'new_transfer_request_sms',
      name: 'New Transfer Request SMS',
      channel: 'sms',
      category: 'transfer',
      text: '🆕 New transfer request: {{patientName}} ({{patientAge}}y) from {{fromHospital}} to {{toHospital}}. Priority: {{priority}}. Requested by: {{requestedBy}}',
      variables: ['patientName', 'patientAge', 'fromHospital', 'toHospital', 'priority', 'requestedBy'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'transfer_approved_sms',
      name: 'Transfer Approved SMS',
      channel: 'sms',
      category: 'transfer',
      text: '✅ Transfer approved: {{patientName}} from {{fromHospital}} to {{toHospital}}. Transfer ID: {{transferId}}. Please check dashboard for details.',
      variables: ['patientName', 'fromHospital', 'toHospital', 'transferId'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'transfer_rejected_sms',
      name: 'Transfer Rejected SMS',
      channel: 'sms',
      category: 'transfer',
      text: '❌ Transfer rejected: {{patientName}} from {{fromHospital}} to {{toHospital}}. Transfer ID: {{transferId}}. Reason: {{reason}}',
      variables: ['patientName', 'fromHospital', 'toHospital', 'transferId', 'reason'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'transfer_accepted_sms',
      name: 'Transfer Accepted SMS',
      channel: 'sms',
      category: 'transfer',
      text: '✅ Transfer accepted: {{patientName}} from {{fromHospital}} to {{toHospital}}. Transfer ID: {{transferId}}. Assigned to: {{assignedTo}}',
      variables: ['patientName', 'fromHospital', 'toHospital', 'transferId', 'assignedTo'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'transfer_completed_sms',
      name: 'Transfer Completed SMS',
      channel: 'sms',
      category: 'transfer',
      text: '✅ Transfer completed: {{patientName}} from {{fromHospital}} to {{toHospital}}. Transfer ID: {{transferId}}. Completed by: {{completedBy}}',
      variables: ['patientName', 'fromHospital', 'toHospital', 'transferId', 'completedBy'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'urgent_transfer_sms',
      name: 'Urgent Transfer SMS',
      channel: 'sms',
      category: 'transfer',
      text: '🚨 URGENT: {{patientName}} ({{patientAge}}y) needs immediate transfer from {{fromHospital}} to {{toHospital}}. Priority: {{priority}}. Contact: {{contactPhone}}',
      variables: ['patientName', 'patientAge', 'fromHospital', 'toHospital', 'priority', 'contactPhone'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'system_maintenance_sms',
      name: 'System Maintenance SMS',
      channel: 'sms',
      category: 'system',
      text: '🔧 System maintenance scheduled: {{startTime}} to {{endTime}}. Some features may be unavailable. Contact support if urgent.',
      variables: ['startTime', 'endTime'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'password_reset_sms',
      name: 'Password Reset SMS',
      channel: 'sms',
      category: 'auth',
      text: '🔐 Password reset code: {{resetCode}}. Valid for 15 minutes. If you didn\'t request this, ignore this message.',
      variables: ['resetCode'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ];
}

/**
 * Get SMS template by ID
 */
export function getSMSTemplateById(templateId: string): CommunicationTemplate | undefined {
  return getSMSTemplates().find(template => template.id === templateId);
}

/**
 * Get SMS templates by category
 */
export function getSMSTemplatesByCategory(category: string): CommunicationTemplate[] {
  return getSMSTemplates().filter(template => template.category === category);
}

/**
 * Get active SMS templates
 */
export function getActiveSMSTemplates(): CommunicationTemplate[] {
  return getSMSTemplates().filter(template => template.isActive);
}

/**
 * Validate SMS template
 */
export function validateSMSTemplate(template: CommunicationTemplate): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!template.id) {
    errors.push('Template ID is required');
  }

  if (!template.name) {
    errors.push('Template name is required');
  }

  if (!template.text) {
    errors.push('Template text is required');
  }

  if (template.text && template.text.length > 1600) {
    errors.push('SMS template text exceeds maximum length (1600 characters)');
  }

  if (!template.variables || template.variables.length === 0) {
    errors.push('Template variables are required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
