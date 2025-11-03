import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { EmailVerificationService } from '@/lib/auth/email-verification/EmailVerificationService';
import { handleAuthError } from '@/lib/auth';
import { z } from 'zod';

// Validation schema
const verifyCodeSchema = z.object({
  email: z.string().email('Invalid email format').min(1, 'Email is required'),
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Verification code must contain only digits')
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const validated = verifyCodeSchema.parse(body);
    
    // Verify code
    const result = await EmailVerificationService.verifyCode(
      validated.email,
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
      message: result.message || 'Email address verified successfully'
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          verified: false,
          error: error.errors[0]?.message || 'Invalid request data'
        },
        { status: 400 }
      );
    }
    
    return handleAuthError(error);
  }
}

