import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Transfer from '@/models/Transfer';
import { requireEmployeeOrManager, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware';

// GET /api/calendar - Get calendar view of transfers
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const view = searchParams.get('view') || 'month'; // month, week, day
    const includeRecurring = searchParams.get('includeRecurring') === 'true';

    // Default to current month if no dates provided
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Build query for scheduled transfers
    const query: any = {
      scheduledDate: {
        $gte: start,
        $lte: end
      },
      status: { $in: ['pending', 'accepted', 'in_progress'] }
    };

    // Get transfers with populated data
    const transfers = await Transfer.find(query)
      .populate('patient', 'patientId firstName lastName dateOfBirth gender')
      .populate('requestedBy', 'firstName lastName email userType')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ scheduledDate: 1 });

    // Process transfers for calendar view
    const calendarEvents = transfers.map(transfer => {
      const startDateTime = new Date(transfer.scheduledDate!);
      const endDateTime = transfer.scheduledEndDate || 
        new Date(startDateTime.getTime() + (transfer.scheduling?.timeSlot?.duration || 60) * 60000);

      return {
        id: transfer._id,
        transferId: transfer.transferId,
        title: `${transfer.patient.firstName} ${transfer.patient.lastName}`,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        allDay: false,
        backgroundColor: getPriorityColor(transfer.priority),
        borderColor: getStatusColor(transfer.status),
        textColor: '#ffffff',
        extendedProps: {
          patient: transfer.patient,
          fromHospital: transfer.fromHospital,
          toHospital: transfer.toHospital,
          priority: transfer.priority,
          status: transfer.status,
          reason: transfer.reason,
          requestedBy: transfer.requestedBy,
          assignedTo: transfer.assignedTo,
          scheduling: transfer.scheduling,
          notes: transfer.notes
        }
      };
    });

    // If including recurring transfers, generate recurring instances
    if (includeRecurring) {
      const recurringTransfers = await Transfer.find({
        'scheduling.isRecurring': true,
        'scheduling.recurrenceEndDate': { $gte: start },
        status: { $in: ['pending', 'accepted', 'in_progress'] }
      })
      .populate('patient', 'patientId firstName lastName dateOfBirth gender')
      .populate('requestedBy', 'firstName lastName email userType')
      .populate('assignedTo', 'firstName lastName email');

      for (const transfer of recurringTransfers) {
        const recurringEvents = generateRecurringEvents(transfer, start, end);
        calendarEvents.push(...recurringEvents);
      }
    }

    // Sort events by start time
    calendarEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return createSuccessResponse({
      events: calendarEvents,
      view,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      totalEvents: calendarEvents.length
    });

  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return createErrorResponse('Failed to fetch calendar data', 'CALENDAR_ERROR', 500);
  }
}

// POST /api/calendar - Create or update transfer scheduling
export async function POST(request: NextRequest) {
  try {
    // Authenticate user - only managers can create/update scheduling
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    const body = await request.json();
    const {
      transferId,
      scheduledDate,
      scheduledEndDate,
      scheduling,
      action = 'update' // 'update', 'reschedule', 'create_recurring'
    } = body;

    if (!transferId) {
      return createErrorResponse('Transfer ID is required', 'VALIDATION_ERROR', 400);
    }

    // Find the transfer
    const transfer = await Transfer.findOne({ transferId });
    if (!transfer) {
      return createErrorResponse('Transfer not found', 'NOT_FOUND', 404);
    }

    // Check for scheduling conflicts
    const conflicts = await checkSchedulingConflicts(transferId, scheduledDate, scheduledEndDate, scheduling);
    
    if (conflicts.length > 0) {
      return createErrorResponse('Scheduling conflicts detected', 'CONFLICT_ERROR', 409, {
        conflicts,
        canProceed: conflicts.every(c => c.severity === 'low')
      });
    }

    // Update transfer scheduling
    const updateData: any = {
      lastModifiedBy: authResult.user._id
    };

    if (scheduledDate) {
      updateData.scheduledDate = new Date(scheduledDate);
    }

    if (scheduledEndDate) {
      updateData.scheduledEndDate = new Date(scheduledEndDate);
    }

    if (scheduling) {
      updateData.scheduling = {
        ...transfer.scheduling,
        ...scheduling
      };
    }

    // Add status history entry
    const statusEntry = {
      status: transfer.status,
      changedBy: authResult.user._id,
      changedAt: new Date(),
      reason: `Scheduling ${action}`
    };

    if (!transfer.statusHistory) {
      transfer.statusHistory = [];
    }
    transfer.statusHistory.push(statusEntry);

    updateData.statusHistory = transfer.statusHistory;

    const updatedTransfer = await Transfer.findByIdAndUpdate(
      transfer._id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('patient', 'patientId firstName lastName dateOfBirth gender')
    .populate('requestedBy', 'firstName lastName email userType')
    .populate('assignedTo', 'firstName lastName email');

    return createSuccessResponse(updatedTransfer, 'Transfer scheduling updated successfully');

  } catch (error) {
    console.error('Error updating transfer scheduling:', error);
    return createErrorResponse('Failed to update transfer scheduling', 'UPDATE_ERROR', 500);
  }
}

// Helper functions
function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return '#dc2626'; // red-600
    case 'high': return '#ea580c'; // orange-600
    case 'medium': return '#d97706'; // amber-600
    case 'low': return '#16a34a'; // green-600
    default: return '#6b7280'; // gray-500
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending': return '#f59e0b'; // amber-500
    case 'accepted': return '#3b82f6'; // blue-500
    case 'in_progress': return '#8b5cf6'; // violet-500
    case 'completed': return '#10b981'; // emerald-500
    case 'cancelled': return '#ef4444'; // red-500
    default: return '#6b7280'; // gray-500
  }
}

