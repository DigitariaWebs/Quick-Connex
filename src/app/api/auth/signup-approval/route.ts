import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { EmailService } from '@/lib/communication/email-service';
import { EmailMessage, EmailRecipient, EmailContent } from '@/types/communication-types';
import { getUserDocumentsAsAttachments, getDocumentSummary } from '@/lib/communication/user-document-attachments';

/**
 * Send signup approval email to admin
 */
export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get admin email from environment
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminName = process.env.ADMIN_NAME || 'System Administrator';
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    if (!adminEmail) {
      return NextResponse.json(
        { error: 'Admin email not configured' },
        { status: 500 }
      );
    }

    // Create email service instance
    const emailService = new EmailService();

    // Get user documents as attachments
    console.log('📎 Preparing user documents as email attachments...');
    const attachments = await getUserDocumentsAsAttachments(user);
    console.log(`📎 Prepared ${attachments.length} attachments for email`);

    // Prepare user details for email
    const userDetails = {
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      post: user.post || 'N/A',
      ciusss: user.ciusss || 'N/A',
      documents: user.documents?.map(doc => ({
        type: doc.documentType,
        name: doc.originalName,
        size: `${(doc.size / 1024 / 1024).toFixed(2)} MB`,
        downloadUrl: `${baseUrl}/api/files/${doc.fileId}`
      })) || [],
      documentSummary: getDocumentSummary(user),
      signupDate: user.createdAt.toLocaleDateString(),
      approvalUrl: `${baseUrl}/api/auth/approve-user?userId=${userId}&action=approve`,
      rejectionUrl: `${baseUrl}/api/auth/approve-user?userId=${userId}&action=reject`
    };

    // Create email message
    const emailMessage: EmailMessage = {
      id: `approval-${userId}-${Date.now()}`,
      recipient: {
        email: adminEmail,
        name: adminName
      },
      content: {
        subject: `New User Registration - ${userDetails.name} (${userDetails.userType})`,
        html: generateApprovalEmailHTML(userDetails),
        text: generateApprovalEmailText(userDetails),
        attachments: attachments
      },
      metadata: {
        category: 'user-approval',
        userId: userId,
        userType: user.userType
      },
      priority: 'high'
    };

    // Send email
    const result = await emailService.sendEmail(emailMessage);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Approval email sent successfully',
        messageId: result.messageId
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send approval email', details: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error sending approval email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate HTML email content for approval request
 */
