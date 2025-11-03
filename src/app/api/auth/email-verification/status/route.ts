import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { EmailVerificationService } from '@/lib/auth/email-verification/EmailVerificationService';
import { handleAuthError } from '@/lib/auth';
import { z } from 'zod';

// Validation schema
const statusSchema = z.object({
  email: z.string().email('Invalid email format').min(1, 'Email is required')
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const validated = statusSchema.parse(body);
    
    // Get verification status
    const status = await EmailVerificationService.getVerificationStatus(validated.email);
    
    return NextResponse.json({
      success: true,
      ...status
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
    
    return handleAuthError(error);
  }
}

