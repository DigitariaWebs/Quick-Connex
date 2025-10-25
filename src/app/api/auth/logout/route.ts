import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { clearAuthCookie, getTokenFromCookies, handleAuthError } from '@/lib/auth';

export async function POST() {
  try {
    console.log('🚪 Logout: Starting logout process');
    
    // Get token to find session ID
    const token = await getTokenFromCookies();
    let sessionId: string | undefined;
    
    if (token) {
      // Verify token to get session ID
      const { verifyToken } = await import('@/lib/auth');
      const payload = await verifyToken(token);
      sessionId = payload?.sessionId;
    }
    
    if (sessionId) {
      console.log('🚪 Logout: Found session ID:', sessionId);
      
      // Use AuthService for logout
      const logoutResult = await AuthService.logout(sessionId);
      
      if (!logoutResult.success) {
        console.log('⚠️ Logout: Session revocation failed:', logoutResult.error);
      } else {
        console.log('✅ Logout: Session revoked successfully');
      }
    }
    
    // Clear the authentication cookie
    await clearAuthCookie();
    console.log('🚪 Logout: Cookie cleared');
    
    return NextResponse.json({
      message: 'Logout successful',
      success: true
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
