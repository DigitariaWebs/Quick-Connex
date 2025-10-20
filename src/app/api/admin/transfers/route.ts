import { NextRequest, NextResponse } from 'next/server';
import { requireManager, handleAuthError, createSuccessResponse } from '@/lib/auth/auth-utils';
import { logAdminAction } from '@/lib/auth/admin-middleware';
import dbConnect from '@/lib/database/mongoose';
import mongoose from 'mongoose';
// Import all models through centralized initialization
import { Hospital, User, Patient, Transfer } from '@/lib/database/models';
import { Permission } from '@/models/User';
import { AuditAction, AuditCategory, TargetResourceType } from '@/models/AuditLog';

/**
 * Admin Transfers API Endpoint
 * 
 * Provides comprehensive transfer management for administrators:
 * - Advanced filtering and search
 * - Bulk operations (cancel, reassign, delete)
 * - Transfer statistics and analytics
 * - Export functionality
 * - Audit logging for all actions
 */

interface TransferFilters {
  status?: string[];
  priority?: string[];
  transferCategory?: string[];
  fromHospital?: string[];
  toHospital?: string[];
  requestedBy?: string[];
  assignedTo?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

interface BulkOperation {
  action: 'cancel' | 'reassign' | 'delete' | 'update_status' | 'update_priority';
  transferIds: string[];
  reason?: string;
  newStatus?: string;
  newPriority?: string;
  reassignTo?: string;
}

// GET /api/admin/transfers - Get transfers with advanced filtering
export async function GET(request: NextRequest) {
  try {
    // Check admin permissions
    const { user } = await requireManager();

    const adminUser = user;
    
    // Check specific permissions
    const hasViewPermission = adminUser.userType === 'super_admin' || adminUser.userType === 'admin' || (adminUser.permissions && adminUser.permissions.includes(Permission.VIEW_ALL_TRANSFERS));
    
    if (!hasViewPermission) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions',
        message: 'You do not have permission to view all transfers'
      }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const filters: TransferFilters = {
      status: searchParams.get('status')?.split(',').filter(Boolean),
      priority: searchParams.get('priority')?.split(',').filter(Boolean),
      transferCategory: searchParams.get('category')?.split(',').filter(Boolean),
      fromHospital: searchParams.get('fromHospital')?.split(',').filter(Boolean),
      toHospital: searchParams.get('toHospital')?.split(',').filter(Boolean),
      requestedBy: searchParams.get('requestedBy')?.split(',').filter(Boolean),
      assignedTo: searchParams.get('assignedTo')?.split(',').filter(Boolean),
      search: searchParams.get('search') || undefined,
      dateRange: searchParams.get('dateStart') && searchParams.get('dateEnd') ? {
        start: searchParams.get('dateStart')!,
        end: searchParams.get('dateEnd')!
      } : undefined
    };

    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Parse sorting
    const sortBy = searchParams.get('sortBy') || 'requestedDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    const query: any = {};

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      query.status = { $in: filters.status };
    }

    if (filters.priority && filters.priority.length > 0) {
      query.priority = { $in: filters.priority };
    }

    if (filters.transferCategory && filters.transferCategory.length > 0) {
      query.transferCategory = { $in: filters.transferCategory };
    }

    if (filters.fromHospital && filters.fromHospital.length > 0) {
      query.fromHospital = { $in: filters.fromHospital };
    }

    if (filters.toHospital && filters.toHospital.length > 0) {
      query.toHospital = { $in: filters.toHospital };
    }

    if (filters.requestedBy && filters.requestedBy.length > 0) {
      query.requestedBy = { $in: filters.requestedBy };
    }

    if (filters.assignedTo && filters.assignedTo.length > 0) {
      query.assignedTo = { $in: filters.assignedTo };
    }

    if (filters.dateRange) {
      query.requestedDate = {
        $gte: new Date(filters.dateRange.start),
        $lte: new Date(filters.dateRange.end)
      };
    }

