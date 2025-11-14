import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/utils/jwt';

// ===== TYPES =====
interface AuthPayload {
  userId: string;
  email: string;
  userType: 'employee' | 'manager' | 'admin' | 'super_admin';
  sessionId: string;
  iat: number;
  exp: number;
}

function isPublicRoute(pathname: string): boolean {
  const publicRoutes = ['/login', '/signup', '/signup/verify', '/forgot-password', '/reset-password', '/', '/approval-success', '/approval-error', '/template-manager'];
  return publicRoutes.includes(pathname);
}

function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
}

function isPublicApiRoute(pathname: string): boolean {
  const publicApiRoutes = ['/api/auth/login', '/api/auth/signup', '/api/auth/session/create', '/api/auth/verify', '/api/auth/gmail', '/api/auth/approve-user', '/api/auth/signup-approval', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/files', '/api/hospitals', '/api/templates', '/api/ciusss', '/api/test'];
  return publicApiRoutes.some(route => pathname.startsWith(route));
}

function isTransferApprovalRoute(pathname: string): boolean {
  return pathname.match(/^\/api\/transfers\/[^\/]+\/(approve|reject)$/) !== null;
}

function getLoginRedirectRoute(userType: string): string {
  switch (userType) {
    case 'super_admin':
    case 'admin':
      return '/admin/dashboard';
    case 'manager':
      return '/dashboard';
    case 'employee':
    default:
      return '/dashboard';
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files (images, uploads, etc.)
  if (
    pathname.startsWith('/images/') ||
    pathname.startsWith('/uploads/') ||
    pathname === '/sw.js' ||
    /\.(png|jpg|jpeg|gif|svg|ico|webp|pdf|css|js|woff|woff2|ttf|eot)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // For API routes, let them handle their own authentication
  if (pathname.startsWith('/api/')) {
    // Check if it's a public API route
    if (isPublicApiRoute(pathname) || isTransferApprovalRoute(pathname)) {
      return NextResponse.next();
    }
    // For protected API routes, they handle their own auth
    return NextResponse.next();
  }

  // Check for authentication token (even on public routes, to redirect authenticated users)
  const token = request.cookies.get('auth-token')?.value;
  let payload: AuthPayload | null = null;

  // If token exists, verify it (even for public routes)
  if (token) {
    try {
      const jwtPayload = await verifyToken(token);
      payload = jwtPayload ? {
        userId: jwtPayload.userId,
        email: jwtPayload.email,
        userType: jwtPayload.userType as AuthPayload['userType'],
        sessionId: jwtPayload.sessionId || '',
        iat: jwtPayload.iat || 0,
        exp: jwtPayload.exp || 0
      } : null;
    } catch (error) {
      // Token verification failed, but continue for public routes
      payload = null;
    }
  }

  // If user is authenticated and trying to access login page, redirect to dashboard
  if (pathname === '/login' && payload) {
    const redirectPath = getLoginRedirectRoute(payload.userType);
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // If route is public and user is not authenticated (or no token), allow access
  if (isPublicRoute(pathname) || isPublicApiRoute(pathname) || isTransferApprovalRoute(pathname)) {
    return NextResponse.next();
  }

  // For protected routes, require authentication
  if (!token) {
    console.log('🔍 Middleware: No auth-token cookie found', {
      pathname,
      cookiesPresent: Array.from(request.cookies.getAll()).map(c => c.name),
      userAgent: request.headers.get('user-agent')?.substring(0, 50)
    });
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!payload) {
    console.log('🔍 Middleware: Token verification failed - invalid payload', {
      pathname,
      tokenPresent: !!token,
      tokenLength: token.length
    });
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Check admin routes - require admin or super_admin role
  if (isAdminRoute(pathname)) {
    if (!['admin', 'super_admin'].includes(payload.userType)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * 
     * Note: Static files in /images/ and /uploads/ are handled in the middleware function itself
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
