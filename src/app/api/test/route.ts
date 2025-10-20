import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    status: 'ok'
  });
}

