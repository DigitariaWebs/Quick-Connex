#!/usr/bin/env node

/**
 * Preview Email Designs Script
 * 
 * This script generates HTML files to preview the new email designs
 * for transfer notifications with modern gradients and clean buttons.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Sample transfer data for preview
const sampleTransferData = {
    transferId: 'TRF-2025-001',
    patientName: 'Ahmed Benali',
    patientAge: 58,
    patientDossier: 'DOS-2025-001',
    fromHospital: 'Hôpital Notre-Dame',
    toHospital: 'Hôpital Sacré-Cœur',
    priority: 'URGENT',
    reason: 'Critical cardiac condition requiring immediate specialized care',
    scheduledDate: 'September 23, 2025',
    scheduledTime: '18:00',
    requestedBy: 'Dr. Sarah Johnson',
    requestedByEmail: 'sarah.johnson@hospital.com',
    requestedByPhone: '+1-514-555-0123',
    notes: 'Patient requires continuous monitoring during transfer. Specialized cardiac equipment needed.',
    approvalUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/transfers/123/approve?admin=admin@patients-management.com`,
    rejectionUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/transfers/123/reject?admin=admin@patients-management.com`,
    approvedBy: 'System Administrator',
    approvedAt: 'September 22, 2025 at 14:30',
    rejectedBy: 'System Administrator',
    rejectedAt: 'September 22, 2025 at 14:30',
    rejectionReason: 'Insufficient documentation provided. Please resubmit with complete medical records.'
};

// Transfer Request Email HTML
function generateTransferRequestEmailHTML(transferData) {
    const priorityGradient = transferData.priority === 'URGENT'
        ? 'linear-gradient(135deg, #fef2f2 0%, #fecaca 25%, #fca5a5 50%, #f87171 75%, #ef4444 100%)'
        : 'linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%)';

    const priorityIcon = transferData.priority === 'URGENT' ? '🚨' : '🚑';
    const priorityText = transferData.priority === 'URGENT' ? 'URGENT TRANSFER REQUEST' : 'TRANSFER REQUEST';

    return `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${priorityText} - ${transferData.transferId}</title>
  </head>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background: ${priorityGradient}; padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 700;">${priorityIcon} ${priorityText}</h1>
          <p style="color: #1f2937; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Transfer ID: <strong>${transferData.transferId}</strong></p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          ${transferData.priority === 'URGENT' ? `
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
              <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 18px; font-weight: 600;">⚠️ URGENT ACTION REQUIRED</h3>
              <p style="margin: 0; color: #92400e;">This is an urgent transfer request that requires immediate attention and approval.</p>
          </div>
          ` : ''}
          
          <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #10b981;">
              <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">👤 Patient Information</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div>
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Name:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.patientName}</p>
                  </div>
                  <div>
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Age:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.patientAge} years</p>
                  </div>
                  <div style="grid-column: 1 / -1;">
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Dossier Number:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.patientDossier}</p>
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
                      <span style="background: ${transferData.priority === 'URGENT' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${transferData.priority}</span>
                  </div>
                  <div>
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Scheduled:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.scheduledDate} at ${transferData.scheduledTime}</p>
                  </div>
                  <div style="grid-column: 1 / -1;">
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Reason:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.reason}</p>
                  </div>
              </div>
          </div>
          
          <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #8b5cf6;">
              <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">👤 Requested By</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div>
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Name:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.requestedBy}</p>
                  </div>
                  <div>
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Phone:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.requestedByPhone}</p>
                  </div>
                  <div style="grid-column: 1 / -1;">
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Email:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.requestedByEmail}</p>
                  </div>
              </div>
          </div>
          
          ${transferData.notes ? `
          <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
              <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">📝 Additional Notes</h3>
              <p style="margin: 0; color: #1f2937; line-height: 1.6;">${transferData.notes}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 40px 0;">
              <a href="${transferData.approvalUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3); margin: 0 8px; transition: all 0.3s ease;">
                  ✅ Approve Transfer
              </a>
              <a href="${transferData.rejectionUrl}" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3); margin: 0 8px; transition: all 0.3s ease;">
                  ❌ Reject Transfer
              </a>
          </div>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 30px 0 0 0; border-left: 4px solid #64748b;">
              <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;"><strong>Note:</strong> Please review the transfer details carefully before making a decision. Once approved, the transfer will be published to all employees for assignment.</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              This is an automated notification from the <strong>Patient Management System</strong>.<br>
              If you have any questions, please contact the system administrator.
          </p>
      </div>
  </body>
  </html>
  `;
}

// Transfer Approved Email HTML
function generateTransferApprovedEmailHTML(transferData, recipientType) {
    const title = recipientType === 'manager' ? 'Transfer Approved' : 'New Transfer Available';
    const message = recipientType === 'manager'
        ? 'Your transfer request has been approved by the administrator.'
        : 'A new transfer has been approved and is now available for assignment.';
    const icon = recipientType === 'manager' ? '✅' : '🚑';
    const actionText = recipientType === 'manager'
        ? 'You can now track the transfer progress in your dashboard.'
        : 'Log into the system to view details and accept the transfer assignment.';

    return `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - ${transferData.transferId}</title>
  </head>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background: linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 700;">${icon} ${title}</h1>
          <p style="color: #1f2937; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Transfer ID: <strong>${transferData.transferId}</strong></p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #22c55e; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #22c55e;">
              <h3 style="margin: 0 0 8px 0; color: #166534; font-size: 18px; font-weight: 600;">🎉 Great News!</h3>
              <p style="margin: 0; color: #166534;">${message}</p>
          </div>
          
          <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #10b981;">
              <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">📋 Transfer Details</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div>
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Patient:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.patientName}</p>
                  </div>
                  <div>
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Priority:</strong></p>
                      <span style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${transferData.priority}</span>
                  </div>
                  <div>
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>From Hospital:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.fromHospital}</p>
                  </div>
                  <div>
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>To Hospital:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.toHospital}</p>
                  </div>
                  <div>
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Approved by:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.approvedBy}</p>
                  </div>
                  <div>
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Approved at:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.approvedAt}</p>
                  </div>
              </div>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.BASE_URL || 'http://localhost:3000'}/dashboard" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3); transition: all 0.3s ease;">
                  🏠 Go to Dashboard
              </a>
          </div>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 30px 0 0 0; border-left: 4px solid #64748b;">
              <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;"><strong>Next Steps:</strong> ${actionText}</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              This is an automated notification from the <strong>Patient Management System</strong>.<br>
              If you have any questions, please contact the system administrator.
          </p>
      </div>
  </body>
  </html>
  `;
}

// Transfer Rejected Email HTML
function generateTransferRejectedEmailHTML(transferData) {
    return `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Transfer Rejected - ${transferData.transferId}</title>
  </head>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background: linear-gradient(135deg, #fef2f2 0%, #fecaca 25%, #fca5a5 50%, #f87171 75%, #ef4444 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 700;">❌ Transfer Rejected</h1>
          <p style="color: #1f2937; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Transfer ID: <strong>${transferData.transferId}</strong></p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); border: 1px solid #ef4444; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #ef4444;">
              <h3 style="margin: 0 0 8px 0; color: #991b1b; font-size: 18px; font-weight: 600;">⚠️ Transfer Request Rejected</h3>
              <p style="margin: 0; color: #991b1b;">We regret to inform you that your transfer request has been rejected by the administrator.</p>
          </div>
          
          <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #ef4444;">
              <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">📋 Transfer Details</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div>
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Patient:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.patientName}</p>
                  </div>
                  <div>
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Priority:</strong></p>
                      <span style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${transferData.priority}</span>
                  </div>
                  <div>
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>From Hospital:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.fromHospital}</p>
                  </div>
                  <div>
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>To Hospital:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.toHospital}</p>
                  </div>
                  <div>
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Rejected by:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.rejectedBy}</p>
                  </div>
                  <div>
                      <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Rejected at:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.rejectedAt}</p>
                  </div>
              </div>
          </div>
          
          <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
              <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">📝 Rejection Reason</h3>
              <p style="margin: 0; color: #1f2937; line-height: 1.6; font-style: italic;">"${transferData.rejectionReason}"</p>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.BASE_URL || 'http://localhost:3000'}/transfers" style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(107, 114, 128, 0.3); transition: all 0.3s ease;">
                  📋 View All Transfers
              </a>
          </div>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 30px 0 0 0; border-left: 4px solid #64748b;">
              <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;"><strong>Need Help?</strong> If you have any questions about this rejection or need to resubmit the request, please contact the system administrator for assistance.</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              This is an automated notification from the <strong>Patient Management System</strong>.<br>
              If you have any questions, please contact the system administrator.
          </p>
      </div>
  </body>
  </html>
  `;
}

async function previewEmailDesigns() {
    try {
        console.log('🎨 Generating email design previews...');

        // Create previews directory
        const previewsDir = path.join(__dirname, '..', 'email-previews');
        if (!fs.existsSync(previewsDir)) {
            fs.mkdirSync(previewsDir, { recursive: true });
        }

        // Generate Transfer Request Email (Urgent)
        const urgentTransferData = { ...sampleTransferData, priority: 'URGENT' };
        const urgentRequestHTML = generateTransferRequestEmailHTML(urgentTransferData);
        fs.writeFileSync(path.join(previewsDir, 'transfer-request-urgent.html'), urgentRequestHTML);
        console.log('✅ Generated: transfer-request-urgent.html');

        // Generate Transfer Request Email (Normal)
        const normalTransferData = { ...sampleTransferData, priority: 'NORMAL' };
        const normalRequestHTML = generateTransferRequestEmailHTML(normalTransferData);
        fs.writeFileSync(path.join(previewsDir, 'transfer-request-normal.html'), normalRequestHTML);
        console.log('✅ Generated: transfer-request-normal.html');

        // Generate Transfer Approved Email (Manager)
        const approvedManagerHTML = generateTransferApprovedEmailHTML(sampleTransferData, 'manager');
        fs.writeFileSync(path.join(previewsDir, 'transfer-approved-manager.html'), approvedManagerHTML);
        console.log('✅ Generated: transfer-approved-manager.html');

        // Generate Transfer Approved Email (Employee)
        const approvedEmployeeHTML = generateTransferApprovedEmailHTML(sampleTransferData, 'employee');
        fs.writeFileSync(path.join(previewsDir, 'transfer-approved-employee.html'), approvedEmployeeHTML);
        console.log('✅ Generated: transfer-approved-employee.html');

        // Generate Transfer Rejected Email
        const rejectedHTML = generateTransferRejectedEmailHTML(sampleTransferData);
        fs.writeFileSync(path.join(previewsDir, 'transfer-rejected.html'), rejectedHTML);
        console.log('✅ Generated: transfer-rejected.html');

        // Generate index file
        const indexHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Email Design Previews</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f8fafc; }
            .container { max-width: 1200px; margin: 0 auto; }
            h1 { color: #1f2937; text-align: center; margin-bottom: 40px; }
            .preview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .preview-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .preview-card h3 { color: #1f2937; margin-bottom: 10px; }
            .preview-card p { color: #6b7280; margin-bottom: 15px; }
            .preview-link { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; }
            .preview-link:hover { transform: translateY(-2px); box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3); }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎨 Transfer Email Design Previews</h1>
            <p style="text-align: center; color: #6b7280; margin-bottom: 40px;">Modern, clean email templates with gradient designs and improved buttons</p>
            
            <div class="preview-grid">
                <div class="preview-card">
                    <h3>🚨 Urgent Transfer Request</h3>
                    <p>Email sent to admin when an urgent transfer is requested. Features red gradient header and urgent action alert.</p>
                    <a href="transfer-request-urgent.html" class="preview-link" target="_blank">View Preview</a>
                </div>
                
                <div class="preview-card">
                    <h3>🚑 Normal Transfer Request</h3>
                    <p>Email sent to admin when a normal priority transfer is requested. Features blue-green gradient header.</p>
                    <a href="transfer-request-normal.html" class="preview-link" target="_blank">View Preview</a>
                </div>
                
                <div class="preview-card">
                    <h3>✅ Transfer Approved (Manager)</h3>
                    <p>Email sent to manager when their transfer request is approved. Features success messaging and dashboard link.</p>
                    <a href="transfer-approved-manager.html" class="preview-link" target="_blank">View Preview</a>
                </div>
                
                <div class="preview-card">
                    <h3>🚑 Transfer Approved (Employee)</h3>
                    <p>Email sent to employees when a new transfer becomes available. Features assignment information.</p>
                    <a href="transfer-approved-employee.html" class="preview-link" target="_blank">View Preview</a>
                </div>
                
                <div class="preview-card">
                    <h3>❌ Transfer Rejected</h3>
                    <p>Email sent to manager when their transfer request is rejected. Features rejection reason and next steps.</p>
                    <a href="transfer-rejected.html" class="preview-link" target="_blank">View Preview</a>
                </div>
            </div>
            
            <div style="background: white; border-radius: 12px; padding: 30px; margin-top: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <h3 style="color: #1f2937; margin-bottom: 20px;">🎨 Design Features</h3>
                <ul style="color: #4b5563; line-height: 1.6;">
                    <li><strong>Modern Gradients:</strong> Beautiful gradient headers matching authentication email style</li>
                    <li><strong>Clean Buttons:</strong> Modern rounded buttons with gradients and shadows</li>
                    <li><strong>Responsive Design:</strong> Mobile-friendly layout with proper spacing</li>
                    <li><strong>Color Coding:</strong> Different colors for different priorities and statuses</li>
                    <li><strong>Information Cards:</strong> Well-organized information in clean card layouts</li>
                    <li><strong>Professional Typography:</strong> Clear hierarchy and readable fonts</li>
                </ul>
            </div>
        </div>
    </body>
    </html>
    `;

        fs.writeFileSync(path.join(previewsDir, 'index.html'), indexHTML);
        console.log('✅ Generated: index.html');

        console.log('\n🎉 Email design previews generated successfully!');
        console.log(`📁 Preview files saved to: ${previewsDir}`);
        console.log('\n📋 Preview Files:');
        console.log('   - transfer-request-urgent.html (Urgent transfer request)');
        console.log('   - transfer-request-normal.html (Normal transfer request)');
        console.log('   - transfer-approved-manager.html (Manager approval notification)');
        console.log('   - transfer-approved-employee.html (Employee availability notification)');
        console.log('   - transfer-rejected.html (Transfer rejection notification)');
        console.log('   - index.html (Preview index page)');

        console.log('\n🌐 To view previews:');
        console.log(`   1. Open: ${path.join(previewsDir, 'index.html')}`);
        console.log('   2. Click on any preview link to see the email design');
        console.log('   3. All previews open in new tabs for easy comparison');

    } catch (error) {
        console.error('❌ Error generating email previews:', error);
    }
}

// Run the script
if (require.main === module) {
    previewEmailDesigns();
}

module.exports = { previewEmailDesigns };
