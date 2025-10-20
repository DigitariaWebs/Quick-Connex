import { NextRequest, NextResponse } from 'next/server';
import { requireManager, handleAuthError, createSuccessResponse } from '@/lib/auth/auth-utils';
// import { logAdminAction } from '@/lib/auth/admin-middleware'; // Removed - using auth-utils instead
import dbConnect from '@/lib/database/mongoose';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import { Permission } from '@/models/User';
import { AuditAction, AuditCategory, TargetResourceType } from '@/models/AuditLog';

/**
 * Admin Transfer Actions API Endpoint
 * 
 * Provides specific admin actions for transfers:
 * - Force complete transfer
 * - Cancel transfer with reason
 * - Reassign transfer to different user
 * - Update transfer priority
 * - Add admin notes
 * - Override transfer status
 */

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/admin/transfers/[id]/actions - Perform admin action on transfer
export async function POST(
  request: NextRequest,
  { params }: PageProps
) {
  try {
    // Check admin permissions
    const { user } = await requireManager();

    const adminUser = user;
    const { id } = await params;
    const body = await request.json();

    const { action, reason, newStatus, newPriority, reassignTo, adminNote } = body;

    await dbConnect();

    const transfer = await Transfer.findById(id);
    if (!transfer) {
      return NextResponse.json({
        success: false,
        error: 'Transfer not found',
        message: 'The requested transfer does not exist'
      }, { status: 404 });
    }

    // Validate action and permissions
    const validationResult = validateAdminAction(adminUser, transfer, action);
    if (!validationResult.valid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action',
        message: validationResult.message
      }, { status: 400 });
    }

    // Store original values for audit
    const originalValues = {
      status: transfer.status,
      priority: transfer.priority,
      assignedTo: transfer.assignedTo,
      notes: transfer.notes
    };

    let updateData: any = {
      lastModifiedBy: adminUser._id,
      updatedAt: new Date()
    };

    let actionDescription = '';
    let auditAction: AuditAction = AuditAction.TRANSFER_UPDATED;

    // Perform the requested action
    switch (action) {
      case 'force_complete':
        updateData.status = 'completed';
        updateData.completedDate = new Date();
        actionDescription = 'Force completed by admin';
        auditAction = AuditAction.TRANSFER_FORCE_COMPLETED;
        
        // Add admin note
        const forceCompleteNote = `[ADMIN FORCE COMPLETED - ${new Date().toISOString()}] ${reason || 'No reason provided'}`;
        updateData.notes = transfer.notes ? 
          `${transfer.notes}\n\n${forceCompleteNote}` : 
          forceCompleteNote;
        break;

      case 'cancel':
        updateData.status = 'cancelled';
        actionDescription = `Cancelled by admin: ${reason || 'No reason provided'}`;
        auditAction = AuditAction.TRANSFER_CANCELLED;
        
        const cancelNote = `[ADMIN CANCELLED - ${new Date().toISOString()}] ${reason || 'No reason provided'}`;
        updateData.notes = transfer.notes ? 
          `${transfer.notes}\n\n${cancelNote}` : 
          cancelNote;
        break;

      case 'reassign':
        if (!reassignTo) {
          return NextResponse.json({
            success: false,
            error: 'Missing reassign target',
            message: 'reassignTo is required for reassign action'
          }, { status: 400 });
        }

        // Validate the target user exists and is an employee
        const targetUser = await User.findById(reassignTo);
        if (!targetUser || targetUser.userType !== 'employee') {
          return NextResponse.json({
            success: false,
            error: 'Invalid reassign target',
            message: 'Target user must be an employee'
          }, { status: 400 });
        }

        updateData.assignedTo = reassignTo;
        actionDescription = `Reassigned to ${targetUser.firstName} ${targetUser.lastName}`;
        auditAction = AuditAction.TRANSFER_REASSIGNED;
        
        const reassignNote = `[ADMIN REASSIGNED - ${new Date().toISOString()}] Reassigned to ${targetUser.firstName} ${targetUser.lastName}${reason ? ` - ${reason}` : ''}`;
        updateData.notes = transfer.notes ? 
          `${transfer.notes}\n\n${reassignNote}` : 
          reassignNote;
        break;

      case 'update_priority':
        if (!newPriority) {
          return NextResponse.json({
            success: false,
            error: 'Missing priority',
            message: 'newPriority is required for update_priority action'
          }, { status: 400 });
        }

        updateData.priority = newPriority;
        actionDescription = `Priority changed from ${transfer.priority} to ${newPriority}`;
        auditAction = AuditAction.TRANSFER_UPDATED;
        
        const priorityNote = `[ADMIN PRIORITY UPDATE - ${new Date().toISOString()}] Priority changed from ${transfer.priority} to ${newPriority}${reason ? ` - ${reason}` : ''}`;
        updateData.notes = transfer.notes ? 
          `${transfer.notes}\n\n${priorityNote}` : 
          priorityNote;
        break;

      case 'update_status':
        if (!newStatus) {
          return NextResponse.json({
            success: false,
            error: 'Missing status',
            message: 'newStatus is required for update_status action'
          }, { status: 400 });
        }

        updateData.status = newStatus;
        actionDescription = `Status changed from ${transfer.status} to ${newStatus}`;
        auditAction = AuditAction.TRANSFER_UPDATED;
        
        const statusNote = `[ADMIN STATUS UPDATE - ${new Date().toISOString()}] Status changed from ${transfer.status} to ${newStatus}${reason ? ` - ${reason}` : ''}`;
        updateData.notes = transfer.notes ? 
          `${transfer.notes}\n\n${statusNote}` : 
          statusNote;
        break;

      case 'add_note':
        if (!adminNote) {
          return NextResponse.json({
            success: false,
            error: 'Missing admin note',
            message: 'adminNote is required for add_note action'
          }, { status: 400 });
        }

        actionDescription = 'Admin note added';
        auditAction = AuditAction.TRANSFER_UPDATED;
        
        const noteText = `[ADMIN NOTE - ${new Date().toISOString()}] ${adminNote}`;
        updateData.notes = transfer.notes ? 
          `${transfer.notes}\n\n${noteText}` : 
          noteText;
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          message: `Unknown action: ${action}`
        }, { status: 400 });
    }

    // Update the transfer
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
      return NextResponse.json(
        { success: false, error: 'Transfer not found' },
        { status: 404 }
      );
    }

    // Add timeline entry
    const timelineEntry = {
      id: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'admin_action',
      title: actionDescription,
      description: actionDescription,
      timestamp: new Date(),
      actor: {
        id: adminUser._id,
        name: `${adminUser.firstName} ${adminUser.lastName}`,
        email: adminUser.email,
        userType: adminUser.userType
      },
      metadata: {
        action,
        reason,
        newStatus,
        newPriority,
        reassignTo,
        adminNote,
        before: originalValues,
        after: {
          status: updatedTransfer.status,
          priority: updatedTransfer.priority,
          assignedTo: updatedTransfer.assignedTo,
          notes: updatedTransfer.notes
        }
      },
      isSystemEvent: false,
      isVisible: true
    };

    // Add timeline entry to transfer
    await Transfer.findByIdAndUpdate(id, {
      $push: { timeline: timelineEntry }
    });

    // Log admin action (simplified implementation)
    console.log('Admin action logged:', {
      adminId: adminUser._id.toString(),
      adminName: `${adminUser.firstName} ${adminUser.lastName}`,
      adminEmail: adminUser.email,
      action,
      reason,
      newStatus,
      newPriority,
      reassignTo,
      adminNote
    });

    return NextResponse.json({
      success: true,
      data: { 
        transfer: updatedTransfer,
        action: {
          type: action,
          description: actionDescription,
          timestamp: new Date()
        }
      },
      message: `Transfer ${action.replace('_', ' ')} successful`
    });

  } catch (error) {
    console.error('Admin transfer action error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform action',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to validate admin actions
function validateAdminAction(adminUser: any, transfer: any, action: string) {
  switch (action) {
    case 'force_complete':
      if (!adminUser.hasPermission(Permission.FORCE_COMPLETE_TRANSFER)) {
        return { valid: false, message: 'You do not have permission to force complete transfers' };
      }
      if (transfer.status !== 'in_progress') {
        return { valid: false, message: 'Can only force complete transfers that are in progress' };
      }
      break;

    case 'cancel':
      if (!adminUser.hasPermission(Permission.CANCEL_ANY_TRANSFER)) {
        return { valid: false, message: 'You do not have permission to cancel transfers' };
      }
      if (transfer.status === 'cancelled' || transfer.status === 'completed') {
        return { valid: false, message: 'Cannot cancel already completed or cancelled transfers' };
      }
      break;

    case 'reassign':
      if (!adminUser.hasPermission(Permission.REASSIGN_TRANSFERS)) {
        return { valid: false, message: 'You do not have permission to reassign transfers' };
      }
      if (transfer.status === 'cancelled' || transfer.status === 'completed') {
        return { valid: false, message: 'Cannot reassign completed or cancelled transfers' };
      }
      break;

    case 'update_priority':
      if (!adminUser.hasPermission(Permission.EDIT_ANY_TRANSFER)) {
        return { valid: false, message: 'You do not have permission to edit transfers' };
      }
      break;

    case 'update_status':
      if (!adminUser.hasPermission(Permission.EDIT_ANY_TRANSFER)) {
        return { valid: false, message: 'You do not have permission to edit transfers' };
      }
      break;

    case 'add_note':
      // All admins can add notes
      break;

    default:
      return { valid: false, message: `Unknown action: ${action}` };
  }

  return { valid: true };
}


