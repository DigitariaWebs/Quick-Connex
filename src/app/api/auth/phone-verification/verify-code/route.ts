import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PhoneVerificationService } from '@/lib/auth/phone-verification/PhoneVerificationService';
import { handleAuthError } from '@/lib/auth';
import { z } from 'zod';

// Validation schema
const verifyCodeSchema = z.object({
  phone: z.string().min(7, 'Phone number is required').max(20, 'Phone number too long').regex(/^\+?[0-9]+$/, 'Invalid phone number format'),
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Verification code must contain only digits')
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const validated = verifyCodeSchema.parse(body);
    
    // Verify code
    const result = await PhoneVerificationService.verifyCode(
      validated.phone,
      validated.code
    );
    
    if (!result.success || !result.verified) {
      return NextResponse.json(
        { 
          success: false,
          verified: false,
          error: result.error || 'Verification failed'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      verified: true,
      message: result.message || 'Phone number verified successfully'
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues && error.issues.length > 0 
        ? error.issues[0]?.message 
        : 'Invalid request data';
      return NextResponse.json(
        { 
          success: false,
          verified: false,
          error: errorMessage || 'Invalid request data'
        },
        { status: 400 }
      );
    }
    
    return handleAuthError(error);
  }
}

