import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt-middleware';
import { getLoginRedirectRoute } from '@/lib/auth/user-routing';

// ===== TYPES =====
interface AuthPayload {
  userId: string;
  email: string;
  userType: 'employee' | 'manager' | 'admin' | 'super_admin';
  sessionId: string;
  iat: number;
  exp: number;
}

interface MiddlewareMetrics {
  requestId: string;
  pathname: string;
  method: string;
  startTime: number;
  authDuration?: number;
  totalDuration?: number;
  userType?: string;
  userId?: string;
  success: boolean;
  error?: string;
  source?: {
    userAgent?: string;
    referer?: string;
    origin?: string;
    xForwardedFor?: string;
    requestSource?: string;
    requestId?: string;
    requestType?: string;
  };
}

interface LogContext {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  requestId: string;
  pathname: string;
  method: string;
  userType?: string;
  userId?: string;
  duration?: number;
  error?: string;
  timestamp: string;
}

// ===== UTILITY FUNCTIONS =====
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createLogContext(
  level: LogContext['level'],
  message: string,
  requestId: string,
  pathname: string,
  method: string,
  metrics?: Partial<MiddlewareMetrics>
): LogContext {
  return {
    level,
    message,
    requestId,
    pathname,
    method,
    userType: metrics?.userType,
    userId: metrics?.userId,
    duration: metrics?.totalDuration,
    error: metrics?.error,
    timestamp: new Date().toISOString()
  };
}

function logStructured(context: LogContext): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(JSON.stringify(context, null, 2));
  } else {
    // In production, you might want to send to a logging service
    console.log(JSON.stringify(context));
  }
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

// Log when middleware is loaded
logStructured(createLogContext('info', 'Middleware loaded', 'system', 'system', 'SYSTEM'));

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  // Initialize metrics
  const metrics: MiddlewareMetrics = {
    requestId,
    pathname,
    method: request.method,
    startTime,
    success: false
  };

  // Extract source information from headers
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const referer = request.headers.get('referer') || 'unknown';
  const origin = request.headers.get('origin') || 'unknown';
  const xForwardedFor = request.headers.get('x-forwarded-for') || 'unknown';
  
  // Extract custom tracking headers
  const requestSource = request.headers.get('x-request-source') || 'unknown';
  const customRequestId = request.headers.get('x-request-id') || 'unknown';
  const requestType = request.headers.get('x-request-type') || 'unknown';
  
  // Log request start with enhanced source information
  logStructured(createLogContext('info', 'Request started', requestId, pathname, request.method, {
    ...metrics,
      source: {
        userAgent: userAgent.substring(0, 100), // Truncate for readability
        referer: referer,
        origin: origin,
        xForwardedFor: xForwardedFor,
        requestSource: requestSource,
        requestId: customRequestId,
        requestType: requestType
      }
  }));

  // Check if route is public
  if (isPublicRoute(pathname) || isPublicApiRoute(pathname) || isTransferApprovalRoute(pathname)) {
    metrics.success = true;
    metrics.totalDuration = Date.now() - startTime;
    
    logStructured(createLogContext('info', 'Public route accessed', requestId, pathname, request.method, metrics));
    return NextResponse.next();
  }

  // For API routes, let them handle their own authentication
  if (pathname.startsWith('/api/')) {
    metrics.success = true;
    metrics.totalDuration = Date.now() - startTime;
    
    // Enhanced logging for API routes with source tracking
    logStructured(createLogContext('info', 'API route - delegating to route handler', requestId, pathname, request.method, {
      ...metrics,
      source: {
        requestSource: requestSource,
        requestId: customRequestId,
        requestType: requestType,
        referer: referer
      }
    }));
    return NextResponse.next();
  }

  // For page routes, do basic JWT verification only
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    metrics.error = 'No token found';
    metrics.totalDuration = Date.now() - startTime;
    
    logStructured(createLogContext('warn', 'No token found, redirecting to login', requestId, pathname, request.method, metrics));
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const authStartTime = Date.now();
    
    logStructured(createLogContext('debug', 'Starting JWT verification', requestId, pathname, request.method, metrics));
    
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
    
    metrics.authDuration = Date.now() - authStartTime;
    
    if (!payload) {
      metrics.error = 'Invalid token';
      metrics.totalDuration = Date.now() - startTime;
      
      logStructured(createLogContext('warn', 'Invalid token, redirecting to login', requestId, pathname, request.method, metrics));
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Update metrics with user info
    metrics.userType = payload.userType;
    metrics.userId = payload.userId;
    
    logStructured(createLogContext('info', 'JWT verification successful', requestId, pathname, request.method, metrics));
    
    // Check admin routes - require admin or super_admin role
    if (isAdminRoute(pathname)) {
      if (!['admin', 'super_admin'].includes(payload.userType)) {
        metrics.error = 'Admin access denied';
        metrics.totalDuration = Date.now() - startTime;
        
        logStructured(createLogContext('warn', 'Admin access denied', requestId, pathname, request.method, metrics));
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      
      logStructured(createLogContext('info', 'Admin access granted', requestId, pathname, request.method, metrics));
    }
    
    // Check if user is trying to access login page while authenticated
    if (pathname === '/login' && payload) {
      // Redirect authenticated users to their appropriate dashboard
      const redirectPath = getLoginRedirectRoute(payload.userType);
      
      logStructured(createLogContext('info', 'Authenticated user accessing login, redirecting to dashboard', requestId, pathname, request.method, metrics));
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
    
    metrics.success = true;
    metrics.totalDuration = Date.now() - startTime;
    
    logStructured(createLogContext('info', 'Request completed successfully', requestId, pathname, request.method, metrics));
    return NextResponse.next();
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    metrics.error = errorMessage;
    metrics.totalDuration = Date.now() - startTime;
    
    logStructured(createLogContext('error', 'Middleware authentication error', requestId, pathname, request.method, metrics));
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
