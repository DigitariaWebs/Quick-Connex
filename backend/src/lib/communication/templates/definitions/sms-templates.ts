/**
 * SMS Template Definitions
 * 
 * Handlebars-based SMS templates for the communication system.
 */

import { CommunicationTemplate } from '../../../../types/communication';

export const SMS_TEMPLATES: CommunicationTemplate[] = [
  {
    id: 'transfer_request_sms',
    name: 'Transfer Request SMS',
    channel: 'sms',
    category: 'transfer',
    text: '{{#ifUrgent priority}}🚨 URGENT{{else}}📋{{/ifUrgent}} New transfer request for {{patientName}} from {{fromHospital}} to {{toHospital}}. Priority: {{capitalize priority}}. ID: {{transferId}}',
    variables: ['patientName', 'fromHospital', 'toHospital', 'priority', 'transferId'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'transfer_approved_sms',
    name: 'Transfer Approved SMS',
    channel: 'sms',
    category: 'transfer',
    text: '✅ Transfer {{transferId}} approved for {{patientName}}. From: {{fromHospital}} To: {{toHospital}}. Approved by: {{approvedBy}}',
    variables: ['transferId', 'patientName', 'fromHospital', 'toHospital', 'approvedBy'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'transfer_rejected_sms',
    name: 'Transfer Rejected SMS',
    channel: 'sms',
    category: 'transfer',
    text: '❌ Transfer {{transferId}} rejected for {{patientName}}. Reason: {{reason}}. Contact admin for details.',
    variables: ['transferId', 'patientName', 'reason'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'urgent_notification_sms',
    name: 'Urgent Notification SMS',
    channel: 'sms',
    category: 'system',
    text: '🚨 URGENT: {{message}} - {{formatDate timestamp "datetime"}}',
    variables: ['message', 'timestamp'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'user_approval_sms',
    name: 'User Approval SMS',
    channel: 'sms',
    category: 'user_notification',
    text: '✅ Account approved! Welcome {{firstName}}. Login: {{baseUrl}}/login',
    variables: ['firstName', 'baseUrl'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'user_rejection_sms',
    name: 'User Rejection SMS',
    channel: 'sms',
    category: 'user_notification',
    text: '❌ Account application not approved. {{#if reason}}Reason: {{reason}}{{else}}Contact admin for details.{{/if}}',
    variables: ['firstName', 'reason'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'password_reset_sms',
    name: 'Password Reset SMS',
    channel: 'sms',
    category: 'user_notification',
    text: '🔐 Password reset requested. Code: {{resetCode}}. Expires in 15 minutes.',
    variables: ['firstName', 'resetCode'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'appointment_reminder_sms',
    name: 'Appointment Reminder SMS',
    channel: 'sms',
    category: 'appointment',
    text: '📅 Reminder: {{appointmentType}} for {{patientName}} on {{formatDate appointmentDate "short"}} at {{appointmentTime}}',
    variables: ['patientName', 'appointmentType', 'appointmentDate', 'appointmentTime'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'system_maintenance_sms',
    name: 'System Maintenance SMS',
    channel: 'sms',
    category: 'system',
    text: '🔧 System maintenance scheduled for {{formatDate maintenanceDate "short"}} from {{startTime}} to {{endTime}}. Brief service interruption expected.',
    variables: ['maintenanceDate', 'startTime', 'endTime'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'emergency_alert_sms',
    name: 'Emergency Alert SMS',
    channel: 'sms',
    category: 'emergency',
    text: '🚨 EMERGENCY ALERT: {{alertMessage}} - {{formatDate timestamp "datetime"}} - Action required immediately.',
    variables: ['alertMessage', 'timestamp'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];
