import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth';
import { handleAuthError } from '@/lib/auth/auth-error-handler';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Login: Starting login process');

    const body = await request.json();
    const loginResult = await AuthService.login(body, request);
    
    const response = NextResponse.json({
      message: 'Login successful',
      user: loginResult.user,
      session: loginResult.session
    });
    
    if (loginResult.token) {
      response.cookies.set('auth-token', loginResult.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60
      });
    }
    
    return response;
  } catch (error) {
    return handleAuthError(error);
  }
}