import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PhoneVerificationService } from '@/lib/auth/phone-verification/PhoneVerificationService';
import { handleAuthError } from '@/lib/auth';
import { z } from 'zod';

// Validation schema
const statusSchema = z.object({
  phone: z.string().min(7, 'Phone number is required').max(15, 'Phone number too long')
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const validated = statusSchema.parse(body);
    
    // Get verification status
    const status = await PhoneVerificationService.getVerificationStatus(validated.phone);
    
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

