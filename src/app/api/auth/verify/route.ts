import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getTokenFromCookies } from '@/lib/auth/jwt-utils';
import { handleAuthError } from '@/lib/auth/auth-error-handler';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Starting user verification...');
    
    // First check if token exists
    const token = await getTokenFromCookies();
    if (!token) {
      console.log('🔍 API: No authentication token found');
      return NextResponse.json(
        { 
          success: false,
          error: 'Not authenticated',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }
    
    // Use AuthService for authentication
    const authContext = await AuthService.requireAuth(request, {
      requireSession: true
    });
    
    console.log('✅ API: User authenticated successfully');
    
    return NextResponse.json({
      success: true,
      user: authContext.user,
      session: authContext.session
    });
    
  } catch (error) {
    return handleAuthError(error);
  }
}