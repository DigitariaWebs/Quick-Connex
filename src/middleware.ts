import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

// Log when middleware is loaded
console.log('🔧 Middleware: Turbopack middleware loaded');

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Log requests in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`🌐 Request: ${request.method} ${pathname}`);
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/', '/approval-success', '/approval-error', '/template-manager'];
  const isPublicRoute = publicRoutes.includes(pathname);
  
  // Admin routes that require admin role
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

  // API routes that don't require authentication
  const publicApiRoutes = ['/api/auth/login', '/api/auth/signup', '/api/auth/gmail', '/api/auth/approve-user', '/api/auth/signup-approval', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/files', '/api/hospitals', '/api/templates', '/api/ciusss'];
  
  // Check for specific transfer approval/rejection endpoints
  const isTransferApprovalRoute = pathname.match(/^\/api\/transfers\/[^\/]+\/(approve|reject)$/);
  const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route));

  // Skip authentication for public routes and API routes
  if (isPublicRoute || isPublicApiRoute || isTransferApprovalRoute) {
    return NextResponse.next();
  }

  // Get token from cookies
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Redirect to login if no token
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Verify the token
    const payload = await verifyToken(token);
    
    if (!payload) {
      // Invalid token
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Check admin routes - require admin or super_admin role
    if (isAdminRoute) {
      const isAdmin = payload.userType === 'admin' || payload.userType === 'super_admin';
      
      if (!isAdmin) {
        console.log(`⛔ Admin route access denied for user ${payload.email} (role: ${payload.userType})`);
        
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Admin access required',
              code: 'ADMIN_REQUIRED',
              message: 'You must be an administrator to access this resource'
            },
            { status: 403 }
          );
        }
        
        // Redirect non-admin users trying to access admin pages
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      
      console.log(`✅ Admin route access granted for ${payload.email}`);
    }

    // Add user info to headers for API routes
    if (pathname.startsWith('/api/')) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.userId);
      requestHeaders.set('x-user-type', payload.userType);
      requestHeaders.set('x-user-email', payload.email);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware authentication error:', error);
    
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
