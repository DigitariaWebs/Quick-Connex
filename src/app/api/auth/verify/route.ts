import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import dbConnect from '@/lib/database/mongoose';
import User from '@/models/User';

export async function GET() {
  try {
    // Get current user from JWT token
    const tokenPayload = await getCurrentUser();
    
    if (!tokenPayload) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Connect to database and get fresh user data
    await dbConnect();
    const user = await User.findById(tokenPayload.userId).select('-password');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: user.toObject()
    });
  } catch (error) {
    console.error('❌ API: User verification failed:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
}
