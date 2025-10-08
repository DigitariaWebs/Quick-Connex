import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth/jwt';

export async function POST() {
  try {
    // Clear the authentication cookie
    await clearAuthCookie();
    
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
