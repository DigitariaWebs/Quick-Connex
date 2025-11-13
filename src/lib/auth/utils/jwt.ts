/**
 * JWT Utilities
 * 
 * Core JWT functions for token creation and verification.
 * Simplified from the original scattered JWT logic.
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { TokenPayload } from '../core/types';

// Memoize secret key and encoded key to avoid repeated process.env reads
let cachedSecretKey: string | undefined = undefined;
let cachedEncodedKey: Uint8Array | null = null;

function getSecretKey(): string | undefined {
  if (cachedSecretKey === undefined) {
    cachedSecretKey = process.env.JWT_SECRET_KEY;
  }
  return cachedSecretKey;
}

function getEncodedKey(): Uint8Array {
  if (cachedEncodedKey === null) {
    const secretKey = getSecretKey();
    cachedEncodedKey = new TextEncoder().encode(secretKey);
  }
  return cachedEncodedKey;
}

/**
 * Sign a JWT token
 */
export async function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    throw new Error('JWT_SECRET_KEY environment variable is not set');
  }

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Token expires in 24 hours
    .sign(getEncodedKey());
}

/**
 * Verify a JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    console.error('JWT_SECRET_KEY environment variable is not set');
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getEncodedKey(), {
      algorithms: ['HS256'],
    });
    return payload as unknown as TokenPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Get token from cookies
 */
export async function getTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('auth-token')?.value || null;
  } catch (error) {
    console.error('Error getting token from cookies:', error);
    return null;
  }
}

/**
 * Set authentication cookie
 */
export async function setAuthCookie(token: string): Promise<NextResponse> {
  try {
    console.log('🍪 Setting auth cookie with token:', token.substring(0, 20) + '...');
    
    const response = NextResponse.next();
    
    // Set secure HTTP-only cookie with proper configuration
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
    });
    
    console.log('✅ Auth cookie set successfully');
    return response;
    
  } catch (error) {
    console.error('❌ Failed to set auth cookie:', error);
    throw new Error('Failed to set authentication cookie');
  }
}

/**
 * Clear authentication cookie
 */
export async function clearAuthCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');
  } catch (error) {
    console.error('❌ Failed to clear auth cookie:', error);
  }
}
