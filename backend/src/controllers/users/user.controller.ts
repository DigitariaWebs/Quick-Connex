/**
 * User Controller
 * 
 * Core user operations including profile management.
 */

import { Response } from 'express';
import { ResponseBuilder } from '@/utils/response.util';
import { DatabaseService } from '@/lib/database';
import User from '@/models/User';
import Transfer from '@/models/Transfer';
import { AuthenticatedRequest } from '@/types';

/**
 * GET /api/users/profile - Get current user profile with transfer stats and recent activity
 */
export async function getProfile(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    // Fetch user profile (exclude password)
    const userProfile = await DatabaseService.findById(User, user._id, {
      select: '-password'
    });

    if (!userProfile) {
      return ResponseBuilder.notFound(res, 'User not found');
    }

    // Calculate transfer statistics based on user role
    const transferStats = await getTransferStats(user._id, user.userType);

    // Get recent activity
    const recentActivity = await getRecentActivity(user._id, user.userType);

    return ResponseBuilder.success(res, {
      profile: userProfile,
      stats: transferStats,
      recentActivity: recentActivity
    });

  } catch (error) {
    console.error('Error fetching profile data:', error);
    return ResponseBuilder.serverError(res, 'Failed to fetch profile data');
  }
}

/**
 * Calculate transfer statistics based on user role
 */
async function getTransferStats(userId: string, userType: string): Promise<any> {
  try {
    let query: any = {};
    
    if (userType === 'manager') {
      query.requestedBy = userId;
    } else {
      query.assignedTo = userId;
    }

    // Get all transfers for this user
    const transfers = await DatabaseService.findMany(Transfer, query);

    // Calculate stats
    const stats = {
      total: transfers.length,
      pending: transfers.filter((t: any) => t.status === 'pending').length,
      accepted: transfers.filter((t: any) => t.status === 'accepted').length,
      inProgress: transfers.filter((t: any) => t.status === 'in_progress').length,
      completed: transfers.filter((t: any) => t.status === 'completed').length,
      cancelled: transfers.filter((t: any) => t.status === 'cancelled').length,
      urgent: transfers.filter((t: any) => t.priority === 'urgent').length,
      averageProcessingTime: 0
    };

    // Calculate average processing time for completed transfers
    const completedTransfers = transfers.filter((t: any) => t.status === 'completed' && t.actualDuration);
    if (completedTransfers.length > 0) {
      const totalDuration = completedTransfers.reduce((sum: number, t: any) => sum + (t.actualDuration || 0), 0);
      stats.averageProcessingTime = Math.round(totalDuration / completedTransfers.length);
    }

    return stats;
  } catch (error) {
    console.error('Error calculating transfer stats:', error);
    return {
      total: 0,
      pending: 0,
      accepted: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      urgent: 0,
      averageProcessingTime: 0
    };
  }
}

/**
 * Get recent activity for user
 */
async function getRecentActivity(userId: string, userType: string): Promise<any[]> {
  try {
    let query: any = {};
    
    if (userType === 'manager') {
      query.requestedBy = userId;
    } else {
      query.assignedTo = userId;
    }

    // Get recent transfers (last 10)
    const recentTransfers = await DatabaseService.findMany(Transfer, query, {
      sort: { updatedAt: -1 },
      limit: 10,
      populate: [
        { path: 'requestedBy', select: 'firstName lastName email' },
        { path: 'assignedTo', select: 'firstName lastName email' }
      ]
    });

    // Format as activity items
    return recentTransfers.map((transfer: any) => ({
      id: transfer._id,
      type: 'transfer',
      action: getTransferAction(transfer.status),
      description: `${transfer.patientName} - ${transfer.transferType}`,
      timestamp: transfer.updatedAt,
      status: transfer.status,
      priority: transfer.priority
    }));
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}

/**
 * Get transfer action description based on status
 */
function getTransferAction(status: string): string {
  switch (status) {
    case 'pending': return 'Transfer requested';
    case 'accepted': return 'Transfer accepted';
    case 'in_progress': return 'Transfer in progress';
    case 'completed': return 'Transfer completed';
    case 'cancelled': return 'Transfer cancelled';
    default: return 'Transfer updated';
  }
}
