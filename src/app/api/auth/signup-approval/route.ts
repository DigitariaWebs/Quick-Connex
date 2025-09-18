import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { EmailService } from '@/lib/communication/email-service';
import { EmailMessage, EmailRecipient, EmailContent } from '@/types/communication-types';

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
        size: `${(doc.size / 1024 / 1024).toFixed(2)} MB`
      })) || [],
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
        text: generateApprovalEmailText(userDetails)
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
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .user-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
        .documents { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .actions { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; padding: 12px 24px; margin: 0 10px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .btn-approve { background-color: #28a745; color: white; }
        .btn-reject { background-color: #dc3545; color: white; }
        .btn:hover { opacity: 0.9; }
        .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
        .urgent { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔔 New User Registration</h1>
        <p>Approval Required for Patient Management System</p>
      </div>
      
      <div class="content">
        <div class="urgent">
          <h3>⚠️ Action Required</h3>
          <p>A new user has registered and requires your approval to access the Patient Management System.</p>
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
            <ul>
              ${userDetails.documents.map((doc: any) => `
                <li><strong>${doc.type.toUpperCase()}:</strong> ${doc.name} (${doc.size})</li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div class="actions">
          <a href="${userDetails.approvalUrl}" class="btn btn-approve">✅ Approve User</a>
          <a href="${userDetails.rejectionUrl}" class="btn btn-reject">❌ Reject User</a>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Note:</strong> Please review the user's information and documents carefully before making a decision. 
          Once approved, the user will receive an email notification and can access the system.</p>
        </div>
      </div>
      
      <div class="footer">
        <p>This is an automated message from the Patient Management System.</p>
        <p>If you have any questions, please contact the system administrator.</p>
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

A new user has registered and requires your approval to access the Patient Management System.

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
${userDetails.documents.map((doc: any) => `- ${doc.type.toUpperCase()}: ${doc.name} (${doc.size})`).join('\n')}
` : ''}

ACTION REQUIRED:
Please review the user's information and documents carefully before making a decision.

APPROVE USER: ${userDetails.approvalUrl}
REJECT USER: ${userDetails.rejectionUrl}

Note: Once approved, the user will receive an email notification and can access the system.

This is an automated message from the Patient Management System.
If you have any questions, please contact the system administrator.
  `;
}
