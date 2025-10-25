/**
 * Email Templates
 * 
 * Email template definitions and management for the communication system.
 */

import { CommunicationTemplate } from '../core/types';

/**
 * Generate transfer request email HTML
 */
export function generateTransferRequestEmailHTML(transferData: any): string {
  const priorityGradient = transferData.priority === 'URGENT' 
    ? 'linear-gradient(135deg, #fef2f2 0%, #fecaca 25%, #fca5a5 50%, #f87171 75%, #ef4444 100%)'
    : 'linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%)';
  
  const priorityIcon = transferData.priority === 'URGENT' ? '🚨' : '🚑';
  const priorityText = transferData.priority === 'URGENT' ? 'URGENT TRANSFER REQUEST' : 'TRANSFER REQUEST';
  const priorityBadgeGradient = transferData.priority === 'URGENT' 
    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
    : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${priorityGradient}; padding: 30px; border-radius: 15px;">
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 600;">${priorityIcon} ${priorityText}</h1>
          <div style="background: ${priorityBadgeGradient}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 10px; font-weight: 600;">
            Transfer ID: ${transferData.transferId}
          </div>
        </div>
        
        <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">👤 Patient Information</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Name:</strong></p>
              <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.patientName}</p>
            </div>
            <div>
              <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Age:</strong></p>
              <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.patientAge}</p>
            </div>
            <div style="grid-column: 1 / -1;">
              <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Dossier Number:</strong></p>
              <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.dossierNumber}</p>
            </div>
          </div>
        </div>
        
        <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
          <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">🏥 Transfer Details</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>From Hospital:</strong></p>
              <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.fromHospital}</p>
            </div>
            <div>
              <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>To Hospital:</strong></p>
              <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.toHospital}</p>
            </div>
            <div>
              <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Priority:</strong></p>
              <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.priority}</p>
            </div>
            <div>
              <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Requested By:</strong></p>
              <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.requestedBy}</p>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.BASE_URL || 'http://localhost:3000'}/admin/transfers" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
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
          This transfer request was submitted by ${transferData.requestedBy} and requires your immediate attention.
        </p>
      </div>
    </div>
  `;
}

/**
 * Generate transfer approved email HTML
 */
export function generateTransferApprovedEmailHTML(transferData: any, recipientType: string): string {
  const title = recipientType === 'manager' ? 'Transfer Approved' : 'New Transfer Available';
  const message = recipientType === 'manager' 
    ? 'Your transfer request has been approved by the administrator.'
    : 'A new transfer has been approved and is now available for assignment.';
  const icon = recipientType === 'manager' ? '✅' : '🚑';
  const actionText = recipientType === 'manager' 
    ? 'You can now track the transfer progress in your dashboard.'
    : 'Log into the system to view details and accept the transfer assignment.';
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 600;">${icon} ${title}</h1>
        <p style="color: #4b5563; margin: 10px 0 0 0; font-size: 16px;">Transfer ID: ${transferData.transferId}</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">${message}</h2>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 18px;">Transfer Details</h3>
          <p style="color: #166534; margin: 0; font-size: 14px;"><strong>Patient:</strong> ${transferData.patientName}</p>
          <p style="color: #166534; margin: 5px 0 0 0; font-size: 14px;"><strong>From:</strong> ${transferData.fromHospital}</p>
          <p style="color: #166534; margin: 5px 0 0 0; font-size: 14px;"><strong>To:</strong> ${transferData.toHospital}</p>
          <p style="color: #166534; margin: 5px 0 0 0; font-size: 14px;"><strong>Priority:</strong> ${transferData.priority}</p>
          <p style="color: #166534; margin: 5px 0 0 0; font-size: 14px;"><strong>Approved By:</strong> ${transferData.approvedBy}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.BASE_URL || 'http://localhost:3000'}/dashboard" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
            🚀 ${recipientType === 'manager' ? 'View Dashboard' : 'Accept Transfer'}
          </a>
        </div>
        
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">What's Next?</h3>
          <p style="color: #4b5563; margin: 0; line-height: 1.6;">${actionText}</p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
          If you have any questions or need assistance, please don't hesitate to contact our support team.
        </p>
      </div>
    </div>
  `;
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
