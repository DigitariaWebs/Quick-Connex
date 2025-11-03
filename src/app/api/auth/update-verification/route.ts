import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import User from '@/models/User';
import { z } from 'zod';

const updateVerificationSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  type: z.enum(['email', 'phone']),
  verified: z.boolean()
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone must be provided'
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = updateVerificationSchema.parse(body);

    const updateData: any = {};
    if (validated.type === 'email') {
      updateData.emailVerified = validated.verified;
      if (validated.verified) {
        updateData.emailVerifiedAt = new Date();
      }
    } else {
      updateData.phoneVerified = validated.verified;
      if (validated.verified) {
        updateData.phoneVerifiedAt = new Date();
      }
    }

    const query: any = {};
    if (validated.email) {
      query.email = validated.email.toLowerCase().trim();
    }
    if (validated.phone) {
      // Normalize phone number
      let normalized = validated.phone.replace(/[^\d+]/g, '');
      if (!normalized.startsWith('+') && normalized.startsWith('1')) {
        normalized = '+' + normalized;
      } else if (!normalized.startsWith('+')) {
        normalized = '+1' + normalized;
      }
      query.phone = normalized;
    }

    const user = await DatabaseService.updateOne(
      User,
      query,
      updateData
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${validated.type} verification status updated`
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues && error.issues.length > 0 
        ? error.issues[0]?.message 
        : 'Invalid request data';
      return NextResponse.json(
        { 
          success: false,
          error: errorMessage || 'Invalid request data'
        },
        { status: 400 }
      );
    }

    console.error('Error updating verification status:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update verification status'
      },
      { status: 500 }
    );
  }
}

