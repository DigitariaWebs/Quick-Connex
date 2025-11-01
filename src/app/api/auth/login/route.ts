import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth';
import { handleAuthError } from '@/lib/auth';
import { log } from '@/lib/logging';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || 'unknown';
  
  try {
    log.info('Login API request started', {
      operation: 'login_api',
      requestId,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    });

    const body = await request.json();
    const loginResult = await AuthService.login(body, request);
    
    const response = NextResponse.json({
      message: 'Login successful',
      user: loginResult.user,
      session: loginResult.session
    });
    
    if (loginResult.token) {
      // Set cookie with explicit configuration
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 24 * 60 * 60 // 24 hours
      };
      
      response.cookies.set('auth-token', loginResult.token, cookieOptions);
      
      // Verify cookie was set successfully
      const setCookie = response.cookies.get('auth-token');
      if (setCookie) {
        log.info('Auth cookie set successfully', {
          operation: 'login_cookie_set',
          requestId,
          userId: loginResult.user?._id,
          cookiePresent: true,
          cookieLength: loginResult.token.length
        });
      } else {
        log.error('Failed to set auth cookie', {
          operation: 'login_cookie_error',
          requestId,
          userId: loginResult.user?._id
        });
      }
    } else {
      log.warn('No token returned from login - cookie not set', {
        operation: 'login_no_token',
        requestId,
        userId: loginResult.user?._id
      });
    }
    
    const duration = Date.now() - startTime;
    log.info('Login API request completed successfully', {
      operation: 'login_api',
      requestId,
      duration,
      userId: loginResult.user?._id,
      cookieSet: !!loginResult.token
    });
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Login API request failed', error, {
      operation: 'login_api',
      requestId,
      duration
    });
    
    return handleAuthError(error);
  }
}