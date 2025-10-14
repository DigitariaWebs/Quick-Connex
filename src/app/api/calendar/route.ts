import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import Transfer from '@/models/Transfer';
import mongoose from 'mongoose';
import { requireEmployeeOrManager, createErrorResponse, createSuccessResponse } from '@/lib/auth/auth-middleware';

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
      .populate('requestedBy', 'firstName lastName email userType')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ scheduledDate: 1 });

    // Process transfers for calendar view
    const calendarEvents = transfers.map(transfer => {
      const startDateTime = new Date(transfer.scheduledDate!);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60000); // Default 60 minutes duration

      // Get transfer category display info
      const categoryInfo = getTransferCategoryInfo(transfer.transferCategory);
      const eventTitle = getEventTitle(transfer);
      const eventColors = getEventColors(transfer.transferCategory, transfer.priority, transfer.status);

      return {
        id: transfer._id,
        transferId: transfer.transferId,
        title: eventTitle,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        allDay: false,
        backgroundColor: eventColors.backgroundColor,
        borderColor: eventColors.borderColor,
        textColor: eventColors.textColor,
        extendedProps: {
          transferCategory: transfer.transferCategory,
          patient: transfer.patientInfo || transfer.transferData?.patientInfo,
          envelopeInfo: transfer.transferData?.envelopeInfo,
          equipmentInfo: transfer.transferData?.equipmentInfo,
          fromHospital: transfer.fromHospitalName || (transfer.fromHospital as any)?.name || 'Unknown Hospital',
          toHospital: transfer.toHospitalName || (transfer.toHospital as any)?.name || 'Unknown Hospital',
          priority: transfer.priority,
          status: transfer.status,
          reason: transfer.reason,
          requestedBy: transfer.requestedBy,
          assignedTo: transfer.assignedTo,
          scheduling: transfer.scheduling,
          notes: transfer.notes,
          categoryInfo: categoryInfo
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
      changedBy: new mongoose.Types.ObjectId(authResult.user._id),
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
  const events: any[] = [];
  const { scheduling } = transfer;
  
  if (!scheduling.isRecurring || !scheduling.recurrencePattern) {
    return events;
  }

  const baseDate = new Date(transfer.scheduledDate);
  const recurrenceEnd = scheduling.recurrenceEndDate ? 
    new Date(scheduling.recurrenceEndDate) : 
    new Date(endDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days after end date

  let currentDate = new Date(Math.max(baseDate.getTime(), startDate.getTime()));
  
  while (currentDate.getTime() <= Math.min(recurrenceEnd.getTime(), endDate.getTime())) {
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

        // Get transfer category display info for recurring events
        const categoryInfo = getTransferCategoryInfo(transfer.transferCategory);
        const eventTitle = getEventTitle(transfer) + ' (Recurring)';
        const eventColors = getEventColors(transfer.transferCategory, transfer.priority, transfer.status);

        events.push({
          id: `${transfer._id}_${currentDate.toISOString().split('T')[0]}`,
          transferId: transfer.transferId,
          title: eventTitle,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          allDay: false,
          backgroundColor: eventColors.backgroundColor,
          borderColor: eventColors.borderColor,
          textColor: eventColors.textColor,
          extendedProps: {
            transferCategory: transfer.transferCategory,
            patient: transfer.patientInfo || transfer.transferData?.patientInfo,
            envelopeInfo: transfer.transferData?.envelopeInfo,
            equipmentInfo: transfer.transferData?.equipmentInfo,
            fromHospital: transfer.fromHospitalName || (transfer.fromHospital as any)?.name || 'Unknown Hospital',
            toHospital: transfer.toHospitalName || (transfer.toHospital as any)?.name || 'Unknown Hospital',
            priority: transfer.priority,
            status: transfer.status,
            reason: transfer.reason,
            requestedBy: transfer.requestedBy,
            assignedTo: transfer.assignedTo,
            scheduling: transfer.scheduling,
            notes: transfer.notes,
            categoryInfo: categoryInfo,
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
  const conflicts: any[] = [];
  
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

// Helper functions for transfer categories
function getTransferCategoryInfo(transferCategory: string) {
  switch (transferCategory) {
    case 'patient':
      return {
        label: 'Patient Transfer',
        color: 'blue',
        icon: 'user',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200'
      };
    case 'envelope':
      return {
        label: 'Envelope Transfer',
        color: 'orange',
        icon: 'package',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800',
        borderColor: 'border-orange-200'
      };
    case 'medical_instruments':
      return {
        label: 'Medical Instruments Transfer',
        color: 'purple',
        icon: 'stethoscope',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-800',
        borderColor: 'border-purple-200'
      };
    default:
      return {
        label: 'Transfer',
        color: 'gray',
        icon: 'truck',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        borderColor: 'border-gray-200'
      };
  }
}

function getEventTitle(transfer: any): string {
  switch (transfer.transferCategory) {
    case 'patient':
      const patientInfo = transfer.patientInfo || transfer.transferData?.patientInfo;
      return patientInfo ? 
        `${patientInfo.firstName} ${patientInfo.lastName}` : 
        'Unknown Patient';
    case 'envelope':
      const envelopeInfo = transfer.transferData?.envelopeInfo;
      return envelopeInfo?.senderName ? 
        `Envelope: ${envelopeInfo.senderName}` : 
        'Envelope Transfer';
    case 'medical_instruments':
      const equipmentInfo = transfer.transferData?.equipmentInfo;
      return equipmentInfo?.equipmentName ? 
        `Equipment: ${equipmentInfo.equipmentName}` : 
        'Medical Equipment Transfer';
    default:
      return 'Transfer';
  }
}

function getEventColors(transferCategory: string, priority: string, status: string) {
  // Base colors for each transfer category - using distinct colors
  const categoryColors = {
    patient: {
      backgroundColor: '#3b82f6', // blue-500
      borderColor: '#1d4ed8', // blue-700
      textColor: '#ffffff'
    },
    envelope: {
      backgroundColor: '#f97316', // orange-500
      borderColor: '#ea580c', // orange-600
      textColor: '#ffffff'
    },
    medical_instruments: {
      backgroundColor: '#8b5cf6', // violet-500
      borderColor: '#7c3aed', // violet-600
      textColor: '#ffffff'
    }
  };

  // Always return category-specific colors, ignore priority
  return categoryColors[transferCategory as keyof typeof categoryColors] || categoryColors.patient;
}
