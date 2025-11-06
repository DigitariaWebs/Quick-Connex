import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { DatabaseService } from '@/lib/database';
import AuditLog, { AuditCategory, AuditAction, RiskLevel } from '@/models/AuditLog';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { user } = await AuthService.requireAuth(request, {
      roles: ['admin', 'super_admin'],
      requireSession: true
    });
    
    // Parse query parameters
    const url = new URL(request.url);
    const eventType = url.searchParams.get('eventType');
    const severity = url.searchParams.get('severity');
    const userId = url.searchParams.get('userId');
    const ipAddress = url.searchParams.get('ipAddress');
    const resolved = url.searchParams.get('resolved');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    // Build query for security events
    const query: any = {
      $or: [
        { category: AuditCategory.SECURITY },
        { 
          category: AuditCategory.AUTHENTICATION, 
          'securityContext.requiresReview': true 
        },
        {
          'securityContext.isSensitive': true,
          'securityContext.riskLevel': { $in: [RiskLevel.HIGH, RiskLevel.CRITICAL] }
        }
      ]
    };
    
    // Apply filters
    if (resolved === 'false' || resolved === 'true') {
      query['resolution.resolved'] = resolved === 'true';
    }
    
    if (userId) {
      query.actorId = userId;
    }
    
    if (ipAddress) {
      query['requestInfo.ipAddress'] = ipAddress;
    }
    
    if (severity) {
      query['securityContext.riskLevel'] = severity;
    }
    
    if (eventType) {
      query.action = eventType;
    }
    
    // Date range filtering
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Execute query with pagination
    const [events, total] = await Promise.all([
      DatabaseService.findMany(AuditLog, query, {
        sort: { timestamp: -1 },
        skip: offset,
        limit
      }),
      DatabaseService.count(AuditLog, query)
    ]);
    
    // Format events for response
    const formattedEvents = events.map(event => ({
      _id: event._id,
      actorId: event.actorId,
      actorEmail: event.actorEmail,
      actorName: event.actorName,
      action: event.action,
      category: event.category,
      description: event.description,
      timestamp: event.timestamp,
      riskLevel: event.securityContext?.riskLevel,
      riskScore: event.securityContext?.riskScore,
      isSensitive: event.securityContext?.isSensitive,
      requiresReview: event.securityContext?.requiresReview,
      outcome: event.outcome,
      ipAddress: event.requestInfo?.ipAddress,
      userAgent: event.requestInfo?.userAgent,
      resolution: event.resolution,
      targetResource: event.targetResource
    }));
    
    return NextResponse.json({
      success: true,
      events: formattedEvents,
      total,
      hasMore: offset + limit < total,
      limit,
      offset
    });
    
  } catch (error) {
    console.error('❌ Failed to get security events:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get security events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const { user } = await AuthService.requireAuth(request, {
      roles: ['admin', 'super_admin'],
      requireSession: true
    });
    
    const { eventId, resolvedBy, resolution } = await request.json();
    
    if (!eventId || !resolvedBy || !resolution) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: eventId, resolvedBy, resolution' 
        },
        { status: 400 }
      );
    }
    
    // Update the audit log with resolution information
    const updated = await DatabaseService.updateOne(AuditLog, 
      { _id: eventId },
      {
        $set: {
          'resolution.resolved': true,
          'resolution.resolvedAt': new Date(),
          'resolution.resolvedBy': resolvedBy,
          'resolution.resolution': resolution
        }
      }
    );
    
    if (!updated) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Security event not found' 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Security event resolved successfully'
    });
    
  } catch (error) {
    console.error('❌ Failed to resolve security event:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to resolve security event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

