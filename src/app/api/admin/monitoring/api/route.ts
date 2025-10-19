import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminWithSession } from '@/lib/auth/session-auth-middleware';

/**
 * API Performance Monitoring API Endpoint
 * 
 * Provides comprehensive API monitoring including:
 * - Response time tracking for all endpoints
 * - Request volume and throughput
 * - Error rates and status codes
 * - Endpoint health status
 * - Performance trends and analytics
 */

interface APIMetrics {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  requestsPerMinute: number;
  uptime: number;
  slowEndpoints: number;
  totalErrors: number;
  successRate: number;
}

interface EndpointPerformance {
  endpoint: string;
  method: string;
  responseTime: number;
  requestCount: number;
  errorCount: number;
  status: 'healthy' | 'degraded' | 'down';
  lastRequest: Date;
  averageResponseTime: number;
  successRate: number;
}

interface RequestLog {
  id: string;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  userAgent: string;
  ipAddress: string;
  error?: string;
}

interface StatusCodeDistribution {
  code: number;
  count: number;
  percentage: number;
  description: string;
}

// Mock data - in production, this would come from your API monitoring system
let mockMetrics: APIMetrics = {
  totalRequests: 0,
  averageResponseTime: 0,
  errorRate: 0,
  requestsPerMinute: 0,
  uptime: 0,
  slowEndpoints: 0,
  totalErrors: 0,
  successRate: 0
};

let mockEndpoints: EndpointPerformance[] = [];
let mockRequests: RequestLog[] = [];
let mockStatusCodes: StatusCodeDistribution[] = [];

