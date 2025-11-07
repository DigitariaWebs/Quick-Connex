import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import AuditLog from '@/models/AuditLog';
import { AuthService } from '@/lib/auth';
import { AuditAction, TargetResourceType } from '@/models/AuditLog';

/**
 * GET /api/dashboard/transfer-metrics
 * 
 * Calculate transfer metrics from audit logs:
 * - Average processing time (from TRANSFER_CREATED to TRANSFER_COMPLETED)
 * - Success rate (completed vs cancelled transfers)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    // Query audit logs for transfer events
    // Get all transfer creation events
    const createdEvents = await DatabaseService.findMany(
      AuditLog,
      {
        action: AuditAction.TRANSFER_CREATED,
        'targetResource.type': TargetResourceType.TRANSFER,
      },
      {
        sort: { timestamp: -1 },
        limit: 1000, // Get recent transfers for calculation
      }
    );

    // Get all completion events (completed and cancelled)
    const completedEvents = await DatabaseService.findMany(
      AuditLog,
      {
        action: { $in: [AuditAction.TRANSFER_COMPLETED, AuditAction.TRANSFER_CANCELLED] },
        'targetResource.type': TargetResourceType.TRANSFER,
      },
      {
        sort: { timestamp: -1 },
        limit: 1000,
      }
    );

    // Build maps for quick lookup
    const createdMap = new Map<string, Date>();
    createdEvents.forEach((event) => {
      if (event.targetResource?.id) {
        const transferId = event.targetResource.id;
        // Only keep the earliest creation event for each transfer
        const existing = createdMap.get(transferId);
        if (!existing || event.timestamp < existing) {
          createdMap.set(transferId, event.timestamp);
        }
      }
    });

    const completedMap = new Map<string, { date: Date; isSuccess: boolean }>();
    completedEvents.forEach((event) => {
      if (event.targetResource?.id) {
        const transferId = event.targetResource.id;
        const isSuccess = event.action === AuditAction.TRANSFER_COMPLETED;
        // Only keep the latest completion event for each transfer
        const existing = completedMap.get(transferId);
        if (!existing || event.timestamp > existing.date) {
          completedMap.set(transferId, {
            date: event.timestamp,
            isSuccess,
          });
        }
      }
    });

    // Calculate processing times for transfers that have both created and completed events
    const processingTimes: number[] = [];
    let completedCount = 0;
    let cancelledCount = 0;

    completedMap.forEach((completion, transferId) => {
      const createdDate = createdMap.get(transferId);
      if (createdDate) {
        // Calculate processing time in milliseconds
        const processingTimeMs = completion.date.getTime() - createdDate.getTime();
        if (processingTimeMs > 0) {
          processingTimes.push(processingTimeMs);
        }

        // Count success vs failure
        if (completion.isSuccess) {
          completedCount++;
        } else {
          cancelledCount++;
        }
      }
    });

    // Calculate average processing time
    let averageProcessingTime = '0h';
    if (processingTimes.length > 0) {
      const avgMs = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      const avgHours = avgMs / (1000 * 60 * 60);
      
      if (avgHours < 1) {
        const avgMinutes = Math.round(avgMs / (1000 * 60));
        averageProcessingTime = `${avgMinutes}m`;
      } else if (avgHours < 24) {
        const hours = Math.floor(avgHours);
        const minutes = Math.round((avgHours - hours) * 60);
        averageProcessingTime = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      } else {
        const days = Math.floor(avgHours / 24);
        const hours = Math.round(avgHours % 24);
        averageProcessingTime = hours > 0 ? `${days}d ${hours}h` : `${days}d`;
      }
    }

    // Calculate success rate
    const totalFinalized = completedCount + cancelledCount;
    const successRate = totalFinalized > 0 
      ? Math.round((completedCount / totalFinalized) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        averageProcessingTime,
        successRate,
        totalProcessed: totalFinalized,
        completed: completedCount,
        cancelled: cancelledCount,
        sampleSize: processingTimes.length,
      },
    });

  } catch (error) {
    console.error('Error calculating transfer metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate transfer metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

