import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import User from '@/models/User';
import Transfer from '@/models/Transfer';
import { requireEmployeeOrManager, handleAuthError, createSuccessResponse } from '@/lib/auth/auth-utils';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user using new session manager
    const { user } = await requireEmployeeOrManager();

    await dbConnect();

    // Fetch user profile
    const userProfile = await User.findById(user._id).select('-password');
    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch transfer statistics
    const transferStats = await getTransferStats((user._id as any).toString(), user.userType);

    // Fetch recent activity
    const recentActivity = await getRecentActivity((user._id as any).toString(), user.userType);

    return createSuccessResponse({
      profile: userProfile,
      stats: transferStats,
      recentActivity: recentActivity
    });

  } catch (error) {
    console.error('Error fetching profile data:', error);
    return handleAuthError(error);
  }
}

async function getTransferStats(userId: string, userType: string) {
  try {
    let query: any = {};
    
    if (userType === 'manager') {
      query.requestedBy = userId;
    } else {
      query.assignedTo = userId;
    }

    const transfers = await Transfer.find(query);
    
    const stats = {
      totalTransfers: transfers.length,
      completedTransfers: transfers.filter(t => t.status === 'completed').length,
      pendingTransfers: transfers.filter(t => ['pending', 'accepted', 'in_progress'].includes(t.status)).length,
      cancelledTransfers: transfers.filter(t => t.status === 'cancelled').length,
      averageCompletionTime: 0
    };

    // Calculate average completion time for completed transfers
    const completedTransfers = transfers.filter(t => t.status === 'completed' && t.completedDate);
    if (completedTransfers.length > 0) {
      const totalTime = completedTransfers.reduce((sum, transfer) => {
        const duration = transfer.actualDuration || 
          (transfer.completedDate && transfer.requestedDate ? 
            Math.round((transfer.completedDate.getTime() - transfer.requestedDate.getTime()) / (1000 * 60)) : 0);
        return sum + duration;
      }, 0);
      stats.averageCompletionTime = Math.round(totalTime / completedTransfers.length);
    }

    return stats;
  } catch (error) {
    console.error('Error calculating transfer stats:', error);
    return {
      totalTransfers: 0,
      completedTransfers: 0,
      pendingTransfers: 0,
      cancelledTransfers: 0,
      averageCompletionTime: 0
    };
  }
}

async function getRecentActivity(userId: string, userType: string) {
  try {
    const activities: any[] = [];

    // Get recent transfers
    let transferQuery: any = {};
    if (userType === 'manager') {
      transferQuery.requestedBy = userId;
    } else {
      transferQuery.assignedTo = userId;
    }

    const recentTransfers = await Transfer.find(transferQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('requestedBy', 'firstName lastName userType')
      .populate({
        path: 'assignedTo',
        select: 'firstName lastName userType',
        options: { strictPopulate: false }
      });

    // Convert transfers to activity format
    recentTransfers.forEach(transfer => {
      let title = '';
      let description = '';
      let status: 'success' | 'pending' | 'warning' = 'pending';
      
      // Get patient name safely
      const patientName = transfer.patientInfo?.firstName && transfer.patientInfo?.lastName 
        ? `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`
        : 'Unknown Patient';

      if (userType === 'manager') {
        title = `Transfer Request: ${patientName}`;
        description = `New transfer request created`;
      } else {
        title = `Assigned Transfer: ${patientName}`;
        description = `Transfer assigned to you`;
      }

      switch (transfer.status) {
        case 'completed':
          status = 'success';
          break;
        case 'cancelled':
          status = 'warning';
          break;
        default:
          status = 'pending';
      }

      activities.push({
        id: (transfer._id as any).toString(),
        type: 'transfer_request',
        title,
        description,
        date: transfer.createdAt,
        status,
        // Add structured data for better frontend parsing
        patientName,
        fromHospital: transfer.fromHospitalName,
        toHospital: transfer.toHospitalName,
        transferId: (transfer._id as any).toString()
      });
    });

    // Sort by date and return top 5
    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}
