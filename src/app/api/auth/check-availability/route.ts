import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import User from '@/models/User';
import { z } from 'zod';

// Validation schema
const checkAvailabilitySchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone must be provided'
});

// Rate limiting store (simple in-memory, can be upgraded to Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// Normalize phone number (same logic as AuthService)
function normalizePhoneNumber(phone: string): string {
  let normalized = phone.replace(/[^\d+]/g, '');
  if (!normalized.startsWith('+') && normalized.startsWith('1')) {
    normalized = '+' + normalized;
  } else if (!normalized.startsWith('+')) {
    normalized = '+1' + normalized;
  }
  return normalized;
}

// Normalize email
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Rate limit exceeded. Please wait a moment before checking again.'
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = checkAvailabilitySchema.parse(body);

    const results: { email?: boolean; phone?: boolean } = {};

    // Check email availability
    if (validated.email) {
      const normalizedEmail = normalizeEmail(validated.email);
      const existingEmail = await DatabaseService.findOne(
        User,
        { email: normalizedEmail },
        { projection: { _id: 1 } }
      );
      results.email = !existingEmail; // true if available, false if exists
    }

    // Check phone availability
    if (validated.phone) {
      const normalizedPhone = normalizePhoneNumber(validated.phone);
      const existingPhone = await DatabaseService.findOne(
        User,
        { phone: normalizedPhone },
        { projection: { _id: 1 } }
      );
      results.phone = !existingPhone; // true if available, false if exists
    }

    const response: { success: true; email?: boolean; phone?: boolean } = {
      success: true
    };
    
    if (results.email !== undefined) {
      response.email = results.email;
    }
    if (results.phone !== undefined) {
      response.phone = results.phone;
    }
    
    return NextResponse.json(response);

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

    console.error('Error checking availability:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check availability'
      },
      { status: 500 }
    );
  }
}
