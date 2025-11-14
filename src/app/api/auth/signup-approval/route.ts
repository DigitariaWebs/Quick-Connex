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

    // Query database for all admin users (userType: 'admin' or 'super_admin')
    const adminUsers = await User.find({ 
      userType: { $in: ['admin', 'super_admin'] } 
    })
      .select('firstName lastName email')
      .lean();

    // Check if any admins found
    if (!adminUsers || adminUsers.length === 0) {
      console.error('❌ No admin users found in database. Cannot send approval request notifications.');
      return NextResponse.json(
        { error: 'No admin users found in database. Cannot send approval request notifications.' },
        { status: 500 }
      );
    }

    console.log(`📧 Found ${adminUsers.length} admin user(s) to notify for user approval`);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

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
    const emailText = templateLoader.htmlToText(emailHtml);

    // Send emails to all admin users
    let emailCount = 0;
    const errors: string[] = [];

    for (const adminUser of adminUsers) {
      const adminContact = {
        email: adminUser.email,
        name: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'System Administrator'
      };

      // Skip if admin doesn't have email
      if (!adminContact.email) {
        console.warn(`⚠️ Skipping email for admin ${adminContact.name} - no email address`);
        continue;
      }

      try {
        // Create email message for this admin
        const emailMessage: EmailMessage = {
          id: `approval-${userId}-${Date.now()}-${adminUser._id?.toString() || 'unknown'}`,
          channel: 'email',
          status: 'pending',
          recipient: {
            email: adminContact.email,
            name: adminContact.name
          },
          content: {
            subject: `New User Registration - ${userDetails.name} (${userDetails.userType})`,
            html: emailHtml,
            text: emailText,
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
          emailCount++;
          console.log(`📧 Approval request email sent to admin: ${adminContact.email}`);
        } else {
          errors.push(`Failed to send email to ${adminContact.email}: ${result.error || 'Unknown error'}`);
          console.error(`❌ Failed to send email to admin ${adminContact.email}:`, result.error);
        }
      } catch (emailError) {
        errors.push(`Error sending email to ${adminContact.email}: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
        console.error(`❌ Error sending email to admin ${adminContact.email}:`, emailError);
      }
    }

    // Return success if at least one email was sent
    if (emailCount > 0) {
      return NextResponse.json({
        success: true,
        message: `Approval email sent successfully to ${emailCount} admin(s)`,
        emailsSent: emailCount,
        totalAdmins: adminUsers.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Failed to send approval emails to any admin',
          details: errors.length > 0 ? errors : 'No admin users have email addresses configured'
        },
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


