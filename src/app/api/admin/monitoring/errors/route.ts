import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

/**
 * Error Logs Monitoring API Endpoint
 * 
 * Provides comprehensive error logging and analysis including:
 * - Real-time error streaming
 * - Error categorization and filtering
 * - Stack trace viewing
 * - Error frequency analysis
 * - Search and filtering capabilities
 */

interface ErrorLog {
  id: string;
  timestamp: Date;
  level: 'error' | 'warning' | 'info' | 'debug';
  category: 'api' | 'database' | 'auth' | 'sse' | 'system' | 'client';
  message: string;
  stack?: string;
  source: string;
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  userAgent: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  resolved: boolean;
  tags: string[];
}

interface ErrorStats {
  totalErrors: number;
  errorsLast24h: number;
  errorsLastHour: number;
  criticalErrors: number;
  resolvedErrors: number;
  errorRate: number;
  topCategories: Array<{ category: string; count: number; percentage: number }>;
  topSources: Array<{ source: string; count: number; percentage: number }>;
}

// Mock data - in production, this would come from your error logging system
let mockErrors: ErrorLog[] = [];
let mockStats: ErrorStats = {
  totalErrors: 0,
  errorsLast24h: 0,
  errorsLastHour: 0,
  criticalErrors: 0,
  resolvedErrors: 0,
  errorRate: 0,
  topCategories: [],
  topSources: []
};

// Initialize mock data
function initializeMockData() {
  if (mockErrors.length === 0) {
    const errorMessages = [
      'Database connection timeout',
      'Invalid authentication token',
      'SSE connection lost',
      'API rate limit exceeded',
      'File upload failed',
      'Email delivery failed',
      'Memory allocation error',
      'Database query timeout',
      'User session expired',
      'Invalid request parameters',
      'Network connection error',
      'SSL certificate expired',
      'Database deadlock detected',
      'Out of memory error',
      'File system permission denied'
    ];

    const sources = [
      'auth-middleware.ts',
      'database-connection.ts',
      'sse-manager.ts',
      'api-handler.ts',
      'email-service.ts',
      'file-upload.ts',
      'user-service.ts',
      'notification-service.ts',
      'system-monitor.ts',
      'error-handler.ts'
    ];

    const categories = ['api', 'database', 'auth', 'sse', 'system', 'client'];
    const levels = ['error', 'warning', 'info', 'debug'];
    const users = [
      { id: '1', email: 'admin@example.com' },
      { id: '2', email: 'nurse@example.com' },
      { id: '3', email: 'doctor@example.com' },
      { id: '4', email: 'manager@example.com' }
    ];

    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      'PostmanRuntime/7.28.4',
      'curl/7.68.0'
    ];

    // Generate mock errors
    mockErrors = Array.from({ length: 100 }, (_, i) => {
      const level = levels[Math.floor(Math.random() * levels.length)] as any;
      const category = categories[Math.floor(Math.random() * categories.length)] as any;
      const message = errorMessages[Math.floor(Math.random() * errorMessages.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 3600000); // Random time within last 7 days
      const resolved = Math.random() > 0.7; // 30% chance of being resolved
      
      return {
        id: `error_${i}`,
        timestamp,
        level,
        category,
        message,
        stack: level === 'error' ? generateStackTrace(source) : undefined,
        source,
        userId: user.id,
        userEmail: user.email,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent,
        requestId: `req_${Math.random().toString(36).substr(2, 9)}`,
        endpoint: Math.random() > 0.5 ? `/api/${category}/endpoint` : undefined,
        method: Math.random() > 0.5 ? ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)] : undefined,
        statusCode: Math.random() > 0.5 ? [200, 400, 401, 403, 404, 500][Math.floor(Math.random() * 6)] : undefined,
        resolved,
        tags: generateTags(level, category)
      };
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Calculate stats
    calculateStats();
  }
}

function generateStackTrace(source: string): string {
  return `Error: Database connection timeout
    at DatabaseConnection.connect (${source}:45:12)
    at async UserService.findById (user-service.ts:23:8)
    at async AuthMiddleware.authenticate (auth-middleware.ts:15:20)
    at async APIHandler.handleRequest (api-handler.ts:67:15)
    at async RequestHandler.process (request-handler.ts:34:9)
    at async Server.handleRequest (server.ts:123:45)`;
}

