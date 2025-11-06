import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import User from '@/models/User';
import { z } from 'zod';

const checkStatusSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone must be provided'
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = checkStatusSchema.parse(body);

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

    const orConditions = [];
    if (validated.email) {
      orConditions.push({ email: validated.email.toLowerCase().trim() });
    }
    if (validated.phone) {
      orConditions.push({ phone: query.phone });
    }

    const user = await DatabaseService.findOne(
      User,
      { $or: orConditions },
      { select: { emailVerified: 1, phoneVerified: 1 } }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      emailVerified: user.emailVerified || false,
      phoneVerified: user.phoneVerified || false
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: error.issues[0]?.message || 'Invalid request data'
        },
        { status: 400 }
      );
    }

    console.error('Error checking verification status:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check verification status'
      },
      { status: 500 }
    );
  }
}

