import { NextResponse } from 'next/server';
import User from '@/models/User';
import { EmailService } from '@/lib/communication/channels/email/email-service';
import { EmailMessage, EmailRecipient, EmailContent } from '@/types/communication';
import { getUserDocumentsAsAttachments, getDocumentSummary } from '@/lib/communication/utils/user-document-attachments';

/**
 * Send signup approval email to admin
 */
export async function POST(request: Request) {
  try {
    // DatabaseService handles connection automatically
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
      documents: user.documents?.map((doc: any) => ({
        type: doc.documentType,
        name: doc.originalName,
        size: `${(doc.size / 1024 / 1024).toFixed(2)} MB`,
        downloadUrl: `${baseUrl}/api/files/${doc.fileId}`
      })) || [],
      documentSummary: getDocumentSummary(user),
      signupDate: user.createdAt.toLocaleDateString(),
      dashboardUrl: `${baseUrl}/admin/users`
    };

    // Create email message
    const emailMessage: EmailMessage = {
      id: `approval-${userId}-${Date.now()}`,
      channel: 'email',
      status: 'pending',
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
        source: 'user-approval-system',
        category: 'user-approval',
        userId: userId,
      },
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date()
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
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1f2937; margin: 0; font-size: 28px;">🔔 New User Registration</h1>
        <p style="color: #1f2937; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Approval Required for <strong>Groupe BZ Services</strong></p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 18px; font-weight: 600;">⚠️ Action Required</h3>
          <p style="margin: 0; color: #92400e;">A new user has registered and requires your approval to access <strong>Groupe BZ Services</strong>.</p>
        </div>
        
        <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">👤 User Information</h3>
          <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>Name:</strong> ${userDetails.name}</p>
          <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>Email:</strong> ${userDetails.email}</p>
          <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>Phone:</strong> ${userDetails.phone}</p>
          <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>User Type:</strong> ${userDetails.userType.charAt(0).toUpperCase() + userDetails.userType.slice(1)}</p>
          <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>Registration Date:</strong> ${userDetails.signupDate}</p>
          ${userDetails.userType === 'manager' ? `
            <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>Position:</strong> ${userDetails.post}</p>
            <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>CIUSSS:</strong> ${userDetails.ciusss}</p>
          ` : ''}
        </div>
        
        ${userDetails.documents.length > 0 ? `
          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 24px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #a7f3d0;">
            <h3 style="margin: 0 0 12px 0; color: #065f46; font-size: 18px; font-weight: 600;">📄 Submitted Documents</h3>
            <p style="margin: 0 0 16px 0; color: #047857; font-size: 14px;"><strong>Note:</strong> All documents are attached to this email for your review. You can also download them directly using the links below.</p>
            <div style="margin: 0; padding: 0;">
              ${userDetails.documents.map((doc: any) => `
                <div style="margin: 0 0 8px 0; padding: 8px 12px; background: white; border-radius: 8px; color: #065f46; font-size: 14px;">
                  <strong>${doc.type.toUpperCase()}:</strong> ${doc.name} (${doc.size})
                  <br>
                  <a href="${doc.downloadUrl}" style="color: #10b981; text-decoration: none; font-size: 12px; margin-left: 20px;">📥 Download File</a>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="${userDetails.dashboardUrl}" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
            🎛️ Review in Admin Dashboard
          </a>
        </div>
        
        <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 30px 0 0 0; border-left: 4px solid #64748b;">
          <p style="margin: 0; color: #475569; font-size: 14px;"><strong>Note:</strong> Please review the user's information and documents carefully before making a decision. Once approved, the user will receive an email notification and can access <strong>Groupe BZ Services</strong>.</p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          This is an automated message from <strong>Groupe BZ Services</strong>.<br>
          If you have any questions, please contact the system administrator.
        </p>
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

REVIEW IN ADMIN DASHBOARD: ${userDetails.dashboardUrl}

Note: You can approve or reject this user directly from the admin dashboard. Once approved, the user will receive an email notification and can access Groupe BZ Services.

This is an automated message from Groupe BZ Services.
If you have any questions, please contact the system administrator.
  `;
}
