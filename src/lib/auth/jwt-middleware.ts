import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = process.env.JWT_SECRET_KEY;
const encodedKey = new TextEncoder().encode(secretKey);

export interface JWTPayload {
  userId: string;
  email: string;
  userType: 'employee' | 'manager' | 'admin' | 'super_admin';
  sessionId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Middleware-safe JWT verification
 * This version doesn't import any database models to work in Edge Runtime
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    if (!secretKey) {
      console.error('JWT_SECRET_KEY environment variable is not set');
      return null;
    }

    const { payload } = await jwtVerify(token, encodedKey);
    
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      userType: payload.userType as JWTPayload['userType'],
      sessionId: payload.sessionId as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Get token from cookies (middleware-safe)
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
