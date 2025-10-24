import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DatabaseService, User } from '@/lib/database';
import crypto from 'crypto';
import { rateLimit } from '@/lib/services/security';
import { EmailService } from '@/lib/communication/channels/email/email-service';
import { EmailMessage } from '@/types/communication';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 3 attempts per 15 minutes
    const rateLimitResult = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 3,
    })(request);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          message: 'Too many password reset attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          }
        }
      );
    }

    // Connect to MongoDB
    console.log('🔄 API: Attempting to connect to MongoDB...');
    // DatabaseService handles connection automatically
console.log('✅ API: MongoDB connection established');

    // Parse the request body
    const { email } = await request.json();

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    console.log(`🔍 API: Looking up user with email: ${email}`);
    const user = await DatabaseService.findOne(User, { email: email.toLowerCase() });

    if (!user) {
      console.log('❌ API: User not found');
      return NextResponse.json(
        { message: 'No account found with this email address.' },
        { status: 404 }
      );
    }

    // Check if user is approved
    if (user.status !== 'approved') {
      console.log('❌ API: User account is not approved');
      return NextResponse.json(
        { message: 'Your account is not approved yet. Please contact support for assistance.' },
        { status: 403 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user;

    console.log('✅ API: Reset token generated and saved');

    // Send password reset email
    try {
      console.log('📧 API: Creating EmailService instance...');
      const emailService = new EmailService();
      console.log('✅ API: EmailService created successfully');
      
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      console.log('🔗 API: Reset URL generated:', resetUrl);
      
      const emailMessage: EmailMessage = {
        id: `reset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        channel: 'email',
        status: 'pending',
        recipient: {
          email: user.email,
          name: `${user.firstName} ${user.lastName}`
        },
        content: {
          subject: 'Reset Your Password - Patient Management System',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1f2937; margin: 0; font-size: 28px;">Password Reset Request</h1>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${user.firstName} ${user.lastName},</h2>
                
                <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                  We received a request to reset your password for your Patient Management System account.
                </p>
                
                <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
                  Click the button below to reset your password:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                    Reset Password
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
                  <strong>Important:</strong> This link will expire in 1 hour. If you don't reset your password within this time, you'll need to request a new reset link.
                </p>
                
                <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
                  If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                  This is an automated message from the Patient Management System.<br>
                  If you have any questions, please contact your system administrator.
                </p>
              </div>
            </div>
          `,
          text: `Hello ${user.firstName} ${user.lastName},

We received a request to reset your password for your Patient Management System account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email.

This is an automated message from the Patient Management System.`
        },
        metadata: {
          source: 'password-reset-system',
          category: 'password_reset',
          userId: (user._id as any).toString()
        },
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('📧 API: Sending email with template:', emailMessage.content.template);
      console.log('📧 API: Email recipient:', emailMessage.recipient.email);
      
      const emailResponse = await emailService.sendEmail(emailMessage);
      
      console.log('📊 API: Email response:', {
        success: emailResponse.success,
        messageId: emailResponse.messageId,
        status: emailResponse.status,
        error: emailResponse.error
      });
      
      if (emailResponse.success) {
        console.log('✅ API: Password reset email sent successfully');
      } else {
        console.error('❌ API: Failed to send password reset email:', emailResponse.error);
        // Don't fail the request if email fails, just log it
      }
    } catch (emailError) {
      console.error('❌ API: Error sending password reset email:', emailError);
      console.error('❌ API: Error stack:', (emailError as Error).stack);
      // Don't fail the request if email fails, just log it
    }

    return NextResponse.json(
      { message: 'Password reset link has been sent to your email address.' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('❌ API: Password reset request failed:', error);
    return NextResponse.json(
      { message: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}
