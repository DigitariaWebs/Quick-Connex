import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import Transfer from '@/models/Transfer';
import { AuthService } from '@/lib/auth';// GET /api/calendar/conflicts - Check for scheduling conflicts
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
const { searchParams } = new URL(request.url);
    const transferId = searchParams.get('transferId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const resourceType = searchParams.get('resourceType'); // 'driver', 'vehicle', 'location'

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    const startTime = new Date(startDate);
    const endTime = new Date(endDate);

    // Build conflict detection query
    const query: any = {
      scheduledDate: { $lt: endTime },
      scheduledEndDate: { $gt: startTime },
      status: { $in: ['pending', 'accepted', 'in_progress'] }
    };

    // Exclude current transfer if checking for existing transfer
    if (transferId) {
      query._id = { $ne: transferId };
    }


    const conflictingTransfers = await DatabaseService.findMany(Transfer, query, {
      populate: [
        { path: 'patient', select: 'patientId firstName lastName' },
        { path: 'requestedBy', select: 'firstName lastName email' },
        { path: 'assignedTo', select: 'firstName lastName email' }
      ],
      sort: { scheduledDate: 1 }
    });

    // Analyze conflicts
    const conflicts = conflictingTransfers.map(transfer => {
      const conflictStart = new Date(Math.max(transfer.scheduledDate!.getTime(), startTime.getTime()));
      const conflictEnd = new Date(Math.min(
        new Date(transfer.scheduledDate!.getTime() + 60 * 60000).getTime(),
        endTime.getTime()
      ));

      const conflictDuration = (conflictEnd.getTime() - conflictStart.getTime()) / (1000 * 60); // minutes

      return {
        transferId: transfer.transferId,
        patientName: transfer.patientInfo ? `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}` : 'Unknown Patient',
        conflictType: resourceType || 'time',
        severity: getConflictSeverity(conflictDuration, transfer.priority),
        conflictStart: conflictStart.toISOString(),
        conflictEnd: conflictEnd.toISOString(),
        conflictDuration,
        transfer: {
          _id: transfer._id,
          transferId: transfer.transferId,
          priority: transfer.priority,
          status: transfer.status,
          fromHospital: transfer.fromHospital,
          toHospital: transfer.toHospital,
          reason: transfer.reason,
          requestedBy: transfer.requestedBy,
          assignedTo: transfer.assignedTo,
          scheduling: transfer.scheduling
        }
      };
    });

    // Group conflicts by type
    const conflictsByType = {
      time: conflicts.filter(c => c.conflictType === 'time'),
      resource: conflicts.filter(c => c.conflictType === 'driver' || c.conflictType === 'vehicle'),
      location: conflicts.filter(c => c.conflictType === 'location')
    };

    // Calculate conflict summary
    const summary = {
      totalConflicts: conflicts.length,
      highSeverity: conflicts.filter(c => c.severity === 'high').length,
      mediumSeverity: conflicts.filter(c => c.severity === 'medium').length,
      lowSeverity: conflicts.filter(c => c.severity === 'low').length,
      canProceed: conflicts.every(c => c.severity === 'low'),
      recommendedAction: getRecommendedAction(conflicts)
    };

    return NextResponse.json({
      success: true,
      data: {
        conflicts,
        conflictsByType,
        summary,
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error checking conflicts:', error);
    return NextResponse.json({ error: 'Failed to check conflicts' }, { status: 500 });
  }
}

// POST /api/calendar/conflicts - Resolve conflicts automatically
export async function POST(request: NextRequest) {
  try {
    // Authenticate user - only managers can resolve conflicts
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
const body = await request.json();
    const {
      transferId,
      resolutionStrategy, // 'auto_reschedule', 'manual_override', 'resource_reassignment'
      newSchedule,
      affectedTransfers = []
    } = body;

    if (!transferId || !resolutionStrategy) {
      return NextResponse.json({ error: 'Transfer ID and resolution strategy are required' }, { status: 400 });
    }

    const transfer = await DatabaseService.findOne(Transfer, { transferId });
    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    const results = [];

    switch (resolutionStrategy) {
      case 'auto_reschedule':
        if (!newSchedule) {
          return NextResponse.json({ error: 'New schedule is required for auto reschedule' }, { status: 400 });
        }
        
        // Update the transfer with new schedule
        const updatedTransfer = await DatabaseService.updateById(Transfer,
          (transfer._id as any).toString(),
          {
            scheduledDate: new Date(newSchedule.startDate),
            scheduledEndDate: new Date(newSchedule.endDate),
            lastModifiedBy: user._id,
            $push: {
              statusHistory: {
                status: transfer.status,
                changedBy: user._id,
                changedAt: new Date(),
                reason: 'Auto-rescheduled due to conflict resolution'
              }
            }
          }
        );

        results.push({
          action: 'rescheduled',
          transferId: transfer.transferId,
          newSchedule: {
            startDate: newSchedule.startDate,
            endDate: newSchedule.endDate
          }
        });
        break;

      case 'resource_reassignment':
        // Reassign resources to resolve conflicts
        for (const affectedTransferId of affectedTransfers) {
          const affectedTransfer = await DatabaseService.findOne(Transfer, { transferId: affectedTransferId });
          if (affectedTransfer) {
            // Clear conflicting resources
            await DatabaseService.updateById(Transfer,
              (affectedTransfer._id as any).toString(),
              {
                lastModifiedBy: user._id,
                $push: {
                  statusHistory: {
                    status: affectedTransfer.status,
                    changedBy: user._id,
                    changedAt: new Date(),
                    reason: 'Resource reassigned due to conflict resolution'
                  }
                }
              }
            );

            results.push({
              action: 'transfer_updated',
              transferId: affectedTransfer.transferId
            });
          }
        }
        break;

      case 'manual_override':
        // Log the manual override
        await DatabaseService.updateById(Transfer,
          (transfer._id as any).toString(),
          {
            lastModifiedBy: user._id,
            $push: {
              statusHistory: {
                status: transfer.status,
                changedBy: user._id,
                changedAt: new Date(),
                reason: 'Manual override - conflicts acknowledged'
              }
            }
          }
        );

        results.push({
          action: 'manual_override',
          transferId: transfer.transferId,
          note: 'Conflicts acknowledged by manager'
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid resolution strategy' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        resolutionStrategy,
        results,
        resolvedAt: new Date().toISOString(),
        resolvedBy: {
          userId: user._id,
          name: `${user.firstName} ${user.lastName}`
        }
      }
    });

  } catch (error) {
    console.error('Error resolving conflicts:', error);
    return NextResponse.json({ error: 'Failed to resolve conflicts' }, { status: 500 });
  }
}

// Helper functions
function getConflictSeverity(conflictDuration: number, priority: string): 'low' | 'medium' | 'high' {
  if (priority === 'urgent') return 'high';
  if (conflictDuration > 120) return 'high'; // More than 2 hours
  if (conflictDuration > 60) return 'medium'; // More than 1 hour
  return 'low';
}

function getRecommendedAction(conflicts: any[]): string {
  if (conflicts.length === 0) return 'No conflicts detected';
  
  const highSeverityCount = conflicts.filter(c => c.severity === 'high').length;
  const mediumSeverityCount = conflicts.filter(c => c.severity === 'medium').length;
  
  if (highSeverityCount > 0) {
    return 'High severity conflicts detected. Manual intervention required.';
  }
  
  if (mediumSeverityCount > 0) {
    return 'Medium severity conflicts detected. Consider rescheduling or resource reassignment.';
  }
  
  return 'Low severity conflicts detected. Can proceed with caution.';
}
