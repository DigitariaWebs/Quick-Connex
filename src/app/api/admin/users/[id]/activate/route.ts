import { NextRequest, NextResponse } from 'next/server';
import User from '@/models/User';
import { AuthService } from '@/lib/auth';
import { EmailService } from '@/lib/communication/channels/email/email-service';
import { EmailMessage } from '@/types/communication';

/**
 * POST /api/admin/users/[id]/activate
 * 
 * Activate suspended user account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reason = 'Account reactivated by administrator' } = body;

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

    if (user.status !== 'suspended') {
      return NextResponse.json(
        { success: false, error: `User is not suspended. Current status: ${user.status}` },
        { status: 400 }
      );
    }

    // Update user status
    const updateData = {
      status: 'approved',
      approvedBy: admin.email,
      approvedAt: new Date(),
      rejectionReason: undefined // Clear any previous rejection/suspension reason
    };

    await User.findByIdAndUpdate(id, updateData);

    // Send notification email to user
    await sendUserNotificationEmail(user, 'activate', reason);

    console.log(`✅ User ${user.email} activated by ${admin.email}. Reason: ${reason}`);

    return NextResponse.json({
      success: true,
      message: 'User reactivated successfully',
      data: {
        userId: id,
        status: 'approved',
        activatedBy: admin.email,
        activatedAt: new Date(),
        activationReason: reason
      }
    });

  } catch (error) {
    console.error('Error activating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to activate user' },
      { status: 500 }
    );
  }
}

/**
 * Send notification email to user about activation
 */
async function sendUserNotificationEmail(user: any, action: string, reason: string) {
  try {
    const emailService = new EmailService();
    
    const emailMessage: EmailMessage = {
      id: `activation-${user._id}-${Date.now()}`,
      channel: 'email',
      status: 'pending',
      recipient: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      },
      content: {
        subject: 'Account Reactivated - Groupe BZ Services',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Account Reactivated</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your account has been reactivated</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello ${user.firstName} ${user.lastName},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Great news! Your account has been reactivated by an administrator. You can now access Groupe BZ Services again.
              </p>
              
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <h3 style="color: #059669; margin: 0 0 8px 0; font-size: 16px;">Reason for Reactivation:</h3>
                <p style="color: #166534; margin: 0; font-size: 14px;">${reason}</p>
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                You can now log in to your account and resume using all the features of Groupe BZ Services.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.BASE_URL || 'http://localhost:3000'}/login" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                  Log In to Your Account
                </a>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
              <p>This is an automated message from Groupe BZ Services</p>
            </div>
          </div>
        `,
        text: `
          Account Reactivated - Groupe BZ Services
          
          Hello ${user.firstName} ${user.lastName},
          
          Great news! Your account has been reactivated by an administrator. You can now access Groupe BZ Services again.
          
          Reason for Reactivation: ${reason}
          
          You can now log in to your account and resume using all the features of Groupe BZ Services.
          
          Log in at: ${process.env.BASE_URL || 'http://localhost:3000'}/login
          
          This is an automated message from Groupe BZ Services.
        `
      },
      metadata: {
        source: 'user-activation-system',
        category: 'user-notification',
        userId: (user._id as any).toString()
      },
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await emailService.sendEmail(emailMessage);
    console.log(`📧 Activation notification sent to ${user.email}`);
    
  } catch (error) {
    console.error('Error sending activation notification email:', error);
    // Don't throw error - email failure shouldn't prevent activation
  }
}














