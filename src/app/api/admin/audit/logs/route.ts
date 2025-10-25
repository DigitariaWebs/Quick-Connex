import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import AuditLog, { AuditCategory, ActorType, RiskLevel } from '@/models/AuditLog';

/**
 * GET /api/admin/audit/logs
 * 
 * Get admin audit logs with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const skip = (page - 1) * limit;
    
    const category = searchParams.get('category') as AuditCategory;
    const actorType = searchParams.get('actorType') as ActorType;
    const riskLevel = searchParams.get('riskLevel') as RiskLevel;
    const actorId = searchParams.get('actorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const isSensitive = searchParams.get('isSensitive') === 'true';
    const requiresReview = searchParams.get('requiresReview') === 'true';
    const outcome = searchParams.get('outcome');
    
    // Build query
    const query: any = {};
    
    if (category) query.category = category;
    if (actorType) query.actorType = actorType;
    if (riskLevel) query['securityContext.riskLevel'] = riskLevel;
    if (actorId) query.actorId = actorId;
    if (isSensitive) query['securityContext.isSensitive'] = true;
    if (requiresReview) query['securityContext.requiresReview'] = true;
    if (outcome) query.outcome = outcome;
    
    // Date range filtering
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Execute query with pagination
    const [logs, total] = await Promise.all([
      DatabaseService.findMany(AuditLog, query, {
        sort: { timestamp: -1 },
        skip: skip,
        limit: limit
      }),
      DatabaseService.count(AuditLog, query)
    ]);
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}















