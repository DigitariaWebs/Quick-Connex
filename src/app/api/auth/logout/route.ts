import { NextResponse } from 'next/server';
import { clearAuthCookie, getCurrentUser } from '@/lib/auth/jwt';
import dbConnect from '@/lib/database/mongoose';

export async function POST() {
  try {
    console.log('🚪 Logout: Starting logout process');
    
    // Get current user to find session
    const tokenPayload = await getCurrentUser();
    
    if (tokenPayload && tokenPayload.sessionId) {
      console.log('🚪 Logout: Found session ID:', tokenPayload.sessionId);
      
      // Connect to database
      await dbConnect();
      
      // Import Session model
      const { default: Session } = await import('@/models/Session');
      
      // Invalidate the session
      await Session.updateOne(
        { sessionId: tokenPayload.sessionId },
        { 
          isActive: false,
          revoked: true,
          revokedAt: new Date(),
          revokedReason: 'User logout'
        }
      );
      
      console.log('🚪 Logout: Session invalidated in database');
    }
    
    // Clear the authentication cookie
    await clearAuthCookie();
    console.log('🚪 Logout: Cookie cleared');
    
    return NextResponse.json({
      message: 'Logout successful',
      success: true
    });
  } catch (error) {
    console.error('❌ API: Logout failed:', error);
    return NextResponse.json(
      { message: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
