/**
 * Phone Verification Service
 * Handles phone number verification during signup using SMS codes
 */

import bcrypt from "bcryptjs";
import { DatabaseService } from "@/lib/database";
import PhoneVerification, {
  IPhoneVerification,
} from "@/models/PhoneVerification";
import { CommunicationService } from "@/lib/communication";
import { SMSMessage } from "@/lib/communication/core/types";
import { AppError, ValidationError } from "@/lib/utils/error-handling";

// Constants
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
 * Format phone number for display and storage (E.164 format)
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, "");

  // If no + at start and starts with 1, assume US number
  if (!normalized.startsWith("+") && normalized.startsWith("1")) {
    normalized = "+" + normalized;
  } else if (!normalized.startsWith("+")) {
    // Assume it's a US number without country code
    normalized = "+1" + normalized;
  }

  return normalized;
}

/**
 * Phone Verification Service
 */
export class PhoneVerificationService {
  /**
   * Send verification code to phone number
   */
  static async sendVerificationCode(
    phone: string,
    ipAddress?: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log("📱 [PhoneVerification] Starting sendVerificationCode");
      console.log("📱 [PhoneVerification] Input phone:", phone);
      console.log("📱 [PhoneVerification] IP address:", ipAddress);

      // Normalize phone number
      const normalizedPhone = normalizePhoneNumber(phone);
      console.log("📱 [PhoneVerification] Normalized phone:", normalizedPhone);

      // Check rate limiting (3 codes per hour per phone)
      console.log("📱 [PhoneVerification] Checking rate limits...");
      const recentCodeCount = await PhoneVerification.countRecentCodes(
        normalizedPhone,
        60,
      );
      console.log(
        "📱 [PhoneVerification] Recent code count (from static method):",
        recentCodeCount,
      );

      const count =
        typeof recentCodeCount === "number"
          ? recentCodeCount
          : await PhoneVerification.countDocuments({
              phone: normalizedPhone,
              createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
            });
      console.log("📱 [PhoneVerification] Final code count:", count);

      if (count >= MAX_CODES_PER_HOUR) {
        console.log("❌ [PhoneVerification] Rate limit exceeded");
        throw new ValidationError(
          `Too many verification codes sent. Please wait before requesting another code.`,
          "RATE_LIMIT_EXCEEDED",
        );
      }

      console.log("📱 [PhoneVerification] Rate limit check passed");

      // Invalidate any existing unverified codes for this phone
      console.log(
        "📱 [PhoneVerification] Invalidating existing unverified codes...",
      );
      await DatabaseService.updateMany(
        PhoneVerification,
        {
          phone: normalizedPhone,
          verified: false,
          expiresAt: { $gt: new Date() },
        },
        {
          verified: true, // Mark as "used" so they can't be verified
          verifiedAt: new Date(),
        },
      );
      console.log("📱 [PhoneVerification] Existing codes invalidated");

      // Generate verification code
      console.log("📱 [PhoneVerification] Generating verification code...");
      const code = generateVerificationCode();
      console.log("📱 [PhoneVerification] Code generated:", code);

      const codeHash = await bcrypt.hash(code, 10);
      console.log("📱 [PhoneVerification] Code hashed");

      // Set expiration (5 minutes)
      const expiresAt = new Date(
        Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000,
      );
      console.log("📱 [PhoneVerification] Expires at:", expiresAt);

      // Create verification record
      console.log("📱 [PhoneVerification] Creating verification record...");
      const verification = await DatabaseService.create(PhoneVerification, {
        phone: normalizedPhone,
        codeHash,
        expiresAt,
        verified: false,
        attemptCount: 0,
        maxAttempts: MAX_ATTEMPTS_PER_CODE,
        ipAddress,
      });
      console.log(
        "📱 [PhoneVerification] Verification record created:",
        verification._id,
      );

      // Dev mode: skip Twilio, log code to server console
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `🔐 [PhoneVerification][DEV] OTP for ${normalizedPhone}: ${code} (expires in ${CODE_EXPIRATION_MINUTES}m)`,
        );
        return {
          success: true,
          message: "Verification code generated (dev mode — check server logs)",
        };
      }

      // Send SMS via CommunicationService
      console.log(
        "📱 [PhoneVerification] Getting CommunicationService instance...",
      );
      const communicationService = CommunicationService.getInstance();
      console.log(
        "📱 [PhoneVerification] CommunicationService instance obtained",
      );

      const verificationId =
        (verification._id as any)?.toString() || String(verification._id);
      const smsMessage: SMSMessage = {
        id: `phone_verification_${verificationId}`,
        channel: "sms",
        priority: "high",
        status: "pending",
        recipient: {
          phone: normalizedPhone,
        },
        content: {
          text: `Your verification code is: ${code}. This code will expire in ${CODE_EXPIRATION_MINUTES} minutes.`,
        },
        metadata: {
          source: "phone_verification_service",
          category: "phone_verification",
          notificationId: verificationId,
        },
        tracking: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      console.log("📱 [PhoneVerification] SMS message prepared:", {
        id: smsMessage.id,
        recipient: smsMessage.recipient.phone,
        messageLength: smsMessage.content.text.length,
      });

      console.log("📱 [PhoneVerification] Sending SMS...");
      const smsResult = await communicationService.sendSMS(smsMessage);
      console.log("📱 [PhoneVerification] SMS result:", {
        success: smsResult.success,
        status: smsResult.status,
        error: smsResult.error,
        messageId: smsResult.messageId,
      });

      if (!smsResult.success) {
        console.log(
          "❌ [PhoneVerification] SMS failed, deleting verification record...",
        );
        // Delete verification record if SMS failed
        await DatabaseService.deleteOne(PhoneVerification, {
          _id: verification._id,
        });
        console.log("❌ [PhoneVerification] Verification record deleted");
        throw new AppError(
          `Failed to send verification code: ${smsResult.error || "Unknown error"}. Please try again.`,
          500,
          "SMS_SEND_FAILED",
        );
      }

      console.log("✅ [PhoneVerification] Verification code sent successfully");
      return {
        success: true,
        message: "Verification code sent successfully",
      };
    } catch (error) {
      console.error(
        "❌ [PhoneVerification] Error in sendVerificationCode:",
        error,
      );
      console.error(
        "❌ [PhoneVerification] Error type:",
        error?.constructor?.name,
      );
      console.error(
        "❌ [PhoneVerification] Error message:",
        error instanceof Error ? error.message : String(error),
      );
      console.error(
        "❌ [PhoneVerification] Error stack:",
        error instanceof Error ? error.stack : "No stack",
      );

      if (error instanceof ValidationError || error instanceof AppError) {
        console.log(
          "📱 [PhoneVerification] Re-throwing ValidationError/AppError",
        );
        throw error;
      }

      console.log("❌ [PhoneVerification] Wrapping unknown error in AppError");
      throw new AppError(
        `Failed to send verification code: ${error instanceof Error ? error.message : "Unknown error"}`,
        500,
        "VERIFICATION_ERROR",
      );
    }
  }

  /**
   * Verify code for phone number
   */
  static async verifyCode(
    phone: string,
    code: string,
  ): Promise<{
    success: boolean;
    verified: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      // Normalize phone number
      const normalizedPhone = normalizePhoneNumber(phone);

      // Find active verification record
      const verification =
        (await PhoneVerification.findActiveVerification(normalizedPhone)) ||
        (await PhoneVerification.findOne({
          phone: normalizedPhone,
          verified: false,
          expiresAt: { $gt: new Date() },
          attemptCount: { $lt: MAX_ATTEMPTS_PER_CODE },
        }).sort({ createdAt: -1 }));

      if (!verification) {
        return {
          success: false,
          verified: false,
          error: "No valid verification code found. Please request a new code.",
        };
      }

      // Check if code is expired
      if (verification.isExpired()) {
        return {
          success: false,
          verified: false,
          error: "Verification code has expired. Please request a new code.",
        };
      }

      // Check max attempts
      if (verification.attemptCount >= MAX_ATTEMPTS_PER_CODE) {
        return {
          success: false,
          verified: false,
          error: "Too many verification attempts. Please request a new code.",
        };
      }

      // Verify code
      const isValid = await bcrypt.compare(code, verification.codeHash);

      // Increment attempt count
      await verification.incrementAttempt();

      if (!isValid) {
        const remainingAttempts =
          MAX_ATTEMPTS_PER_CODE - verification.attemptCount;
        return {
          success: false,
          verified: false,
          error: `Invalid verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt${remainingAttempts > 1 ? "s" : ""} remaining.` : "Please request a new code."}`,
        };
      }

      // Mark as verified
      await verification.markAsVerified();

      return {
        success: true,
        verified: true,
        message: "Phone number verified successfully",
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to verify code", 500, "VERIFICATION_ERROR");
    }
  }

  /**
   * Check if phone number has been verified recently (within last 10 minutes)
   */
  static async isPhoneVerified(
    phone: string,
    withinMinutes: number = 10,
  ): Promise<boolean> {
    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      const verified = await PhoneVerification.findVerifiedPhone(
        normalizedPhone,
        withinMinutes,
      );
      return !!verified;
    } catch (error) {
      console.error("Error checking phone verification:", error);
      return false;
    }
  }

  /**
   * Get verification status for a phone number
   */
  static async getVerificationStatus(phone: string): Promise<{
    isVerified: boolean;
    verifiedAt?: Date;
    canRequestNewCode: boolean;
    codesRemaining: number;
    nextCodeAvailableAt?: Date;
  }> {
    try {
      const normalizedPhone = normalizePhoneNumber(phone);

      // Check if verified
      const verified = await PhoneVerification.findVerifiedPhone(
        normalizedPhone,
        10,
      );

      // Check rate limiting
      const recentCodes = await PhoneVerification.countRecentCodes(
        normalizedPhone,
        60,
      );
      const codesCount =
        typeof recentCodes === "number"
          ? recentCodes
          : await PhoneVerification.countDocuments({
              phone: normalizedPhone,
              createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
            });
      const canRequestNewCode = codesCount < MAX_CODES_PER_HOUR;

      // Calculate next available code time
      const oldestCode = await PhoneVerification.findOne({
        phone: normalizedPhone,
      }).sort({ createdAt: 1 });

      let nextCodeAvailableAt: Date | undefined;
      if (oldestCode && !canRequestNewCode) {
        const oldestCodeTime = oldestCode.createdAt.getTime();
        const oneHourLater = oldestCodeTime + 60 * 60 * 1000;
        nextCodeAvailableAt = new Date(oneHourLater);
      }

      return {
        isVerified: !!verified,
        verifiedAt: verified?.verifiedAt,
        canRequestNewCode,
        codesRemaining: Math.max(0, MAX_CODES_PER_HOUR - codesCount),
        nextCodeAvailableAt,
      };
    } catch (error) {
      console.error("Error getting verification status:", error);
      return {
        isVerified: false,
        canRequestNewCode: false,
        codesRemaining: 0,
      };
    }
  }

  /**
   * Cleanup expired verification records
   */
  static async cleanupExpired(): Promise<number> {
    try {
      const result = await PhoneVerification.cleanupExpired();
      return result.deletedCount || 0;
    } catch (error) {
      console.error("Error cleaning up expired verifications:", error);
      return 0;
    }
  }
}

export default PhoneVerificationService;