// Initialize mock data
function initializeMockData() {
  if (mockEndpoints.length === 0) {
    // Generate mock endpoints
    const endpointData = [
      { endpoint: '/api/auth/login', method: 'POST', baseResponseTime: 150 },
      { endpoint: '/api/auth/signup', method: 'POST', baseResponseTime: 200 },
      { endpoint: '/api/transfers', method: 'GET', baseResponseTime: 100 },
      { endpoint: '/api/transfers', method: 'POST', baseResponseTime: 300 },
      { endpoint: '/api/users', method: 'GET', baseResponseTime: 120 },
      { endpoint: '/api/notifications', method: 'GET', baseResponseTime: 80 },
      { endpoint: '/api/admin/monitoring/system', method: 'GET', baseResponseTime: 250 },
      { endpoint: '/api/admin/monitoring/sse', method: 'GET', baseResponseTime: 180 },
      { endpoint: '/api/admin/monitoring/database', method: 'GET', baseResponseTime: 400 },
      { endpoint: '/api/admin/monitoring/api', method: 'GET', baseResponseTime: 220 }
    ];

    mockEndpoints = endpointData.map(ep => ({
      endpoint: ep.endpoint,
      method: ep.method,
      responseTime: ep.baseResponseTime + Math.random() * 100,
      requestCount: Math.floor(Math.random() * 1000) + 100,
      errorCount: Math.floor(Math.random() * 20),
      status: Math.random() > 0.1 ? 'healthy' : (Math.random() > 0.5 ? 'degraded' : 'down'),
      lastRequest: new Date(Date.now() - Math.random() * 3600000),
      averageResponseTime: ep.baseResponseTime + Math.random() * 50,
      successRate: 85 + Math.random() * 15
    }));

    // Generate mock requests
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const statusCodes = [200, 201, 400, 401, 403, 404, 500, 502, 503];
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      'PostmanRuntime/7.28.4',
      'curl/7.68.0'
    ];

    mockRequests = Array.from({ length: 100 }, (_, i) => {
      const endpoint = endpointData[Math.floor(Math.random() * endpointData.length)];
      const method = methods[Math.floor(Math.random() * methods.length)];
      const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
      const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      return {
        id: `req_${i}`,
        endpoint: endpoint.endpoint,
        method,
        responseTime: endpoint.baseResponseTime + Math.random() * 200,
        statusCode,
        timestamp: new Date(Date.now() - Math.random() * 3600000),
        userAgent,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        error: statusCode >= 400 ? `Error ${statusCode}` : undefined
      };
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Generate status code distribution
    const statusCodeCounts = mockRequests.reduce((acc, req) => {
      acc[req.statusCode] = (acc[req.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const totalRequests = mockRequests.length;
    mockStatusCodes = Object.entries(statusCodeCounts).map(([code, count]) => ({
      code: parseInt(code),
      count,
      percentage: (count / totalRequests) * 100,
      description: getStatusCodeDescription(parseInt(code))
    })).sort((a, b) => b.count - a.count);
  }
}

function getStatusCodeDescription(code: number): string {
  const descriptions: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable'
  };
  return descriptions[code] || 'Unknown';
}

function calculateMetrics(endpoints: EndpointPerformance[], requests: RequestLog[]): APIMetrics {
  const totalRequests = requests.length;
  const averageResponseTime = totalRequests > 0 
    ? requests.reduce((sum, req) => sum + req.responseTime, 0) / totalRequests 
    : 0;
  
  const errorCount = requests.filter(req => req.statusCode >= 400).length;
  const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
  const successRate = 100 - errorRate;
  
  const slowEndpoints = endpoints.filter(ep => ep.averageResponseTime > 500).length;
  
  // Calculate requests per minute (simplified)
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  const recentRequests = requests.filter(req => req.timestamp.getTime() > oneHourAgo);
  const requestsPerMinute = recentRequests.length / 60;

  return {
    totalRequests,
    averageResponseTime,
    errorRate,
    requestsPerMinute,
    uptime: 99.9, // Simulated uptime
    slowEndpoints,
    totalErrors: errorCount,
    successRate
  };
}

function simulateAPIActivity() {
  // Simulate new requests
  if (Math.random() < 0.4) { // 40% chance of new request
    const endpoint = mockEndpoints[Math.floor(Math.random() * mockEndpoints.length)];
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    const method = methods[Math.floor(Math.random() * methods.length)];
    const statusCodes = [200, 201, 400, 401, 404, 500];
    const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
    
    const newRequest: RequestLog = {
      id: `req_${Date.now()}`,
      endpoint: endpoint.endpoint,
      method,
      responseTime: endpoint.averageResponseTime + Math.random() * 100,
      statusCode,
      timestamp: new Date(),
      userAgent: 'Mozilla/5.0 (compatible; API Monitor)',
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      error: statusCode >= 400 ? `Error ${statusCode}` : undefined
    };
    
    mockRequests.unshift(newRequest);
    // Keep only the last 200 requests
    mockRequests = mockRequests.slice(0, 200);
    
    // Update endpoint metrics
    const endpointIndex = mockEndpoints.findIndex(ep => ep.endpoint === endpoint.endpoint);
    if (endpointIndex !== -1) {
      mockEndpoints[endpointIndex].requestCount++;
      mockEndpoints[endpointIndex].lastRequest = new Date();
      if (statusCode >= 400) {
        mockEndpoints[endpointIndex].errorCount++;
      }
      
      // Recalculate success rate
      const ep = mockEndpoints[endpointIndex];
      ep.successRate = ((ep.requestCount - ep.errorCount) / ep.requestCount) * 100;
      
      // Update status based on success rate
      if (ep.successRate < 90) {
        ep.status = 'degraded';
      } else if (ep.successRate < 70) {
        ep.status = 'down';
      } else {
        ep.status = 'healthy';
      }
    }
  }
  
  // Simulate some endpoint status changes
  mockEndpoints.forEach(endpoint => {
    if (Math.random() < 0.05) { // 5% chance of status change
      if (endpoint.status === 'healthy' && Math.random() < 0.1) {
        endpoint.status = 'degraded';
      } else if (endpoint.status === 'degraded' && Math.random() < 0.3) {
        endpoint.status = 'healthy';
      }
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    // Check super admin permissions
    const authResult = await requireSuperAdminWithSession(request);
    if (!authResult.success) {
      return authResult.response;
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '1h';
    const endpoint = searchParams.get('endpoint') || 'all';

    // Initialize mock data if needed
    initializeMockData();
    
    // Simulate some API activity
    simulateAPIActivity();

    // Calculate metrics
    const metrics = calculateMetrics(mockEndpoints, mockRequests);

    // Filter requests based on time range
    const now = Date.now();
    let timeFilter = 3600000; // 1 hour default
    
    switch (timeRange) {
      case '6h': timeFilter = 6 * 3600000; break;
      case '24h': timeFilter = 24 * 3600000; break;
      case '7d': timeFilter = 7 * 24 * 3600000; break;
    }
    
    const filteredRequests = mockRequests.filter(req => 
      req.timestamp.getTime() > (now - timeFilter)
    );

    // Filter by endpoint if specified
    const filteredEndpoints = endpoint === 'all' 
      ? mockEndpoints 
      : mockEndpoints.filter(ep => ep.endpoint === endpoint);

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        endpoints: filteredEndpoints,
        recentRequests: filteredRequests.slice(0, 50), // Return only the 50 most recent
        statusCodes: mockStatusCodes
      }
    });

  } catch (error) {
    console.error('API monitoring error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve API metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