function generateApprovalEmailHTML(userDetails: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New User Registration - Approval Required</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
          line-height: 1.6; 
          color: #374151; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: #f9fafb;
        }
        .container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 700;
        }
        .header p {
          margin: 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .content { 
          padding: 40px 30px; 
        }
        .alert { 
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
          border: 1px solid #f59e0b; 
          padding: 20px; 
          border-radius: 12px; 
          margin: 0 0 30px 0;
          border-left: 4px solid #f59e0b;
        }
        .alert h3 {
          margin: 0 0 8px 0;
          color: #92400e;
          font-size: 18px;
          font-weight: 600;
        }
        .alert p {
          margin: 0;
          color: #92400e;
        }
        .user-info { 
          background: #f8fafc; 
          padding: 24px; 
          border-radius: 12px; 
          margin: 0 0 30px 0; 
          border-left: 4px solid #10b981;
        }
        .user-info h3 {
          margin: 0 0 16px 0;
          color: #1f2937;
          font-size: 20px;
          font-weight: 600;
        }
        .user-info p {
          margin: 0 0 8px 0;
          color: #4b5563;
        }
        .user-info strong {
          color: #1f2937;
          font-weight: 600;
        }
        .documents { 
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); 
          padding: 24px; 
          border-radius: 12px; 
          margin: 0 0 30px 0;
          border: 1px solid #a7f3d0;
        }
        .documents h3 {
          margin: 0 0 12px 0;
          color: #065f46;
          font-size: 18px;
          font-weight: 600;
        }
        .documents p {
          margin: 0 0 16px 0;
          color: #047857;
          font-size: 14px;
        }
        .documents ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .documents li {
          margin: 0 0 8px 0;
          padding: 8px 12px;
          background: white;
          border-radius: 8px;
          color: #065f46;
          font-size: 14px;
        }
        .documents strong {
          color: #047857;
          font-weight: 600;
        }
        .actions { 
          text-align: center; 
          margin: 40px 0; 
        }
        .btn { 
          display: inline-block; 
          padding: 16px 32px; 
          margin: 0 8px; 
          text-decoration: none; 
          border-radius: 12px; 
          font-weight: 600;
          font-size: 16px;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .btn-approve { 
          background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
          color: white; 
        }
        .btn-approve:hover { 
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }
        .btn-reject { 
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
          color: white; 
        }
        .btn-reject:hover { 
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
        }
        .note { 
          background: #f1f5f9; 
          padding: 20px; 
          border-radius: 12px; 
          margin: 30px 0 0 0;
          border-left: 4px solid #64748b;
        }
        .note p {
          margin: 0;
          color: #475569;
          font-size: 14px;
        }
        .note strong {
          color: #334155;
          font-weight: 600;
        }
        .footer { 
          text-align: center; 
          color: #6b7280; 
          font-size: 14px; 
          margin-top: 40px; 
          padding: 30px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 0 0 8px 0;
        }
        .platform-name {
          font-weight: 700;
          color: #10b981;
        }
        @media (max-width: 600px) {
          .btn {
            display: block;
            margin: 8px 0;
            width: 100%;
            text-align: center;
          }
          .content {
            padding: 30px 20px;
          }
          .header {
            padding: 30px 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New User Registration</h1>
          <p>Approval Required for <span class="platform-name">Groupe BZ Services</span></p>
        </div>
        
        <div class="content">
          <div class="alert">
            <h3>⚠️ Action Required</h3>
            <p>A new user has registered and requires your approval to access <span class="platform-name">Groupe BZ Services</span>.</p>
          </div>
          
          <div class="user-info">
            <h3>👤 User Information</h3>
            <p><strong>Name:</strong> ${userDetails.name}</p>
            <p><strong>Email:</strong> ${userDetails.email}</p>
            <p><strong>Phone:</strong> ${userDetails.phone}</p>
            <p><strong>User Type:</strong> ${userDetails.userType.charAt(0).toUpperCase() + userDetails.userType.slice(1)}</p>
            <p><strong>Registration Date:</strong> ${userDetails.signupDate}</p>
            ${userDetails.userType === 'manager' ? `
              <p><strong>Position:</strong> ${userDetails.post}</p>
              <p><strong>CIUSSS:</strong> ${userDetails.ciusss}</p>
            ` : ''}
          </div>
          
          ${userDetails.documents.length > 0 ? `
            <div class="documents">
              <h3>📄 Submitted Documents</h3>
              <p><strong>Note:</strong> All documents are attached to this email for your review. You can also download them directly using the links below.</p>
              <ul>
                ${userDetails.documents.map((doc: any) => `
                  <li>
                    <strong>${doc.type.toUpperCase()}:</strong> ${doc.name} (${doc.size})
                    <br>
                    <a href="${doc.downloadUrl}" style="color: #10b981; text-decoration: none; font-size: 12px; margin-left: 20px;">📥 Download File</a>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          
          <div class="actions">
            <a href="${userDetails.approvalUrl}" class="btn btn-approve">✅ Approve User</a>
            <a href="${userDetails.rejectionUrl}" class="btn btn-reject">❌ Reject User</a>
          </div>
          
          <div class="note">
            <p><strong>Note:</strong> Please review the user's information and documents carefully before making a decision. 
            Once approved, the user will receive an email notification and can access <span class="platform-name">Groupe BZ Services</span>.</p>
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated message from <span class="platform-name">Groupe BZ Services</span>.</p>
          <p>If you have any questions, please contact the system administrator.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text email content for approval request
 */
function generateApprovalEmailText(userDetails: any): string {
  return `
NEW USER REGISTRATION - APPROVAL REQUIRED

A new user has registered and requires your approval to access Groupe BZ Services.

USER INFORMATION:
- Name: ${userDetails.name}
- Email: ${userDetails.email}
- Phone: ${userDetails.phone}
- User Type: ${userDetails.userType.charAt(0).toUpperCase() + userDetails.userType.slice(1)}
- Registration Date: ${userDetails.signupDate}
${userDetails.userType === 'manager' ? `
- Position: ${userDetails.post}
- CIUSSS: ${userDetails.ciusss}
` : ''}

${userDetails.documents.length > 0 ? `
SUBMITTED DOCUMENTS:
Note: All documents are attached to this email for your review. You can also download them directly using the links below.
${userDetails.documents.map((doc: any) => `- ${doc.type.toUpperCase()}: ${doc.name} (${doc.size})
  Download: ${doc.downloadUrl}`).join('\n')}
` : ''}

ACTION REQUIRED:
Please review the user's information and documents carefully before making a decision.

APPROVE USER: ${userDetails.approvalUrl}
REJECT USER: ${userDetails.rejectionUrl}

Note: Once approved, the user will receive an email notification and can access Groupe BZ Services.

This is an automated message from Groupe BZ Services.
If you have any questions, please contact the system administrator.
  `;
}
