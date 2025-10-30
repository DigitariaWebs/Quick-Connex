/**
 * Email Templates
 * 
 * Beautiful styled email templates using string replacement with helper functions.
 */

import { EmailContent } from '../../../types/communication';

/**
 * Get priority-based styles for transfer emails
 */
function getPriorityStyles(priority: string) {
  if (priority === 'URGENT' || priority === 'urgent') {
    return {
      gradient: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 25%, #fca5a5 50%, #f87171 75%, #ef4444 100%)',
      icon: '🚨',
      text: 'URGENT TRANSFER REQUEST',
      badgeGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    };
  }
  return {
    gradient: 'linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%)',
    icon: '🚑',
    text: 'TRANSFER REQUEST',
    badgeGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
  };
}

/**
 * Get recipient type configuration for transfer approved emails
 */
function getRecipientTypeConfig(recipientType: string) {
  if (recipientType === 'manager') {
    return {
      title: 'Transfer Approved',
      message: 'Your transfer request has been approved by the administrator.',
      icon: '✅',
      actionText: 'You can now track the transfer progress in your dashboard.',
      buttonText: 'View Dashboard',
      buttonUrl: 'dashboard'
    };
  }
  return {
    title: 'New Transfer Available',
    message: 'A new transfer has been approved and is now available for assignment.',
    icon: '🚑',
    actionText: 'Log into the system to view details and accept the transfer assignment.',
    buttonText: 'Accept Transfer',
    buttonUrl: 'dashboard'
  };
}

/**
 * Get approval status configuration for user emails
 */
