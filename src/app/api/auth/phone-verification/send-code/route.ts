import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PhoneVerificationService } from '@/lib/auth/phone-verification/PhoneVerificationService';
import { extractIpAddress } from '@/lib/auth/utils/security';
import { handleAuthError } from '@/lib/auth';
import { z } from 'zod';

// Validation schema
const sendCodeSchema = z.object({
  phone: z.string().min(7, 'Phone number is required').max(15, 'Phone number too long')
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const validated = sendCodeSchema.parse(body);
    
    // Extract IP address for rate limiting
    const ipAddress = extractIpAddress(request);
    
    // Send verification code
    const result = await PhoneVerificationService.sendVerificationCode(
      validated.phone,
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
    const status = await PhoneVerificationService.getVerificationStatus(validated.phone);
    
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

