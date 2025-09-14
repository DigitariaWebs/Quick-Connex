import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import { testDatabaseConnection, logStartupInfo } from '@/lib/db-test';

export async function GET() {
  try {
    console.log('🧪 API: Database connection test requested');
    
    // Log startup info
    logStartupInfo();
    
    // Test the connection
    const isConnected = await testDatabaseConnection();
    
    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: 'Database connection successful',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Database connection failed',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ API: Database test failed:', error);
    return NextResponse.json({
      success: false,
      message: 'Database test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