function getApprovalStatusConfig(status: string) {
  if (status === 'approved' || status === 'approve') {
    return {
      headerGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      headerIcon: '🎉',
      headerTitle: 'Account Approved!',
      headerSubtitle: 'Welcome to the Patient Management System',
      boxColor: '#f0fdf4',
      boxBorder: '#bbf7d0',
      boxTextColor: '#166534',
      boxTitle: 'Your Account Details',
      statusText: 'Active',
      buttonText: 'Access Your Account',
      buttonUrl: 'login'
    };
  }
  return {
    headerGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    headerIcon: '❌',
    headerTitle: 'Account Application Update',
    headerSubtitle: 'Your account application has been reviewed',
    boxColor: '#fef2f2',
    boxBorder: '#fecaca',
    boxTextColor: '#dc2626',
    boxTitle: 'Application Details',
    statusText: 'Rejected',
    buttonText: null,
    buttonUrl: null
  };
}

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
export function generateEmailHTML(notification: any, _user: any): string {
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
 * Render email template with simple string replacement and helper functions
 */
export function renderEmailTemplate(templateId: string, data: Record<string, any>): EmailContent {
  const templates = getEmailTemplates();
  const template = templates.find(t => t.id === templateId);
  
  if (!template) {
    throw new Error(`Email template ${templateId} not found`);
  }
  
  // Merge data with computed values from helper functions
  let mergedData = { ...data };
  
  // Add base URL if not provided
  if (!mergedData['baseUrl']) {
    mergedData['baseUrl'] = process.env['BASE_URL'] || 'http://localhost:3000';
  }
  
  // Add computed values based on template type
  if (templateId === 'transfer_request_email' && data['priority']) {
    const priorityStyles = getPriorityStyles(data['priority']);
    mergedData = { ...mergedData, ...priorityStyles };
  }
  
  if (templateId === 'transfer_approved_email' && data['recipientType']) {
    const recipientConfig = getRecipientTypeConfig(data['recipientType']);
    mergedData = { ...mergedData, ...recipientConfig };
  }
  
  if (templateId === 'user_approval_email' && data['status']) {
    const approvalConfig = getApprovalStatusConfig(data['status']);
    mergedData = { ...mergedData, ...approvalConfig };
  }
  
  if (templateId === 'user_rejection_email') {
    const rejectionConfig = getApprovalStatusConfig('rejected');
    mergedData = { ...mergedData, ...rejectionConfig };
  }
  
  let subject = template.subject || '';
  let text = template.text || '';
  let html = template.html || '';
  
  // Simple variable replacement
  for (const [key, value] of Object.entries(mergedData)) {
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
      subject: '{{priorityText}} - {{transferId}}',
      text: 'New transfer request for {{patientName}} from {{fromHospital}} to {{toHospital}}. Priority: {{priority}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: {{priorityGradient}}; padding: 30px; border-radius: 15px;">
          <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 600;">{{priorityIcon}} {{priorityText}}</h1>
              <div style="background: {{priorityBadgeGradient}}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 10px; font-weight: 600;">
                Transfer ID: {{transferId}}
              </div>
            </div>
            
            <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #10b981;">
              <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">👤 Patient Information</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                  <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Name:</strong></p>
                  <p style="margin: 0; color: #1f2937; font-weight: 600;">{{patientName}}</p>
                </div>
                <div>
                  <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Age:</strong></p>
                  <p style="margin: 0; color: #1f2937; font-weight: 600;">{{patientAge}}</p>
                </div>
                <div style="grid-column: 1 / -1;">
                  <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Dossier Number:</strong></p>
                  <p style="margin: 0; color: #1f2937; font-weight: 600;">{{dossierNumber}}</p>
                </div>
              </div>
            </div>
            
            <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
              <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">🏥 Transfer Details</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                  <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>From Hospital:</strong></p>
                  <p style="margin: 0; color: #1f2937; font-weight: 600;">{{fromHospital}}</p>
                </div>
                <div>
                  <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>To Hospital:</strong></p>
                  <p style="margin: 0; color: #1f2937; font-weight: 600;">{{toHospital}}</p>
                </div>
                <div>
                  <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Priority:</strong></p>
                  <p style="margin: 0; color: #1f2937; font-weight: 600;">{{priority}}</p>
                </div>
                <div>
                  <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Requested By:</strong></p>
                  <p style="margin: 0; color: #1f2937; font-weight: 600;">{{requestedBy}}</p>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{baseUrl}}/admin/transfers" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
                🚀 Review Transfer Request
              </a>
            </div>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Next Steps</h3>
              <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>Review the transfer request details</li>
                <li>Verify patient information and hospital details</li>
                <li>Approve or reject the transfer request</li>
                <li>Notify the requesting manager of your decision</li>
              </ul>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
              This transfer request was submitted by {{requestedBy}} and requires your immediate attention.
            </p>
          </div>
        </div>
      `,
      variables: ['patientName', 'patientAge', 'dossierNumber', 'fromHospital', 'toHospital', 'priority', 'requestedBy', 'transferId']
    },
    {
      id: 'transfer_approved_email',
      name: 'Transfer Approved Email',
      subject: '{{title}} - {{transferId}}',
      text: '{{message}} Transfer ID: {{transferId}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 600;">{{icon}} {{title}}</h1>
            <p style="color: #4b5563; margin: 10px 0 0 0; font-size: 16px;">Transfer ID: {{transferId}}</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">{{message}}</h2>
            
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 18px;">Transfer Details</h3>
              <p style="color: #166534; margin: 0; font-size: 14px;"><strong>Patient:</strong> {{patientName}}</p>
              <p style="color: #166534; margin: 5px 0 0 0; font-size: 14px;"><strong>From:</strong> {{fromHospital}}</p>
              <p style="color: #166534; margin: 5px 0 0 0; font-size: 14px;"><strong>To:</strong> {{toHospital}}</p>
              <p style="color: #166534; margin: 5px 0 0 0; font-size: 14px;"><strong>Priority:</strong> {{priority}}</p>
              <p style="color: #166534; margin: 5px 0 0 0; font-size: 14px;"><strong>Approved By:</strong> {{approvedBy}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{baseUrl}}/{{buttonUrl}}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
                🚀 {{buttonText}}
              </a>
            </div>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">What's Next?</h3>
              <p style="color: #4b5563; margin: 0; line-height: 1.6;">{{actionText}}</p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
              If you have any questions or need assistance, please don't hesitate to contact our support team.
            </p>
          </div>
        </div>
      `,
      variables: ['patientName', 'fromHospital', 'toHospital', 'transferId', 'approvedBy', 'priority', 'recipientType']
    },
    {
      id: 'user_approval_email',
      name: 'User Approval Email',
      subject: '{{headerTitle}} - {{firstName}} {{lastName}}',
      text: '{{headerTitle}} - {{firstName}} {{lastName}}. Your account has been {{status}} by {{approvedBy}}.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background: {{headerGradient}}; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">{{headerIcon}} {{headerTitle}}</h1>
            <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">{{headerSubtitle}}</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Congratulations, {{firstName}}!</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Your account has been successfully approved by our administrators. You can now access the Patient Management System and start using all available features.
            </p>
            
            <div style="background: {{boxColor}}; border: 1px solid {{boxBorder}}; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: {{boxTextColor}}; margin: 0 0 10px 0; font-size: 18px;">{{boxTitle}}</h3>
              <p style="color: {{boxTextColor}}; margin: 0; font-size: 14px;"><strong>Name:</strong> {{firstName}} {{lastName}}</p>
              <p style="color: {{boxTextColor}}; margin: 5px 0 0 0; font-size: 14px;"><strong>Email:</strong> {{email}}</p>
              <p style="color: {{boxTextColor}}; margin: 5px 0 0 0; font-size: 14px;"><strong>Role:</strong> {{userType}}</p>
              <p style="color: {{boxTextColor}}; margin: 5px 0 0 0; font-size: 14px;"><strong>Status:</strong> {{statusText}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{baseUrl}}/{{buttonUrl}}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
                🚀 {{buttonText}}
              </a>
            </div>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">What's Next?</h3>
              <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>Log in to your account using your email and password</li>
                <li>Complete your profile setup if needed</li>
                <li>Explore the dashboard and available features</li>
                <li>Contact support if you have any questions</li>
              </ul>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
              If you have any questions or need assistance, please don't hesitate to contact our support team.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; color: #6b7280; font-size: 14px;">
            <p style="margin: 0;">This is an automated message from the Patient Management System.</p>
            <p style="margin: 5px 0 0 0;">Please do not reply to this email.</p>
          </div>
        </div>
      `,
      variables: ['firstName', 'lastName', 'email', 'userType', 'status', 'approvedBy', 'reason']
    },
    {
      id: 'user_rejection_email',
      name: 'User Rejection Email',
      subject: '{{headerTitle}} - {{firstName}} {{lastName}}',
      text: '{{headerTitle}} - {{firstName}} {{lastName}}. Your account application has not been approved.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background: {{headerGradient}}; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">{{headerIcon}} {{headerTitle}}</h1>
            <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 16px;">{{headerSubtitle}}</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Dear {{firstName}},</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Thank you for your interest in the Patient Management System. After careful review, we regret to inform you that your account application has not been approved at this time.
            </p>
            
            <div style="background: {{boxColor}}; border: 1px solid {{boxBorder}}; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: {{boxTextColor}}; margin: 0 0 10px 0; font-size: 18px;">{{boxTitle}}</h3>
              <p style="color: {{boxTextColor}}; margin: 0; font-size: 14px;"><strong>Name:</strong> {{firstName}} {{lastName}}</p>
              <p style="color: {{boxTextColor}}; margin: 5px 0 0 0; font-size: 14px;"><strong>Email:</strong> {{email}}</p>
              <p style="color: {{boxTextColor}}; margin: 5px 0 0 0; font-size: 14px;"><strong>Status:</strong> {{statusText}}</p>
            </div>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Next Steps</h3>
              <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>You may reapply in the future if your circumstances change</li>
                <li>Contact our support team if you have questions about the decision</li>
                <li>Consider reaching out to your organization's administrator</li>
              </ul>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
              If you believe this decision was made in error or have additional information to provide, please contact our support team.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; color: #6b7280; font-size: 14px;">
            <p style="margin: 0;">This is an automated message from the Patient Management System.</p>
            <p style="margin: 5px 0 0 0;">Please do not reply to this email.</p>
          </div>
        </div>
      `,
      variables: ['firstName', 'lastName', 'email', 'userType']
    },
    {
      id: 'signup_request_email',
      name: 'Signup Request Email',
      subject: 'New User Signup Request - {{firstName}} {{lastName}}',
      text: 'New user signup request from {{firstName}} {{lastName}} ({{email}}). User type: {{userType}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">👤 New User Signup Request</h1>
            <p style="color: #dbeafe; margin: 10px 0 0 0; font-size: 16px;">A new user has requested access to the system</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">User Details</h2>
            
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #0369a1; margin: 0 0 10px 0; font-size: 18px;">Application Information</h3>
              <p style="color: #0369a1; margin: 0; font-size: 14px;"><strong>Name:</strong> {{firstName}} {{lastName}}</p>
              <p style="color: #0369a1; margin: 5px 0 0 0; font-size: 14px;"><strong>Email:</strong> {{email}}</p>
              <p style="color: #0369a1; margin: 5px 0 0 0; font-size: 14px;"><strong>User Type:</strong> {{userType}}</p>
              <p style="color: #0369a1; margin: 5px 0 0 0; font-size: 14px;"><strong>Requested at:</strong> {{requestedAt}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{baseUrl}}/admin/users" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
                🚀 Review User Request
              </a>
            </div>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Next Steps</h3>
              <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>Review the user's information and credentials</li>
                <li>Verify their organization and role requirements</li>
                <li>Approve or reject the signup request</li>
                <li>Notify the user of your decision</li>
              </ul>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
              This signup request requires your review and approval before the user can access the system.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; color: #6b7280; font-size: 14px;">
            <p style="margin: 0;">This is an automated message from the Patient Management System.</p>
            <p style="margin: 5px 0 0 0;">Please do not reply to this email.</p>
          </div>
        </div>
      `,
      variables: ['firstName', 'lastName', 'email', 'userType', 'requestedAt']
    }
  ];
}