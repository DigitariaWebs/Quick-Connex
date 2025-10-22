import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleAuthError, createSuccessResponse } from '@/lib/auth/auth-utils';
// import { logAdminAction } from '@/lib/auth/admin-middleware'; // Removed - using auth-utils instead
import dbConnect from '@/lib/database/mongoose';
import { Transfer, User } from '@/lib/database/models';
import { Permission } from '@/models/User';
import { AuditAction, AuditCategory, TargetResourceType } from '@/models/UnifiedAuditLog';

/**
 * Individual Transfer Admin API Endpoint
 * 
 * Provides detailed transfer management for administrators:
 * - Get full transfer details with admin context
 * - Update transfer with admin privileges
 * - Delete transfer (with audit trail)
 * - Force complete transfers
 * - Reassign transfers
 * - Add admin notes
 */

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/admin/transfers/[id] - Get detailed transfer information
export async function GET(
  request: NextRequest,
  { params }: PageProps
) {
  try {
    // Check admin permissions
    const { user } = await requireAdmin();

    const adminUser = user;
    const { id } = await params;

    // Check specific permissions
    const hasPermission = adminUser.userType === 'super_admin' || 
                          adminUser.userType === 'admin';
    
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions',
        message: 'You do not have permission to view transfer details'
      }, { status: 403 });
    }

    await dbConnect();

    // Get transfer with all populated data
    const transfer = await Transfer.findById(id)
      .populate('requestedBy', 'firstName lastName email userType phone')
      .populate('fromHospital', 'name address organization phone')
      .populate('toHospital', 'name address organization phone')
      .populate('assignedTo', 'firstName lastName email userType phone')
      .populate('patient', 'firstName lastName age dossierNumber')
      .populate('lastModifiedBy', 'firstName lastName email userType');

    if (!transfer) {
      return NextResponse.json({
        success: false,
        error: 'Transfer not found',
        message: 'The requested transfer does not exist'
      }, { status: 404 });
    }

    // Get related transfers (same patient, same hospitals, etc.)
    const relatedTransfers = await Transfer.find({
      _id: { $ne: transfer._id },
      $or: [
        { 'patientInfo.dossierNumber': transfer.patientInfo?.dossierNumber },
        { fromHospital: transfer.fromHospital },
        { toHospital: transfer.toHospital },
        { requestedBy: transfer.requestedBy }
      ]
    })
    .populate('requestedBy', 'firstName lastName email')
    .populate('fromHospital', 'name')
    .populate('toHospital', 'name')
    .sort({ requestedDate: -1 })
    .limit(5);

    // Get transfer timeline with admin context
    const timeline = transfer.timeline || [];
    const adminTimeline = timeline.filter((event: any) => 
      event.actor.userType === 'admin' || event.actor.userType === 'super_admin'
    );

    // Get available actions based on permissions and transfer status
    const availableActions = getAvailableActions(adminUser, transfer);

    // Log admin action
    console.log('Admin action logged:', {
      adminId: adminUser._id.toString(),
      adminName: `${adminUser.firstName} ${adminUser.lastName}`,
      adminEmail: adminUser.email,
      adminRole: adminUser.userType as 'admin' | 'super_admin',
      action: AuditAction.DATA_EXPORTED,
      category: AuditCategory.DATA_ACCESS,
      description: `Viewed transfer details for ${transfer.transferId}`,
      targetResource: {
        type: TargetResourceType.TRANSFER,
        id: (transfer._id as any).toString(),
        name: transfer.transferId
      },
      requestInfo: {
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        method: request.method,
        endpoint: request.url
      },
      outcome: 'success',
      metadata: {
        transferId: transfer.transferId,
        status: transfer.status,
        priority: transfer.priority
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        transfer,
        relatedTransfers,
        adminTimeline,
        availableActions,
        adminContext: {
          canEdit: adminUser.userType === 'super_admin' || adminUser.userType === 'admin',
          canCancel: adminUser.userType === 'super_admin' || adminUser.userType === 'admin',
          canReassign: adminUser.userType === 'super_admin' || adminUser.userType === 'admin',
          canForceComplete: adminUser.userType === 'super_admin' || adminUser.userType === 'admin',
          canDelete: adminUser.userType === 'super_admin'
        }
      }
    });

  } catch (error) {
    console.error('Admin transfer details API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch transfer details',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT /api/admin/transfers/[id] - Update transfer with admin privileges
export async function PUT(
  request: NextRequest,
  { params }: PageProps
) {
  try {
    // Check admin permissions
    const { user } = await requireAdmin();

    const adminUser = user;
    const { id } = await params;
    const body = await request.json();

    // Check specific permissions
    const hasEditPermission = adminUser.userType === 'super_admin' || adminUser.userType === 'admin';
    
    if (!hasEditPermission) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions',
        message: 'You do not have permission to edit transfers'
      }, { status: 403 });
    }

    await dbConnect();

    const transfer = await Transfer.findById(id);
    if (!transfer) {
      return NextResponse.json({
        success: false,
        error: 'Transfer not found',
        message: 'The requested transfer does not exist'
      }, { status: 404 });
    }

    // Store original values for audit
    const originalValues = {
      status: transfer.status,
      priority: transfer.priority,
      assignedTo: transfer.assignedTo,
      notes: transfer.notes
    };

    // Prepare update data
    const updateData = {
      ...body,
      lastModifiedBy: adminUser._id,
      updatedAt: new Date()
    };

    // Add admin note if provided
    if (body.adminNote) {
      const adminNote = `[ADMIN UPDATE - ${new Date().toISOString()}] ${body.adminNote}`;
      updateData.notes = transfer.notes ? 
        `${transfer.notes}\n\n${adminNote}` : 
        adminNote;
    }

    // Update transfer
    const updatedTransfer = await Transfer.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'requestedBy', select: 'firstName lastName email userType' },
      { path: 'fromHospital', select: 'name address organization' },
      { path: 'toHospital', select: 'name address organization' },
      { path: 'assignedTo', select: 'firstName lastName email userType' },
      { path: 'lastModifiedBy', select: 'firstName lastName email userType' }
    ]);

    if (!updatedTransfer) {
      return NextResponse.json({
        success: false,
        error: 'Transfer not found',
        message: 'The transfer could not be updated'
      }, { status: 404 });
    }

    // Log admin action
    console.log('Admin action logged:', {
      adminId: adminUser._id.toString(),
      adminName: `${adminUser.firstName} ${adminUser.lastName}`,
      adminEmail: adminUser.email,
      adminRole: adminUser.userType as 'admin' | 'super_admin',
      action: AuditAction.TRANSFER_UPDATED,
      category: AuditCategory.TRANSFER_MANAGEMENT,
      description: `Updated transfer ${transfer.transferId}`,
      targetResource: {
        type: TargetResourceType.TRANSFER,
        id: (transfer._id as any).toString(),
        name: transfer.transferId
      },
      changes: {
        before: originalValues,
        after: {
          status: updatedTransfer.status,
          priority: updatedTransfer.priority,
          assignedTo: updatedTransfer.assignedTo,
          notes: updatedTransfer.notes
        }
      },
      metadata: {
        adminNote: body.adminNote
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
      data: { transfer: updatedTransfer },
      message: 'Transfer updated successfully'
    });

  } catch (error) {
    console.error('Admin transfer update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update transfer',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/admin/transfers/[id] - Delete transfer (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: PageProps
) {
  try {
    // Check admin permissions
    const { user } = await requireAdmin();

    const adminUser = user;
    const { id } = await params;

    // Check specific permissions
    const hasDeletePermission = adminUser.userType === 'super_admin';
    
    if (!hasDeletePermission) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions',
        message: 'You do not have permission to delete transfers'
      }, { status: 403 });
    }

    await dbConnect();

    const transfer = await Transfer.findById(id);
    if (!transfer) {
      return NextResponse.json({
        success: false,
        error: 'Transfer not found',
        message: 'The requested transfer does not exist'
      }, { status: 404 });
    }

    // Store transfer data for audit before deletion
    const transferData = {
      transferId: transfer.transferId,
      status: transfer.status,
      priority: transfer.priority,
      requestedBy: transfer.requestedBy,
      fromHospital: transfer.fromHospital,
      toHospital: transfer.toHospital,
      patientInfo: transfer.patientInfo
    };

    // Delete transfer
    await Transfer.findByIdAndDelete(id);

    // Log admin action
    console.log('Admin action logged:', {
      adminId: adminUser._id.toString(),
      adminName: `${adminUser.firstName} ${adminUser.lastName}`,
      adminEmail: adminUser.email,
      adminRole: adminUser.userType as 'admin' | 'super_admin',
      action: AuditAction.TRANSFER_DELETED,
      category: AuditCategory.TRANSFER_MANAGEMENT,
      description: `Deleted transfer ${transferData.transferId}`,
      targetResource: {
        type: TargetResourceType.TRANSFER,
        id: id,
        name: transferData.transferId
      },
      metadata: {
        deletedTransfer: transferData,
        reason: 'Admin deletion'
      },
      requestInfo: {
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        method: request.method,
        endpoint: request.url
      },
      outcome: 'success',
      isSensitive: true
    });

    return NextResponse.json({
      success: true,
      message: 'Transfer deleted successfully'
    });

  } catch (error) {
    console.error('Admin transfer deletion error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete transfer',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to determine available actions
function getAvailableActions(adminUser: any, transfer: any) {
  const actions = [];

  // Admin and super_admin users have all permissions
  const isAdmin = adminUser.userType === 'admin' || adminUser.userType === 'super_admin';

  // Approval actions for pending transfers
  if (transfer.status === 'pending') {
    // Approve action
    actions.push({
      id: 'approve',
      label: 'Approve Transfer',
      description: 'Approve this transfer request',
      icon: 'ThumbsUp',
      color: 'green',
      requiresConfirmation: true,
      requiresReason: false
    });

    // Reject action
    actions.push({
      id: 'reject',
      label: 'Reject Transfer',
      description: 'Reject this transfer request',
      icon: 'ThumbsDown',
      color: 'red',
      requiresConfirmation: true,
      requiresReason: true
    });
  }

  // Cancel action - available for admins and users with permission
  if ((isAdmin || adminUser.hasPermission(Permission.CANCEL_ANY_TRANSFER)) && 
      transfer.status !== 'cancelled' && transfer.status !== 'completed') {
    actions.push({
      id: 'cancel',
      label: 'Cancel Transfer',
      description: 'Cancel this transfer with a reason',
      icon: 'X',
      color: 'red',
      requiresConfirmation: true,
      requiresReason: true
    });
  }

  // Force complete action - available for admins and users with permission
  if ((isAdmin || adminUser.hasPermission(Permission.FORCE_COMPLETE_TRANSFER)) && 
      transfer.status === 'in_progress') {
    actions.push({
      id: 'force_complete',
      label: 'Force Complete',
      description: 'Mark transfer as completed without employee confirmation',
      icon: 'CheckCircle',
      color: 'green',
      requiresConfirmation: true
    });
  }

  // Reassign action - available for admins and users with permission
  if ((isAdmin || adminUser.hasPermission(Permission.REASSIGN_TRANSFERS)) && 
      transfer.status !== 'completed' && transfer.status !== 'cancelled') {
    actions.push({
      id: 'reassign',
      label: 'Reassign Transfer',
      description: 'Assign this transfer to a different employee',
      icon: 'UserCheck',
      color: 'blue',
      requiresConfirmation: false
    });
  }

  // Update priority action - available for admins and users with permission
  if (isAdmin || adminUser.hasPermission(Permission.EDIT_ANY_TRANSFER)) {
    actions.push({
      id: 'update_priority',
      label: 'Update Priority',
      description: 'Change the priority level of this transfer',
      icon: 'Flag',
      color: 'orange',
      requiresConfirmation: false
    });
  }

  // Add admin note action - always available for admins
  if (isAdmin) {
    actions.push({
      id: 'add_note',
      label: 'Add Admin Note',
      description: 'Add an internal note visible to admins',
      icon: 'MessageSquare',
      color: 'gray',
      requiresConfirmation: false
    });
  }

  return actions;
}
