import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { EmailVerificationService } from '@/lib/auth/email-verification/EmailVerificationService';
import { extractIpAddress } from '@/lib/auth/utils/security';
import { handleAuthError } from '@/lib/auth';
import { z } from 'zod';

// Validation schema
const sendCodeSchema = z.object({
  email: z.string().email('Invalid email format').min(1, 'Email is required')
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const validated = sendCodeSchema.parse(body);
    
    // Extract IP address for rate limiting
    const ipAddress = extractIpAddress(request);
    
    // Send verification code
    const result = await EmailVerificationService.sendVerificationCode(
      validated.email,
      ipAddress
    );
    
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Failed to send verification code'
        },
        { status: 400 }
      );
    }
    
    // Get verification status for rate limiting info
    const status = await EmailVerificationService.getVerificationStatus(validated.email);
    
    return NextResponse.json({
      success: true,
      message: result.message || 'Verification code sent successfully',
      codesRemaining: status.codesRemaining,
      canRequestNewCode: status.canRequestNewCode
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: error.errors[0]?.message || 'Invalid request data'
        },
        { status: 400 }
      );
    }
    
    // Handle auth errors (rate limiting, etc.)
    return handleAuthError(error);
  }
}

