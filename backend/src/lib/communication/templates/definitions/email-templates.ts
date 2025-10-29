/**
 * Email Template Definitions
 * 
 * Handlebars-based email templates for the communication system.
 */

import { CommunicationTemplate } from '../../../../types/communication';

export const EMAIL_TEMPLATES: CommunicationTemplate[] = [
  {
    id: 'user_approval',
    name: 'User Account Approval',
    channel: 'email',
    category: 'user_notification',
    subject: 'Your Account Has Been Approved!',
    text: `Congratulations {{firstName}}!

Your account has been approved and you can now access the Patient Management System.

Login URL: {{baseUrl}}/login
Email: {{email}}

You can now:
- View and manage patient transfers
- Access hospital resources
- Collaborate with your team

If you have any questions, please contact your administrator.

Best regards,
Patient Management System Team`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Approved</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #10b981; margin-top: 0;">🎉 Congratulations {{firstName}}!</h2>
    
    <p>Your account has been approved and you can now access the Patient Management System.</p>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="margin-top: 0; color: #1f2937;">Login Information</h3>
      <p><strong>Login URL:</strong> <a href="{{baseUrl}}/login" style="color: #2563eb;">{{baseUrl}}/login</a></p>
      <p><strong>Email:</strong> {{email}}</p>
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
</html>`,
    variables: ['firstName', 'lastName', 'email', 'baseUrl'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'user_rejection',
    name: 'User Account Rejection',
    channel: 'email',
    category: 'user_notification',
    subject: '❌ Account Application Update',
    text: `Dear {{firstName}},

We regret to inform you that your account application has not been approved at this time.

{{#if reason}}Reason: {{reason}}{{else}}Please contact your administrator for more information.{{/if}}

If you believe this is an error or have additional information to provide, please contact your administrator.

Best regards,
Patient Management System Team`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Application Update</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #dc2626; margin-top: 0;">❌ Account Application Update</h2>
    
    <p>Dear {{firstName}},</p>
    
    <p>We regret to inform you that your account application has not been approved at this time.</p>
    
    {{#if reason}}
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
      <h3 style="margin-top: 0; color: #1f2937;">Reason</h3>
      <p style="margin: 0;">{{reason}}</p>
    </div>
    {{/if}}
    
    <p>If you believe this is an error or have additional information to provide, please contact your administrator.</p>
    
    <p>Best regards,<br>Patient Management System Team</p>
  </div>
</body>
</html>`,
    variables: ['firstName', 'lastName', 'reason'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'password_reset',
    name: 'Password Reset Request',
    channel: 'email',
    category: 'user_notification',
    subject: '🔐 Password Reset Request',
    text: `Hello {{firstName}},

You requested a password reset for your account.

Click the link below to reset your password:
{{baseUrl}}/reset-password?token={{resetToken}}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email or contact your administrator.

Best regards,
Patient Management System Team`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset Request</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb; margin-top: 0;">🔐 Password Reset Request</h2>
    
    <p>Hello {{firstName}},</p>
    
    <p>You requested a password reset for your account.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{baseUrl}}/reset-password?token={{resetToken}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
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
</html>`,
    variables: ['firstName', 'lastName', 'baseUrl', 'resetToken'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'transfer_request',
    name: 'Transfer Request Notification',
    channel: 'email',
    category: 'transfer',
    subject: '{{#ifUrgent priority}}🚨 URGENT{{else}}📋{{/ifUrgent}} New Transfer Request - {{patientName}}',
    text: `{{#ifUrgent priority}}🚨 URGENT TRANSFER REQUEST{{else}}📋 New Transfer Request{{/ifUrgent}}

Patient: {{patientName}}
From: {{fromHospital}}
To: {{toHospital}}
Priority: {{capitalize priority}}
Requested by: {{requestedBy}}

{{#if reason}}Reason: {{reason}}{{/if}}

{{#ifUrgent priority}}This is an urgent transfer request that requires immediate attention.{{else}}Please review and process this transfer request.{{/ifUrgent}}

Transfer ID: {{transferId}}
Requested at: {{formatDate createdAt 'datetime'}}

Best regards,
Patient Management System`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{{#ifUrgent priority}}URGENT{{else}}New{{/ifUrgent}} Transfer Request</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: {{#ifUrgent priority}}#dc2626{{else}}#2563eb{{/ifUrgent}}; margin-top: 0;">
      {{#ifUrgent priority}}🚨 URGENT{{else}}📋{{/ifUrgent}} {{#ifUrgent priority}}URGENT{{else}}New{{/ifUrgent}} Transfer Request
    </h2>
    
    <div style="background: {{#ifUrgent priority}}#fef2f2{{else}}#f0f9ff{{/ifUrgent}}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid {{#ifUrgent priority}}#dc2626{{else}}#2563eb{{/ifUrgent}};">
      <h3 style="margin-top: 0; color: #1f2937;">Transfer Details</h3>
      <p><strong>Patient:</strong> {{patientName}}</p>
      <p><strong>From:</strong> {{fromHospital}}</p>
      <p><strong>To:</strong> {{toHospital}}</p>
      <p><strong>Priority:</strong> <span style="color: {{#ifUrgent priority}}#dc2626{{else}}#2563eb{{/ifUrgent}}; font-weight: bold;">{{capitalize priority}}</span></p>
      <p><strong>Requested by:</strong> {{requestedBy}}</p>
      <p><strong>Transfer ID:</strong> {{transferId}}</p>
      <p><strong>Requested at:</strong> {{formatDate createdAt 'datetime'}}</p>
    </div>
    
    {{#if reason}}
    <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0;">
      <h4 style="margin-top: 0; color: #374151;">Reason</h4>
      <p style="margin: 0;">{{reason}}</p>
    </div>
    {{/if}}
    
    <div style="background: {{#ifUrgent priority}}#fef2f2{{else}}#f0fdf4{{/ifUrgent}}; padding: 15px; border-radius: 6px; margin: 15px 0;">
      <p style="margin: 0; font-weight: bold;">
        {{#ifUrgent priority}}This is an urgent transfer request that requires immediate attention.{{else}}Please review and process this transfer request.{{/ifUrgent}}
      </p>
    </div>
    
    <p>Best regards,<br>Patient Management System</p>
  </div>
</body>
</html>`,
    variables: ['patientName', 'fromHospital', 'toHospital', 'priority', 'requestedBy', 'reason', 'transferId', 'createdAt'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'transfer_approved',
    name: 'Transfer Approved Notification',
    channel: 'email',
    category: 'transfer',
    subject: '✅ Transfer Approved - {{patientName}}',
    text: `Transfer Request Approved

Patient: {{patientName}}
From: {{fromHospital}}
To: {{toHospital}}
Transfer ID: {{transferId}}
Approved by: {{approvedBy}}
Approved at: {{formatDate approvedAt 'datetime'}}

{{#if notes}}Notes: {{notes}}{{/if}}

The transfer has been approved and is ready to proceed.

Best regards,
Patient Management System`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Transfer Approved</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #10b981; margin-top: 0;">✅ Transfer Request Approved</h2>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="margin-top: 0; color: #1f2937;">Transfer Details</h3>
      <p><strong>Patient:</strong> {{patientName}}</p>
      <p><strong>From:</strong> {{fromHospital}}</p>
      <p><strong>To:</strong> {{toHospital}}</p>
      <p><strong>Transfer ID:</strong> {{transferId}}</p>
      <p><strong>Approved by:</strong> {{approvedBy}}</p>
      <p><strong>Approved at:</strong> {{formatDate approvedAt 'datetime'}}</p>
    </div>
    
    {{#if notes}}
    <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0;">
      <h4 style="margin-top: 0; color: #374151;">Notes</h4>
      <p style="margin: 0;">{{notes}}</p>
    </div>
    {{/if}}
    
    <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 15px 0;">
      <p style="margin: 0; font-weight: bold; color: #10b981;">
        The transfer has been approved and is ready to proceed.
      </p>
    </div>
    
    <p>Best regards,<br>Patient Management System</p>
  </div>
</body>
</html>`,
    variables: ['patientName', 'fromHospital', 'toHospital', 'transferId', 'approvedBy', 'approvedAt', 'notes'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];
