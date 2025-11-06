/**
 * Transfer Timeline API
 * 
 * This endpoint provides comprehensive timeline data for a specific transfer.
 * Returns all timeline events with detailed information about changes and actions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import Transfer from '@/models/Transfer';
import { AuthService } from '@/lib/auth';
import { TimelineService, TransferStatus } from '@/lib/transfers';
import { TimelineQueryOptions } from '@/types/transfers/timeline.types';
import { TimelineEventType } from '@/types/transfers/transfer.types';
import { createSuccessResponse } from '@/lib/utils/api-responses';
import { extractRequestInfo } from '@/lib/audit/utils/request';
import { log } from '@/lib/logging';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  const { transferId } = await params;
  
  try {
    const { searchParams } = new URL(request.url);

    if (!transferId) {
      return NextResponse.json({ error: 'Transfer ID is required' }, { status: 400 });
    }

    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
// Find the transfer
    const transfer = await DatabaseService.findOne(Transfer, { transferId });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    // Check if user has permission to view this transfer
    if (user.userType === 'employee' && transfer.status === TransferStatus.PENDING) {
      return NextResponse.json({ error: 'Access denied: Cannot view pending transfers' }, { status: 403 });
    }

    // Parse query options for enhanced timeline
    const options: TimelineQueryOptions = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      filters: {
        startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
        endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
        kind: searchParams.get('eventTypes') || undefined,
        actorId: searchParams.get('actorId') || undefined,
        isSensitive: searchParams.get('isSensitive') === 'true' ? true : 
                     searchParams.get('isSensitive') === 'false' ? false : undefined,
        requiresReview: searchParams.get('requiresReview') === 'true' ? true : 
                        searchParams.get('requiresReview') === 'false' ? false : undefined
      }
    };

    // Get enhanced timeline from audit logs
    const timelineResponse = await TimelineService.getTimeline({
      ...options,
      filters: {
        ...options.filters,
        transferId
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        transfer: {
          id: transfer._id,
          transferId: transfer.transferId,
          patientInfo: transfer.patientInfo,
          fromHospitalName: transfer.fromHospitalName,
          toHospitalName: transfer.toHospitalName,
          status: transfer.status,
          priority: transfer.priority,
          requestedDate: transfer.requestedDate,
          scheduledDate: transfer.scheduledDate,
          completedDate: transfer.completedDate,
          reason: transfer.reason,
          notes: transfer.notes
        },
        timeline: timelineResponse.items,
        totalEvents: timelineResponse.pagination.total,
        pagination: timelineResponse.pagination,
        lastUpdated: transfer.updatedAt
      }
    });

  } catch (error) {
    log.error('Error fetching transfer timeline', error, {
      category: 'transfer',
      operation: 'get_timeline',
      transferId
    });
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Add a new timeline event to a transfer
 * This endpoint allows adding custom timeline events (e.g., notes, comments)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  const { transferId } = await params;
  
  try {
    const body = await request.json();
    const { type, title, description, metadata } = body;

    if (!transferId) {
      return NextResponse.json({ error: 'Transfer ID is required' }, { status: 400 });
    }

    if (!type || !title || !description) {
      return NextResponse.json({ error: 'Type, title, and description are required' }, { status: 400 });
    }

    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
// Find the transfer
    const transfer = await DatabaseService.findOne(Transfer, { transferId });
    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    // Check if user has permission to add events to this transfer
    if (user.userType === 'employee' && transfer.status === TransferStatus.PENDING) {
      return NextResponse.json({ error: 'Access denied: Cannot modify pending transfers' }, { status: 403 });
    }

    // Create new timeline event with audit logging
    const eventData = {
      type,
      title,
      description,
      actor: {
        id: user._id as any,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        userType: user.userType === 'super_admin' ? 'admin' : user.userType as 'admin' | 'employee' | 'manager'
      },
      metadata: metadata || {},
      isSystemEvent: false,
      isVisible: true
    };

    // Extract request info for audit logging
    const requestInfo = extractRequestInfo(request);

    // Create timeline event with audit logging
    const newEvent = await TimelineService.createEventWithAudit(
      eventData,
      transferId,
      requestInfo
    );

    // Timeline events are now stored in audit logs collection, not in transfer document
    // No need to push to transfer.timeline array
    transfer.lastModifiedBy = user._id as any;

    await transfer.save();

    return createSuccessResponse({
      event: newEvent,
      message: 'Timeline event added successfully'
    }, 'Timeline event added successfully', 201);

  } catch (error) {
    log.error('Error adding timeline event', error, {
      category: 'transfer',
      operation: 'add_timeline_event',
      transferId
    });
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
