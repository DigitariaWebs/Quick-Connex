import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = process.env.JWT_SECRET_KEY;
const encodedKey = new TextEncoder().encode(secretKey);

export interface JWTPayload {
  userId: string;
  email: string;
  userType: 'employee' | 'manager' | 'admin' | 'super_admin';
  sessionId?: string; // Session ID for session validation
  iat?: number;
  exp?: number;
}

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  if (!secretKey) {
    throw new Error('JWT_SECRET_KEY environment variable is not set');
  }

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Token expires in 24 hours
    .sign(encodedKey);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  if (!secretKey) {
    throw new Error('JWT_SECRET_KEY environment variable is not set');
  }

  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export async function getTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('auth-token')?.value || null;
}

export async function setAuthCookie(token: string): Promise<NextResponse> {
  try {
    console.log('🍪 Setting auth cookie with token:', token.substring(0, 20) + '...');
    
    const response = NextResponse.next();
    
    // Set secure HTTP-only cookie with proper configuration
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
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

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const token = await getTokenFromCookies();
  if (!token) return null;
  
  return await verifyToken(token);
}

// Enhanced session-aware user verification using unified validator
export async function getCurrentUserWithSession(): Promise<{
  user: JWTPayload | null;
  session: any | null;
  isValid: boolean;
}> {
  try {
    console.log('🔍 JWT: Starting session verification...');
    
    // Get token from cookies
    const token = await getTokenFromCookies();
    if (!token) {
      console.log('🔒 JWT: No token found in cookies');
      return { user: null, session: null, isValid: false };
    }
    
    console.log('🔍 JWT: Token found, verifying...');
    
    // Verify JWT token
    const payload = await verifyToken(token);
    if (!payload) {
      console.log('🔒 JWT: Token verification failed');
      return { user: null, session: null, isValid: false };
    }
    
    console.log('🔍 JWT: Token verified, payload:', payload);
    
    // If we have a session ID, verify the session
    if (payload.sessionId) {
      console.log('🔍 JWT: Verifying session:', payload.sessionId);
      
      try {
        const { default: dbConnect } = await import('@/lib/database/mongoose');
        const { default: Session } = await import('@/models/Session');
        
        await dbConnect();
        
        const session = await Session.findOne({ 
          sessionId: payload.sessionId,
          isActive: true,
          revoked: false,
          expiresAt: { $gt: new Date() }
        });
        
        if (!session) {
          console.log('🔒 JWT: Session not found or expired');
          return { user: null, session: null, isValid: false };
        }
        
        console.log('✅ JWT: Session verified successfully');
        
        return { 
          user: payload, 
          session: session, 
          isValid: true 
        };
      } catch (sessionError) {
        console.error('❌ JWT: Session verification error:', sessionError);
        return { user: null, session: null, isValid: false };
      }
    }
    
    // If no session ID, just return the user
    console.log('✅ JWT: User verified successfully (no session)');
    return { 
      user: payload, 
      session: null, 
      isValid: true 
    };
  } catch (error) {
    console.error('❌ JWT: Session validation error:', error);
    return { user: null, session: null, isValid: false };
  }
}
