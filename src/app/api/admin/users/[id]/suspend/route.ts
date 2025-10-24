import { NextRequest, NextResponse } from 'next/server';
import User from '@/models/User';
import { AuthService } from '@/lib/auth';
import { EmailService } from '@/lib/communication/channels/email/email-service';
import { EmailMessage } from '@/types/communication';

/**
 * POST /api/admin/users/[id]/suspend
 * 
 * Suspend user account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reason = 'Account suspended by administrator' } = body;

    // Verify admin authentication
    const { user: admin } = await AuthService.requireAuth(request, {
      roles: ['admin', 'super_admin'],
      requireSession: true
    });
    // DatabaseService handles connection automatically
// Get user details
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.status === 'suspended') {
      return NextResponse.json(
        { success: false, error: 'User is already suspended' },
        { status: 400 }
      );
    }

    if (user.status === 'pending') {
      return NextResponse.json(
        { success: false, error: 'Cannot suspend pending users. Please approve or reject first.' },
        { status: 400 }
      );
    }

    // Update user status
    const updateData = {
      status: 'suspended',
      approvedBy: admin.email,
      approvedAt: new Date(),
      rejectionReason: reason // Store suspension reason
    };

    await User.findByIdAndUpdate(id, updateData);

    // Send notification email to user
    await sendUserNotificationEmail(user, 'suspend', reason);

    console.log(`🚫 User ${user.email} suspended by ${admin.email}. Reason: ${reason}`);

    return NextResponse.json({
      success: true,
      message: 'User suspended successfully',
      data: {
        userId: id,
        status: 'suspended',
        suspendedBy: admin.email,
        suspendedAt: new Date(),
        suspensionReason: reason
      }
    });

  } catch (error) {
    console.error('Error suspending user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to suspend user' },
      { status: 500 }
    );
  }
}

/**
 * Send notification email to user about suspension
 */
async function sendUserNotificationEmail(user: any, action: string, reason: string) {
  try {
    const emailService = new EmailService();
    
    const emailMessage: EmailMessage = {
      id: `suspension-${user._id}-${Date.now()}`,
      channel: 'email',
      status: 'pending',
      recipient: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      },
      content: {
        subject: 'Account Suspended - Groupe BZ Services',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Account Suspended</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your account has been temporarily suspended</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello ${user.firstName} ${user.lastName},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your account has been suspended by an administrator. This means you will not be able to access Groupe BZ Services until further notice.
              </p>
              
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <h3 style="color: #dc2626; margin: 0 0 8px 0; font-size: 16px;">Reason for Suspension:</h3>
                <p style="color: #7f1d1d; margin: 0; font-size: 14px;">${reason}</p>
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                If you believe this suspension is in error, please contact our support team for assistance.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="mailto:support@groupebz.com" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                  Contact Support
                </a>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
              <p>This is an automated message from Groupe BZ Services</p>
            </div>
          </div>
        `,
        text: `
          Account Suspended - Groupe BZ Services
          
          Hello ${user.firstName} ${user.lastName},
          
          Your account has been suspended by an administrator. This means you will not be able to access Groupe BZ Services until further notice.
          
          Reason for Suspension: ${reason}
          
          If you believe this suspension is in error, please contact our support team at support@groupebz.com for assistance.
          
          This is an automated message from Groupe BZ Services.
        `
      },
      metadata: {
        source: 'user-suspension-system',
        category: 'user-notification',
        userId: (user._id as any).toString()
      },
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await emailService.sendEmail(emailMessage);
    console.log(`📧 Suspension notification sent to ${user.email}`);
    
  } catch (error) {
    console.error('Error sending suspension notification email:', error);
    // Don't throw error - email failure shouldn't prevent suspension
  }
}














