/**
 * Email Verification Service
 * Handles email verification during signup using email codes
 */

import bcrypt from 'bcryptjs';
import { DatabaseService } from '@/lib/database';
import EmailVerification, { IEmailVerification } from '@/models/EmailVerification';
import { CommunicationService } from '@/lib/communication';
import { EmailMessage } from '@/lib/communication/core/types';
import { AppError, ValidationError } from '@/lib/utils/error-handling';
import { TemplateLoader } from '@/lib/communication/templates/core/TemplateLoader';

// Constants (same as phone verification)
const CODE_LENGTH = 6;
const CODE_EXPIRATION_MINUTES = 5;
const MAX_CODES_PER_HOUR = 3;
const MAX_ATTEMPTS_PER_CODE = 5;

/**
 * Generate a random 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Normalize email address (lowercase, trim)
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}


/**
 * Email Verification Service
 */
export class EmailVerificationService {
  /**
   * Send verification code to email address
   */
  static async sendVerificationCode(
    email: string,
    ipAddress?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log('📧 [EmailVerification] Starting sendVerificationCode');
      console.log('📧 [EmailVerification] Input email:', email);
      console.log('📧 [EmailVerification] IP address:', ipAddress);
      
      // Normalize email
      const normalizedEmail = normalizeEmail(email);
      console.log('📧 [EmailVerification] Normalized email:', normalizedEmail);
      
      // Check rate limiting (3 codes per hour per email)
      console.log('📧 [EmailVerification] Checking rate limits...');
      const recentCodeCount = await EmailVerification.countRecentCodes(normalizedEmail, 60);
      console.log('📧 [EmailVerification] Recent code count (from static method):', recentCodeCount);
      
      const count = typeof recentCodeCount === 'number' ? recentCodeCount : await EmailVerification.countDocuments({
        email: normalizedEmail,
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
      });
      console.log('📧 [EmailVerification] Final code count:', count);
      
      if (count >= MAX_CODES_PER_HOUR) {
        console.log('❌ [EmailVerification] Rate limit exceeded');
        throw new ValidationError(
          `Too many verification codes sent. Please wait before requesting another code.`,
          'RATE_LIMIT_EXCEEDED'
        );
      }
      
      console.log('📧 [EmailVerification] Rate limit check passed');
      
      // Invalidate any existing unverified codes for this email
      console.log('📧 [EmailVerification] Invalidating existing unverified codes...');
      await DatabaseService.updateMany(
        EmailVerification,
        {
          email: normalizedEmail,
          verified: false,
          expiresAt: { $gt: new Date() }
        },
        {
          verified: true, // Mark as "used" so they can't be verified
          verifiedAt: new Date()
        }
      );
      console.log('📧 [EmailVerification] Existing codes invalidated');
      
      // Generate verification code
      console.log('📧 [EmailVerification] Generating verification code...');
      const code = generateVerificationCode();
      console.log('📧 [EmailVerification] Code generated:', code);
      
      const codeHash = await bcrypt.hash(code, 10);
      console.log('📧 [EmailVerification] Code hashed');
      
      // Set expiration (5 minutes)
      const expiresAt = new Date(Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000);
      console.log('📧 [EmailVerification] Expires at:', expiresAt);
      
      // Create verification record
      console.log('📧 [EmailVerification] Creating verification record...');
      const verification = await DatabaseService.create(EmailVerification, {
        email: normalizedEmail,
        codeHash,
        expiresAt,
        verified: false,
        attemptCount: 0,
        maxAttempts: MAX_ATTEMPTS_PER_CODE,
        ipAddress
      });
      console.log('📧 [EmailVerification] Verification record created:', verification._id);
      
      // Send email via CommunicationService
      console.log('📧 [EmailVerification] Getting CommunicationService instance...');
      const communicationService = CommunicationService.getInstance();
      console.log('📧 [EmailVerification] CommunicationService instance obtained');
      
      const verificationId = (verification._id as any)?.toString() || String(verification._id);
      
      // Use TemplateLoader to render email verification template
      const templateLoader = TemplateLoader.getInstance();
      const templateData = {
        code,
        expirationMinutes: CODE_EXPIRATION_MINUTES,
        currentYear: new Date().getFullYear()
      };
      const emailTemplate = templateLoader.renderTemplate('email/auth/email-verification.html', templateData);
      
      const emailMessage: EmailMessage = {
        id: `email_verification_${verificationId}`,
        channel: 'email',
        priority: 'high',
        status: 'pending',
        recipient: {
          email: normalizedEmail
        },
        content: {
          subject: 'Your Email Verification Code',
          text: `Your verification code is: ${code}. This code will expire in ${CODE_EXPIRATION_MINUTES} minutes. Never share this code with anyone.`,
          html: emailTemplate
        },
        metadata: {
          source: 'email_verification_service',
          category: 'email_verification',
          notificationId: verificationId
        },
        tracking: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      console.log('📧 [EmailVerification] Email message prepared:', {
        id: emailMessage.id,
        recipient: emailMessage.recipient.email,
        subject: emailMessage.content.subject
      });
      
      console.log('📧 [EmailVerification] Sending email...');
      const emailResult = await communicationService.sendEmail(emailMessage);
      console.log('📧 [EmailVerification] Email result:', {
        success: emailResult.success,
        status: emailResult.status,
        error: emailResult.error,
        messageId: emailResult.messageId
      });
      
      if (!emailResult.success) {
        console.log('❌ [EmailVerification] Email failed, deleting verification record...');
        // Delete verification record if email failed
        await DatabaseService.deleteOne(EmailVerification, { _id: verification._id });
        console.log('❌ [EmailVerification] Verification record deleted');
        throw new AppError(
          `Failed to send verification code: ${emailResult.error || 'Unknown error'}. Please try again.`,
          500,
          'EMAIL_SEND_FAILED'
        );
      }
      
      console.log('✅ [EmailVerification] Verification code sent successfully');
      return {
        success: true,
        message: 'Verification code sent successfully'
      };
      
    } catch (error) {
      console.error('❌ [EmailVerification] Error in sendVerificationCode:', error);
      console.error('❌ [EmailVerification] Error type:', error?.constructor?.name);
      console.error('❌ [EmailVerification] Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ [EmailVerification] Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      if (error instanceof ValidationError || error instanceof AppError) {
        console.log('📧 [EmailVerification] Re-throwing ValidationError/AppError');
        throw error;
      }
      
      console.log('❌ [EmailVerification] Wrapping unknown error in AppError');
      throw new AppError(
        `Failed to send verification code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'VERIFICATION_ERROR'
      );
    }
  }
  
  /**
   * Verify code for email address
   */
  static async verifyCode(
    email: string,
    code: string
  ): Promise<{ success: boolean; verified: boolean; message?: string; error?: string }> {
    try {
      // Normalize email
      const normalizedEmail = normalizeEmail(email);
      
      // Find active verification record
      const verification = await EmailVerification.findActiveVerification(normalizedEmail) || 
        await EmailVerification.findOne({
          email: normalizedEmail,
          verified: false,
          expiresAt: { $gt: new Date() },
          attemptCount: { $lt: MAX_ATTEMPTS_PER_CODE }
        }).sort({ createdAt: -1 });
      
      if (!verification) {
        return {
          success: false,
          verified: false,
          error: 'No valid verification code found. Please request a new code.'
        };
      }
      
      // Check if code is expired
      if (verification.isExpired()) {
        return {
          success: false,
          verified: false,
          error: 'Verification code has expired. Please request a new code.'
        };
      }
      
      // Check max attempts
      if (verification.attemptCount >= MAX_ATTEMPTS_PER_CODE) {
        return {
          success: false,
          verified: false,
          error: 'Too many verification attempts. Please request a new code.'
        };
      }
      
      // Verify code
      const isValid = await bcrypt.compare(code, verification.codeHash);
      
      // Increment attempt count
      await verification.incrementAttempt();
      
      if (!isValid) {
        const remainingAttempts = MAX_ATTEMPTS_PER_CODE - verification.attemptCount;
        return {
          success: false,
          verified: false,
          error: `Invalid verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.` : 'Please request a new code.'}`
        };
      }
      
      // Mark as verified
      await verification.markAsVerified();
      
      return {
        success: true,
        verified: true,
        message: 'Email address verified successfully'
      };
      
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        'Failed to verify code',
        500,
        'VERIFICATION_ERROR'
      );
    }
  }
  
  /**
   * Check if email address has been verified recently (within last 10 minutes)
   */
  static async isEmailVerified(email: string, withinMinutes: number = 10): Promise<boolean> {
    try {
      const normalizedEmail = normalizeEmail(email);
      const verified = await EmailVerification.findVerifiedEmail(normalizedEmail, withinMinutes);
      return !!verified;
    } catch (error) {
      console.error('Error checking email verification:', error);
      return false;
    }
  }
  
  /**
   * Get verification status for an email address
   */
  static async getVerificationStatus(email: string): Promise<{
    isVerified: boolean;
    verifiedAt?: Date;
    canRequestNewCode: boolean;
    codesRemaining: number;
    nextCodeAvailableAt?: Date;
  }> {
    try {
      const normalizedEmail = normalizeEmail(email);
      
      // Check if verified
      const verified = await EmailVerification.findVerifiedEmail(normalizedEmail, 10);
      
      // Check rate limiting
      const recentCodes = await EmailVerification.countRecentCodes(normalizedEmail, 60);
      const codesCount = typeof recentCodes === 'number' ? recentCodes : await EmailVerification.countDocuments({
        email: normalizedEmail,
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
      });
      const canRequestNewCode = codesCount < MAX_CODES_PER_HOUR;
      
      // Calculate next available code time
      const oldestCode = await EmailVerification.findOne({
        email: normalizedEmail
      }).sort({ createdAt: 1 });
      
      let nextCodeAvailableAt: Date | undefined;
      if (oldestCode && !canRequestNewCode) {
        const oldestCodeTime = oldestCode.createdAt.getTime();
        const oneHourLater = oldestCodeTime + (60 * 60 * 1000);
        nextCodeAvailableAt = new Date(oneHourLater);
      }
      
      return {
        isVerified: !!verified,
        verifiedAt: verified?.verifiedAt,
        canRequestNewCode,
        codesRemaining: Math.max(0, MAX_CODES_PER_HOUR - codesCount),
        nextCodeAvailableAt
      };
    } catch (error) {
      console.error('Error getting verification status:', error);
      return {
        isVerified: false,
        canRequestNewCode: false,
        codesRemaining: 0
      };
    }
  }
  
  /**
   * Cleanup expired verification records
   */
  static async cleanupExpired(): Promise<number> {
    try {
      const result = await EmailVerification.cleanupExpired();
      return result.deletedCount || 0;
    } catch (error) {
      console.error('Error cleaning up expired verifications:', error);
      return 0;
    }
  }
}

export default EmailVerificationService;