function generateTags(level: string, category: string): string[] {
  const tags = [];
  
  if (level === 'error') tags.push('critical');
  if (category === 'database') tags.push('db', 'connection');
  if (category === 'auth') tags.push('security', 'authentication');
  if (category === 'api') tags.push('endpoint', 'request');
  if (category === 'sse') tags.push('realtime', 'connection');
  if (category === 'system') tags.push('infrastructure', 'monitoring');
  
  return tags;
}

function calculateStats() {
  const now = Date.now();
  const last24h = now - 24 * 3600000;
  const lastHour = now - 3600000;
  
  const totalErrors = mockErrors.length;
  const errorsLast24h = mockErrors.filter(e => e.timestamp.getTime() > last24h).length;
  const errorsLastHour = mockErrors.filter(e => e.timestamp.getTime() > lastHour).length;
  const criticalErrors = mockErrors.filter(e => e.level === 'error').length;
  const resolvedErrors = mockErrors.filter(e => e.resolved).length;
  
  // Calculate error rate (simplified)
  const errorRate = (criticalErrors / totalErrors) * 100;
  
  // Calculate top categories
  const categoryCounts = mockErrors.reduce((acc, error) => {
    acc[error.category] = (acc[error.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topCategories = Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category,
      count,
      percentage: (count / totalErrors) * 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Calculate top sources
  const sourceCounts = mockErrors.reduce((acc, error) => {
    acc[error.source] = (acc[error.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topSources = Object.entries(sourceCounts)
    .map(([source, count]) => ({
      source,
      count,
      percentage: (count / totalErrors) * 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  mockStats = {
    totalErrors,
    errorsLast24h,
    errorsLastHour,
    criticalErrors,
    resolvedErrors,
    errorRate,
    topCategories,
    topSources
  };
}

function simulateNewErrors() {
  // Simulate new errors occasionally
  if (Math.random() < 0.3) { // 30% chance of new error
    const errorMessages = [
      'New database connection error',
      'API endpoint timeout',
      'SSE connection dropped',
      'Authentication failure',
      'Memory leak detected',
      'File system error',
      'Network timeout',
      'Database deadlock',
      'SSL handshake failed',
      'Rate limit exceeded'
    ];
    
    const categories = ['api', 'database', 'auth', 'sse', 'system', 'client'];
    const levels = ['error', 'warning', 'info'];
    const sources = [
      'auth-middleware.ts',
      'database-connection.ts',
      'sse-manager.ts',
      'api-handler.ts',
      'email-service.ts'
    ];
    
    const level = levels[Math.floor(Math.random() * levels.length)] as any;
    const category = categories[Math.floor(Math.random() * categories.length)] as any;
    const message = errorMessages[Math.floor(Math.random() * errorMessages.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    
    const newError: ErrorLog = {
      id: `error_${Date.now()}`,
      timestamp: new Date(),
      level,
      category,
      message,
      stack: level === 'error' ? generateStackTrace(source) : undefined,
      source,
      userId: '1',
      userEmail: 'admin@example.com',
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (compatible; Error Monitor)',
      requestId: `req_${Math.random().toString(36).substr(2, 9)}`,
      endpoint: `/api/${category}/endpoint`,
      method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
      statusCode: [200, 400, 401, 403, 404, 500][Math.floor(Math.random() * 6)],
      resolved: false,
      tags: generateTags(level, category)
    };
    
    mockErrors.unshift(newError);
    // Keep only the last 200 errors
    mockErrors = mockErrors.slice(0, 200);
    
    // Recalculate stats
    calculateStats();
  }
  
  // Simulate some errors being resolved
  mockErrors.forEach(error => {
    if (!error.resolved && Math.random() < 0.05) { // 5% chance of being resolved
      error.resolved = true;
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    // Check admin permissions
    const { user } = await AuthService.requireAuth(request, {
      roles: ['admin', 'super_admin'],
      requireSession: true
    });

    // Initialize mock data if needed
    initializeMockData();
    
    // Simulate some new errors
    simulateNewErrors();

    return NextResponse.json({
      success: true,
      data: {
        errors: mockErrors,
        stats: mockStats
      }
    });

  } catch (error) {
    console.error('Error logs monitoring API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve error logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