function generateRecurringEvents(transfer: any, startDate: Date, endDate: Date) {
  const events = [];
  const { scheduling } = transfer;
  
  if (!scheduling.isRecurring || !scheduling.recurrencePattern) {
    return events;
  }

  const baseDate = new Date(transfer.scheduledDate);
  const recurrenceEnd = scheduling.recurrenceEndDate ? 
    new Date(scheduling.recurrenceEndDate) : 
    new Date(endDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days after end date

  let currentDate = new Date(Math.max(baseDate.getTime(), startDate.getTime()));
  
  while (currentDate <= Math.min(recurrenceEnd.getTime(), endDate.getTime())) {
    // Check if this date is in exceptions
    const isException = scheduling.recurrenceExceptions?.some((exception: Date) => 
      new Date(exception).toDateString() === currentDate.toDateString()
    );

    if (!isException) {
      let shouldInclude = false;

      switch (scheduling.recurrencePattern) {
        case 'daily':
          shouldInclude = true;
          break;
        case 'weekly':
          if (scheduling.recurrenceDays?.includes(currentDate.getDay())) {
            shouldInclude = true;
          }
          break;
        case 'monthly':
          shouldInclude = currentDate.getDate() === baseDate.getDate();
          break;
      }

      if (shouldInclude) {
        const startDateTime = new Date(currentDate);
        startDateTime.setHours(
          parseInt(scheduling.timeSlot?.startTime?.split(':')[0] || '9'),
          parseInt(scheduling.timeSlot?.startTime?.split(':')[1] || '0')
        );

        const endDateTime = new Date(startDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + (scheduling.timeSlot?.duration || 60));

        events.push({
          id: `${transfer._id}_${currentDate.toISOString().split('T')[0]}`,
          transferId: transfer.transferId,
          title: `${transfer.patient.firstName} ${transfer.patient.lastName} (Recurring)`,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          allDay: false,
          backgroundColor: getPriorityColor(transfer.priority),
          borderColor: getStatusColor(transfer.status),
          textColor: '#ffffff',
          extendedProps: {
            ...transfer.toObject(),
            isRecurring: true,
            originalTransferId: transfer._id
          }
        });
      }
    }

    // Move to next occurrence
    switch (scheduling.recurrencePattern) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + (scheduling.recurrenceInterval || 1));
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7 * (scheduling.recurrenceInterval || 1));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + (scheduling.recurrenceInterval || 1));
        break;
    }
  }

  return events;
}

async function checkSchedulingConflicts(
  transferId: string, 
  scheduledDate: string, 
  scheduledEndDate: string, 
  scheduling: any
) {
  const conflicts = [];
  
  if (!scheduledDate || !scheduledEndDate) {
    return conflicts;
  }

  const startTime = new Date(scheduledDate);
  const endTime = new Date(scheduledEndDate);

  // Check for time conflicts with other transfers
  const timeConflicts = await Transfer.find({
    _id: { $ne: transferId },
    scheduledDate: { $lt: endTime },
    scheduledEndDate: { $gt: startTime },
    status: { $in: ['pending', 'accepted', 'in_progress'] }
  });

  for (const conflict of timeConflicts) {
    conflicts.push({
      transferId: conflict.transferId,
      conflictType: 'time',
      severity: 'medium',
      description: `Time conflict with transfer ${conflict.transferId}`
    });
  }


  return conflicts;
}
