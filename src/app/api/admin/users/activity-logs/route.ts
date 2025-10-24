import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService, AuditLog } from '@/lib/database';
import { AuditCategory, ActorType } from '@/models/AuditLog';

/**
 * GET /api/admin/users/activity-logs
 * 
 * Get user activity logs with filtering and pagination
 * Query params: userId (optional), startDate, endDate, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const skip = (page - 1) * limit;
    
    const userId = searchParams.get('userId');
    const category = searchParams.get('category') as AuditCategory;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const outcome = searchParams.get('outcome');
    
    // Build query
    const query: any = {};
    
    if (userId) {
      query.$or = [
        { actorId: userId },
        { 'targetResource.id': userId }
      ];
    }
    
    if (category) query.category = category;
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
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}















