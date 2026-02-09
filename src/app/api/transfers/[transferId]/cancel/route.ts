/**
 * Transfer Cancellation API
 *
 * This endpoint handles transfer cancellation by employees within the 4-hour window.
 */

import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database";
import Transfer from "@/models/Transfer";
import { AuthService } from "@/lib/auth";
import { TimelineService, ActorInfo, TransferStatus } from "@/lib/transfers";
import { canCancelTransfer } from "@/lib/transfers";
import { extractRequestInfo } from "@/lib/audit/utils/request";
import { log } from "@/lib/logging";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> },
) {
  const { transferId } = await params;

  try {
    const body = await request.json();
    const { reason } = body;

    if (!transferId) {
      return NextResponse.json(
        { error: "Transfer ID is required" },
        { status: 400 },
      );
    }

    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ["employee", "manager", "admin", "super_admin"],
      requireSession: true,
    });

    // DatabaseService handles connection automatically
    // Find the transfer
    const transfer = await DatabaseService.findById(Transfer, transferId, {
      populate: [
        {
          path: "requestedBy",
          select: "firstName lastName email phone userType",
        },
        {
          path: "assignedTo",
          select: "firstName lastName email phone userType",
        },
      ],
    });

    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 },
      );
    }

    // Check if transfer can be cancelled
    // Employees can only cancel within 4-hour window, managers/admins can cancel pending or accepted transfers
    const isAdmin = ["manager", "admin", "super_admin"].includes(user.userType);
    const canCancel = isAdmin
      ? transfer.status === "pending" || transfer.status === "accepted"
      : canCancelTransfer(transfer);

    if (!canCancel) {
      const errorMessage = isAdmin
        ? "Transfer cannot be cancelled. Only pending or accepted transfers can be cancelled by managers."
        : "Transfer cannot be cancelled. Either the 4-hour window has expired or the transfer is not in a cancellable state.";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Only the assigned employee or a manager/admin can cancel
    if (user.userType === "employee") {
      // Since assignedTo is populated, we need to compare with the _id field
      const assignedToId = transfer.assignedTo?._id?.toString();
      const userId = user._id.toString();

      // Also try comparing without toString() in case of type issues
      const assignedToIdRaw = transfer.assignedTo?._id;
      const userIdRaw = user._id;

      // Try multiple comparison methods
      const isAuthorized =
        assignedToId === userId ||
        assignedToIdRaw?.equals?.(userIdRaw) ||
        (assignedToIdRaw &&
          userIdRaw &&
          assignedToIdRaw.toString() === userIdRaw.toString());

      if (!isAuthorized) {
        return NextResponse.json(
          {
            error: `Only the assigned employee can cancel this transfer. Assigned to: ${assignedToId}, Current user: ${userId}`,
          },
          { status: 403 },
        );
      }
    }

    // Store previous assignment info for timeline
    const previousAssignee = transfer.assignedTo as any;
    const previousAssigneeName = previousAssignee
      ? `${previousAssignee.firstName} ${previousAssignee.lastName}`
      : "Unknown";

    // Extract request info for audit logging
    const requestInfo = extractRequestInfo(request);

    const actor: ActorInfo = {
      id: user._id as any,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      userType: (user.userType === "super_admin" ? "admin" : user.userType) as
        | "admin"
        | "manager"
        | "employee",
    };

    const transferIdString = transfer.transferId || transferId;
    const currentStatus = transfer.status;

    // Managers cancel transfers completely (set to cancelled status)
    // Employees return in_progress transfers to available pool (set to accepted status)
    if (isAdmin) {
      const cancellationReason = reason || "Transfer cancelled by manager";

      // Set status to cancelled
      transfer.status = TransferStatus.CANCELLED;
      transfer.lastModifiedBy = user._id as any;

      // Add to status history
      transfer.statusHistory.push({
        status: TransferStatus.CANCELLED,
        changedBy: user._id as any,
        changedAt: new Date(),
        reason: cancellationReason,
      });

      await transfer.save();

      // Create cancellation event with audit logging
      await TimelineService.createEventWithAudit(
        {
          type: "cancelled",
          title: "Transfer Cancelled",
          description: `Transfer cancelled by manager${cancellationReason ? ` - ${cancellationReason}` : ""}`,
          actor,
          metadata: {
            reason: cancellationReason,
            previousStatus: currentStatus,
            cancelledBy: "manager",
          },
        },
        transferIdString,
        requestInfo,
      );

      // Create status change event with audit logging
      await TimelineService.createEventWithAudit(
        {
          type: "status_changed",
          title: `Status Changed: ${currentStatus} → cancelled`,
          description: `Transfer status changed from ${currentStatus} to cancelled${cancellationReason ? ` - ${cancellationReason}` : ""}`,
          actor,
          metadata: {
            oldValue: currentStatus,
            newValue: TransferStatus.CANCELLED,
            reason: cancellationReason,
            details: `Status transition from ${currentStatus} to cancelled`,
          },
        },
        transferIdString,
        requestInfo,
      );
    } else {
      // Employee cancellation - return to available pool
      const cancellationReason =
        reason || "Employee cancelled transfer - returned to available pool";

      // Create unassignment event with audit logging
      await TimelineService.createEventWithAudit(
        {
          type: "unassigned",
          title: "Transfer Returned to Available Pool",
          description: `Transfer unassigned from ${previousAssigneeName} and returned to available pool`,
          actor,
          metadata: {
            previousAssignee: previousAssignee
              ? {
                  id: previousAssignee._id,
                  name: previousAssigneeName,
                  email: previousAssignee.email,
                }
              : null,
            reason: cancellationReason,
            details: `Previously assigned to: ${previousAssigneeName} (${previousAssignee?.email || "Unknown"})`,
            availableForReassignment: true,
          },
        },
        transferIdString,
        requestInfo,
      );

      // Clear assignment and update status
      // Note: This is a special case - transitioning from 'in_progress' to 'accepted'
      // to return transfer to available pool. This bypasses normal state machine rules.
      transfer.status = TransferStatus.ACCEPTED;
      transfer.assignedTo = undefined; // Clear assignment so other employees can take it
      transfer.lastModifiedBy = user._id as any;

      // Add to status history
      transfer.statusHistory.push({
        status: TransferStatus.ACCEPTED,
        changedBy: user._id as any,
        changedAt: new Date(),
        reason: cancellationReason,
      });

      await transfer.save();

      // Create status change event with audit logging (bypassing normal validation for this special case)
      await TimelineService.createEventWithAudit(
        {
          type: "status_changed",
          title: `Status Changed: ${currentStatus} → accepted`,
          description: `Transfer status changed from ${currentStatus} to accepted${cancellationReason ? ` - ${cancellationReason}` : ""}`,
          actor,
          metadata: {
            oldValue: currentStatus,
            newValue: TransferStatus.ACCEPTED,
            reason: cancellationReason,
            details: `Status transition from ${currentStatus} to accepted`,
          },
        },
        transferIdString,
        requestInfo,
      );
    }

    // Send notifications
    try {
      // Note: Real-time notifications are now handled by the global SSE system
      console.log(
        "✅ Transfer returned to available pool - real-time notifications handled by global SSE system",
      );

      // TODO: Implement email/SMS notification for transfer becoming available again
      console.log(
        "Transfer returned to available pool - SSE notification sent, email/SMS notification would be sent here",
      );
    } catch (notificationError) {
      console.error("Error sending notifications:", notificationError);
      // Don't fail the operation if notifications fail
    }

    return NextResponse.json({
      success: true,
      data: {
        message: isAdmin
          ? "Transfer cancelled successfully."
          : "Transfer returned to available pool. Other employees can now accept it.",
        transfer: {
          id: transfer._id,
          transferId: transfer.transferId,
          status: transfer.status,
          assignedTo: isAdmin ? transfer.assignedTo : null,
          ...(isAdmin
            ? {
                cancelledAt: new Date(),
                cancelledBy: {
                  id: user._id,
                  name: `${user.firstName} ${user.lastName}`,
                  email: user.email,
                },
              }
            : {
                unassignedAt: new Date(),
                unassignedBy: {
                  id: user._id,
                  name: `${user.firstName} ${user.lastName}`,
                  email: user.email,
                },
                availableForReassignment: true,
              }),
        },
      },
    });
  } catch (error) {
    log.error("Error cancelling transfer", error, {
      category: "transfer",
      operation: "cancel_transfer",
      transferId,
    });
    if (error instanceof Error) {
      if (error.message === "Authentication required") {
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 },
        );
      }
      if (error.message.includes("Access denied")) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> },
) {
  const { transferId } = await params;

  try {
    if (!transferId) {
      return NextResponse.json(
        { error: "Transfer ID is required" },
        { status: 400 },
      );
    }

    // DatabaseService handles connection automatically
    // Find the transfer
    const transfer = (await DatabaseService.findById(Transfer, transferId, {
      populate: [
        {
          path: "requestedBy",
          select: "firstName lastName email phone userType",
        },
        {
          path: "assignedTo",
          select: "firstName lastName email phone userType",
        },
      ],
    })) as any;

    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 },
      );
    }

    // Authenticate user to determine permissions
    const { user } = await AuthService.requireAuth(request, {
      roles: ["employee", "manager", "admin", "super_admin"],
      requireSession: true,
    });

    const isAdmin = ["manager", "admin", "super_admin"].includes(user.userType);
    const canCancel = isAdmin
      ? transfer.status === "pending" || transfer.status === "accepted"
      : canCancelTransfer(transfer);

    return NextResponse.json({
      success: true,
      data: {
        transfer: {
          id: transfer._id,
          transferId: transfer.transferId,
          status: transfer.status,
          acceptedAt: transfer.acceptedAt,
          canCancel: canCancel,
          assignedTo: transfer.assignedTo
            ? {
                id: transfer.assignedTo._id,
                name:
                  transfer.assignedTo.firstName && transfer.assignedTo.lastName
                    ? `${transfer.assignedTo.firstName} ${transfer.assignedTo.lastName}`
                    : "Unknown User",
                email: transfer.assignedTo.email || "Unknown Email",
              }
            : null,
        },
      },
    });
  } catch (error) {
    log.error("Error fetching transfer cancellation info", error, {
      category: "transfer",
      operation: "get_cancel_info",
      transferId,
    });
    if (error instanceof Error) {
      if (error.message === "Authentication required") {
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 },
        );
      }
      if (error.message.includes("Access denied")) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
