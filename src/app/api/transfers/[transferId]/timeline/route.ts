/**
 * Transfer Timeline API
 * 
 * This endpoint provides comprehensive timeline data for a specific transfer.
 * Returns all timeline events with detailed information about changes and actions.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import Transfer from '@/models/Transfer';
import { requireEmployeeOrManager, createErrorResponse, createSuccessResponse } from '@/lib/auth/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  try {
    const { transferId } = await params;

    if (!transferId) {
      return createErrorResponse('Transfer ID is required', 'VALIDATION_ERROR', 400);
    }

    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    // Find the transfer
    const transfer = await Transfer.findOne({ transferId });

    if (!transfer) {
      return createErrorResponse('Transfer not found', 'NOT_FOUND', 404);
    }

    // Check if user has permission to view this transfer
    const user = authResult.user;
    if (user.userType === 'employee' && transfer.status === 'pending') {
      return createErrorResponse('Access denied: Cannot view pending transfers', 'ACCESS_DENIED', 403);
    }

    // Return timeline data directly
    const timelineEvents = transfer.timeline || [];

    // Sort timeline events by timestamp (newest first)
    timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return createSuccessResponse({
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
      timeline: timelineEvents,
      totalEvents: timelineEvents.length,
      lastUpdated: transfer.updatedAt
    });

  } catch (error) {
    console.error('Error fetching transfer timeline:', error);
    return createErrorResponse('Failed to fetch transfer timeline', 'FETCH_ERROR', 500);
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
  try {
    const { transferId } = await params;
    const body = await request.json();
    const { type, title, description, metadata } = body;

    if (!transferId) {
      return createErrorResponse('Transfer ID is required', 'VALIDATION_ERROR', 400);
    }

    if (!type || !title || !description) {
      return createErrorResponse('Type, title, and description are required', 'VALIDATION_ERROR', 400);
    }

    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    // Find the transfer
    const transfer = await Transfer.findOne({ transferId });
    if (!transfer) {
      return createErrorResponse('Transfer not found', 'NOT_FOUND', 404);
    }

    // Check if user has permission to add events to this transfer
    const user = authResult.user;
    if (user.userType === 'employee' && transfer.status === 'pending') {
      return createErrorResponse('Access denied: Cannot modify pending transfers', 'ACCESS_DENIED', 403);
    }

    // Create new timeline event
    const newEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      description,
      timestamp: new Date(),
      actor: {
        id: user._id as any,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        userType: user.userType
      },
      metadata: metadata || {},
      isSystemEvent: false,
      isVisible: true
    };

    // Add event to timeline
    if (!transfer.timeline) {
      transfer.timeline = [];
    }
    transfer.timeline.push(newEvent);
    transfer.lastModifiedBy = user._id as any;

    await transfer.save();

    return createSuccessResponse({
      event: newEvent,
      message: 'Timeline event added successfully'
    }, 'Timeline event added successfully', 201);

  } catch (error) {
    console.error('Error adding timeline event:', error);
    return createErrorResponse('Failed to add timeline event', 'CREATE_ERROR', 500);
  }
}
