import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Log when middleware is loaded
console.log('🔧 Middleware: Turbopack middleware loaded');

export function middleware(request: NextRequest) {
  // Log requests in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`🌐 Request: ${request.method} ${request.nextUrl.pathname}`);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