    // Text search
    if (filters.search) {
      query.$or = [
        { transferId: { $regex: filters.search, $options: 'i' } },
        { 'patientInfo.firstName': { $regex: filters.search, $options: 'i' } },
        { 'patientInfo.lastName': { $regex: filters.search, $options: 'i' } },
        { 'patientInfo.dossierNumber': { $regex: filters.search, $options: 'i' } },
        { reason: { $regex: filters.search, $options: 'i' } },
        { notes: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get transfers with populated data
    const transfers = await Transfer.find(query)
      .populate('requestedBy', 'firstName lastName email userType')
      .populate('fromHospital', 'name address organization')
      .populate('toHospital', 'name address organization')
      .populate('assignedTo', 'firstName lastName email userType')
      .populate('patient', 'firstName lastName age dossierNumber')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await Transfer.countDocuments(query);

    // Get statistics
    const stats = await Transfer.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } }
        }
      }
    ]);

    // Log admin action
    await logAdminAction({
      adminId: adminUser._id.toString(),
      adminName: `${adminUser.firstName} ${adminUser.lastName}`,
      adminEmail: adminUser.email,
      adminRole: adminUser.userType as 'admin' | 'super_admin',
      action: AuditAction.DATA_EXPORTED,
      category: AuditCategory.DATA_ACCESS,
      description: `Viewed all transfers with filters: ${JSON.stringify(filters)}`,
      targetResource: {
        type: TargetResourceType.TRANSFER,
        id: 'multiple',
        name: 'Transfer List'
      },
      requestInfo: {
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        method: request.method,
        endpoint: request.url
      },
      outcome: 'success',
      metadata: {
        filters,
        resultCount: transfers.length,
        totalCount
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        transfers,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        stats: stats[0] || {
          total: 0,
          pending: 0,
          accepted: 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
          urgent: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        filters: filters
      }
    });

  } catch (error) {
    console.error('Admin transfers API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch transfers',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/admin/transfers - Create transfer or perform bulk operations
export async function POST(request: NextRequest) {
  try {
    // Check admin permissions
    const { user } = await requireManager();

    const adminUser = user;
    const body = await request.json();

    // Check if this is a bulk operation
    if (body.bulkOperation) {
      return await handleBulkOperation(request, adminUser, body.bulkOperation);
    }

    // Regular transfer creation (admin can create transfers)
    const hasViewPermission = adminUser.userType === 'super_admin' || adminUser.userType === 'admin' || (adminUser.permissions && adminUser.permissions.includes(Permission.VIEW_ALL_TRANSFERS));
    
    if (!hasViewPermission) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions',
        message: 'You do not have permission to create transfers'
      }, { status: 403 });
    }

    await dbConnect();

    // Create transfer with admin privileges
    const transferData = {
      ...body,
      requestedBy: adminUser._id,
      lastModifiedBy: adminUser._id
    };

    const transfer = new Transfer(transferData);
    await transfer.save();

    // Populate the created transfer
    await transfer.populate([
      { path: 'requestedBy', select: 'firstName lastName email userType' },
      { path: 'fromHospital', select: 'name address organization' },
      { path: 'toHospital', select: 'name address organization' }
    ]);

    // Log admin action
    await logAdminAction({
      adminId: adminUser._id.toString(),
      adminName: `${adminUser.firstName} ${adminUser.lastName}`,
      adminEmail: adminUser.email,
      adminRole: adminUser.userType as 'admin' | 'super_admin',
      action: AuditAction.TRANSFER_CREATED,
      category: AuditCategory.TRANSFER_MANAGEMENT,
      description: `Created transfer ${transfer.transferId} (${transfer.transferCategory})`,
      targetResource: {
        type: TargetResourceType.TRANSFER,
        id: (transfer._id as any).toString(),
        name: transfer.transferId
      },
      metadata: {
        transferCategory: transfer.transferCategory,
        status: transfer.status
      },
      requestInfo: {
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        method: request.method,
        endpoint: request.url
      },
      outcome: 'success'
    });

    return NextResponse.json({
      success: true,
      data: { transfer },
      message: 'Transfer created successfully'
    });

  } catch (error) {
    console.error('Admin transfers POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create transfer',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle bulk operations
async function handleBulkOperation(
  request: NextRequest,
  adminUser: any,
  operation: BulkOperation
) {
  try {
    await dbConnect();

    const { action, transferIds, reason, newStatus, newPriority, reassignTo } = operation;

    // Validate permissions for each action
    switch (action) {
      case 'cancel':
        const hasCancelPermission = adminUser.userType === 'super_admin' || adminUser.userType === 'admin' || (adminUser.permissions && adminUser.permissions.includes(Permission.CANCEL_ANY_TRANSFER));
        
        if (!hasCancelPermission) {
          return NextResponse.json({
            success: false,
            error: 'Insufficient permissions',
            message: 'You do not have permission to cancel transfers'
          }, { status: 403 });
        }
        break;
      case 'reassign':
        const hasReassignPermission = adminUser.userType === 'super_admin' || adminUser.userType === 'admin' || (adminUser.permissions && adminUser.permissions.includes(Permission.REASSIGN_TRANSFERS));
        
        if (!hasReassignPermission) {
          return NextResponse.json({
            success: false,
            error: 'Insufficient permissions',
            message: 'You do not have permission to reassign transfers'
          }, { status: 403 });
        }
        break;
      case 'delete':
        const hasDeletePermission = adminUser.userType === 'super_admin' || (adminUser.permissions && adminUser.permissions.includes(Permission.DELETE_DATA));
        
        if (!hasDeletePermission) {
          return NextResponse.json({
            success: false,
            error: 'Insufficient permissions',
            message: 'You do not have permission to delete transfers'
          }, { status: 403 });
        }
        break;
    }

    const results = [];
    const errors = [];

    for (const transferId of transferIds) {
      try {
        const transfer = await Transfer.findById(transferId);
        if (!transfer) {
          errors.push({ transferId, error: 'Transfer not found' });
          continue;
        }

        let updateData: any = {
          lastModifiedBy: adminUser._id
        };

        switch (action) {
          case 'cancel':
            updateData.status = 'cancelled';
            updateData.notes = transfer.notes ? 
              `${transfer.notes}\n\n[ADMIN CANCELLED] ${reason || 'No reason provided'}` : 
              `[ADMIN CANCELLED] ${reason || 'No reason provided'}`;
            break;
          case 'reassign':
            if (reassignTo) {
              updateData.assignedTo = reassignTo;
            }
            break;
          case 'update_status':
            if (newStatus) {
              updateData.status = newStatus;
            }
            break;
          case 'update_priority':
            if (newPriority) {
              updateData.priority = newPriority;
            }
            break;
          case 'delete':
            await Transfer.findByIdAndDelete(transferId);
            results.push({ transferId, action: 'deleted' });
            continue;
        }

        if (action === 'cancel' || action === 'reassign' || action === 'update_status' || action === 'update_priority') {
          await Transfer.findByIdAndUpdate(transferId, updateData);
          results.push({ transferId, action, success: true });
        }

        // Log individual action
        await logAdminAction({
          adminId: adminUser._id.toString(),
          adminName: `${adminUser.firstName} ${adminUser.lastName}`,
          adminEmail: adminUser.email,
          adminRole: adminUser.userType as 'admin' | 'super_admin',
          action: AuditAction.BULK_TRANSFER_OPERATION,
          category: AuditCategory.TRANSFER_MANAGEMENT,
          description: `Bulk ${action} operation on transfer ${transferId}`,
          targetResource: {
            type: TargetResourceType.TRANSFER,
            id: transferId,
            name: transfer.transferId
          },
          metadata: {
            bulkOperation: true,
            operationType: action,
            reason,
            newStatus,
            newPriority,
            reassignTo
          },
          requestInfo: {
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            method: request.method,
            endpoint: request.url
          },
          outcome: 'success'
        });

      } catch (error) {
        errors.push({ 
          transferId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        errors,
        totalProcessed: transferIds.length,
        successCount: results.length,
        errorCount: errors.length
      },
      message: `Bulk operation completed: ${results.length} successful, ${errors.length} failed`
    });

  } catch (error) {
    console.error('Bulk operation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Bulk operation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}