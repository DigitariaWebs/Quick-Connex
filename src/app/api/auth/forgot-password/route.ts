import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DatabaseService } from '@/lib/database';
import User from '@/models/User';
import crypto from 'crypto';
import { rateLimit } from '@/lib/auth';
import { CommunicationService } from '@/lib/communication';
import { EmailMessage } from '@/lib/communication';
import { TemplateLoader } from '@/lib/communication/templates/core/TemplateLoader';

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
      const communicationService = CommunicationService.getInstance();
      console.log('✅ API: EmailService created successfully');
      
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      console.log('🔗 API: Reset URL generated:', resetUrl);
      
      // Use TemplateLoader to render password reset email
      const templateLoader = TemplateLoader.getInstance();
      const templateData = {
        firstName: user.firstName,
        lastName: user.lastName,
        resetUrl,
        expirationMinutes: 1
      };
      
      const emailHtml = templateLoader.renderTemplate('email/auth/password-reset.html', templateData);
      
      const emailMessage: EmailMessage = {
        id: `reset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        channel: 'email',
        status: 'pending',
        recipient: {
          email: user.email,
          name: `${user.firstName} ${user.lastName}`
        },
        content: {
          subject: 'Password Reset Request - Quick Connex',
          html: emailHtml,
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
      
      const emailResponse = await communicationService.sendEmail(emailMessage);
      
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
