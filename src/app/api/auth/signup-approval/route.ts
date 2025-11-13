import { NextResponse } from 'next/server';
import User from '@/models/User';
import { CommunicationService } from '@/lib/communication';
import { EmailMessage, EmailRecipient, EmailContent } from '@/lib/communication/core/types';
import { TemplateLoader } from '@/lib/communication/templates/core/TemplateLoader';
// import { getUserDocumentsAsAttachments, getDocumentSummary } from '@/lib/communication/utils/user-document-attachments';

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
    const communicationService = CommunicationService.getInstance();

    // Get user documents as attachments
    console.log('📎 Preparing user documents as email attachments...');
    // const attachments = await getUserDocumentsAsAttachments(user);
    const attachments: any[] = []; // TODO: Implement user document attachments
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
      documentSummary: 'Document summary not available', // TODO: Implement document summary
      signupDate: user.createdAt.toLocaleDateString(),
      dashboardUrl: `${baseUrl}/admin/users`
    };

    // Use TemplateLoader to render approval request email
    const templateLoader = TemplateLoader.getInstance();
    const templateData = {
      name: userDetails.name,
      email: userDetails.email,
      phone: userDetails.phone,
      userType: userDetails.userType,
      userTypeDisplay: userDetails.userType.charAt(0).toUpperCase() + userDetails.userType.slice(1),
      signupDate: userDetails.signupDate,
      post: userDetails.post,
      ciusss: userDetails.ciusss,
      isManager: userDetails.userType === 'manager',
      documents: userDetails.documents,
      hasDocuments: userDetails.documents.length > 0,
      dashboardUrl: userDetails.dashboardUrl
    };
    const emailHtml = templateLoader.renderTemplate('email/user/approval-request.html', templateData);

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
        html: emailHtml,
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
    const result = await communicationService.sendEmail(emailMessage);

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
