import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt-standalone';

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
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/', '/approval-success', '/approval-error', '/template-manager'];
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
      return '/manager';
    case 'employee':
    default:
      return '/dashboard';
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is public
  if (isPublicRoute(pathname) || isPublicApiRoute(pathname) || isTransferApprovalRoute(pathname)) {
    return NextResponse.next();
  }

  // For API routes, let them handle their own authentication
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // For page routes, do basic JWT verification only
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Only verify JWT token (no database calls)
    const jwtPayload = await verifyToken(token);
    const payload: AuthPayload | null = jwtPayload ? {
      userId: jwtPayload.userId,
      email: jwtPayload.email,
      userType: jwtPayload.userType as AuthPayload['userType'],
      sessionId: jwtPayload.sessionId || '',
      iat: jwtPayload.iat || 0,
      exp: jwtPayload.exp || 0
    } : null;
    
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Check admin routes - require admin or super_admin role
    if (isAdminRoute(pathname)) {
      if (!['admin', 'super_admin'].includes(payload.userType)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    
    // Check if user is trying to access login page while authenticated
    if (pathname === '/login' && payload) {
      // Redirect authenticated users to their appropriate dashboard
      const redirectPath = getLoginRedirectRoute(payload.userType);
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
    
    return NextResponse.next();
    
  } catch (error) {
    console.error('Middleware authentication error:', error);
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
