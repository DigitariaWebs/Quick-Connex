import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database";
import Transfer from "@/models/Transfer";
import User from "@/models/User";
import Hospital from "@/models/Hospital";
import Patient from "@/models/Patient";
import { AuthService } from "@/lib/auth";
import { Types } from "mongoose";
import { validateTransferData, TransferStatus } from "@/lib/transfers";
import { TimelineService } from "@/lib/transfers";
import { createSuccessResponse } from "@/lib/utils/api-responses";
import { extractRequestInfo } from "@/lib/audit/utils/request";
import { log } from "@/lib/logging";

// GET /api/transfers - Get transfer requests for employees
export async function GET(request: NextRequest) {
  try {
    // Authenticate user with full session validation
    const { user } = await AuthService.requireAuth(request, {
      roles: ["employee", "manager", "admin", "super_admin"],
      requireSession: true,
    });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const scheduledDate = searchParams.get("scheduledDate");

    // Build query based on user type
    const query: any = {};

    // Handle scheduledDate filter (for Today's Schedule modal)
    if (scheduledDate) {
      const startOfDay = new Date(scheduledDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(scheduledDate);
      endOfDay.setHours(23, 59, 59, 999);

      query.scheduledDate = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    if (user.userType === "employee") {
      // Employees can only see approved transfers (not pending ones)
      // If no status specified, show only approved transfers
      if (status && status !== "all") {
        if (status === TransferStatus.PENDING) {
          // Employees cannot see pending transfers
          return NextResponse.json({
            success: true,
            data: {
              transfers: [],
              count: 0,
            },
          });
        }
        query.status = status;
      } else {
        // Default: only show approved and active transfers to employees (exclude cancelled)
        query.status = {
          $in: [
            TransferStatus.ACCEPTED,
            TransferStatus.IN_PROGRESS,
            TransferStatus.COMPLETED,
          ],
        };
      }
    } else if (user.userType === "manager") {
      // Managers can only see transfers they created
      query.requestedBy = user._id;
      if (status && status !== "all") {
        query.status = status;
      }
      // If no status specified, get all transfers created by this manager
    } else if (user.userType === "admin" || user.userType === "super_admin") {
      // Admins and super admins can see all transfers including pending ones
      if (status && status !== "all") {
        query.status = status;
      }
      // If no status specified, get all transfers for admins/super_admins
    }

    // Get transfers with populated data using DatabaseService
    const transfers = await DatabaseService.findMany(Transfer, query, {
      populate: [
        { path: "requestedBy", select: "firstName lastName email userType" },
        { path: "fromHospital", select: "name address organization" },
        { path: "toHospital", select: "name address organization" },
      ],
      sort: { requestedDate: -1 },
      limit: 50,
    });

    return NextResponse.json({
      success: true,
      data: {
        transfers,
        count: transfers.length,
      },
    });
  } catch (error) {
    log.error("Error fetching transfers", error, {
      category: "transfer",
      operation: "get_transfers",
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

// POST /api/transfers - Create a new transfer request (for managers)
export async function POST(request: NextRequest) {
  try {
    // Authenticate user - only managers can create transfers
    const { user } = await AuthService.requireAuth(request, {
      roles: ["manager", "admin", "super_admin"],
      requireSession: true,
    });

    // DatabaseService handles connection automatically

    const body = await request.json();
    const {
      transferCategory = "patient", // Default to patient for backward compatibility
      patientFirstName,
      patientLastName,
      patientAge,
      patientDossierNumber,
      // Envelope fields
      envelopeNumber,
      senderName,
      recipientName,
      contents,
      weight,
      dimensions,
      // File fields
      patientName,
      dossierNumber,
      fileType,
      fileCount,
      fileUrgency,
      // Equipment fields
      equipmentName,
      serialNumber,
      model,
      condition,
      maintenanceRequired,
      specialInstructions,
      // Common fields
      fromHospital,
      toHospital,
      fromHospitalId,
      toHospitalId,
      transferDate,
      transferTime,
      transferType,
      priority = "medium",
      reason,
      notes,
      medicalDocuments = [],
      scheduling,
    } = body;

    // Validate transfer data
    const validation = validateTransferData(body);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 },
      );
    }

    // Use authenticated user
    const requestingUser = user;
    const issuerFromUser = `${requestingUser.firstName} ${requestingUser.lastName}`;

    // Validate and get hospital references
    let fromHospitalRef, toHospitalRef;
    let fromHospitalName = fromHospital,
      toHospitalName = toHospital;

    if (fromHospitalId) {
      fromHospitalRef = await Hospital.findById(fromHospitalId);
      if (!fromHospitalRef) {
        return NextResponse.json(
          { error: "Invalid source hospital ID" },
          { status: 400 },
        );
      }
      fromHospitalName = fromHospitalRef.name;
    } else {
      // Fallback: find hospital by name
      fromHospitalRef = await Hospital.findOne({
        name: fromHospital,
        isActive: true,
      });
      if (!fromHospitalRef) {
        return NextResponse.json(
          { error: "Source hospital not found in system" },
          { status: 400 },
        );
      }
    }

    if (toHospitalId) {
      toHospitalRef = await Hospital.findById(toHospitalId);
      if (!toHospitalRef) {
        return NextResponse.json(
          { error: "Invalid destination hospital ID" },
          { status: 400 },
        );
      }
      toHospitalName = toHospitalRef.name;
    } else {
      // Fallback: find hospital by name
      toHospitalRef = await Hospital.findOne({
        name: toHospital,
        isActive: true,
      });
      if (!toHospitalRef) {
        return NextResponse.json(
          { error: "Destination hospital not found in system" },
          { status: 400 },
        );
      }
    }

    // Validate that hospitals are different
    if (
      (fromHospitalRef._id as any).toString() ===
      (toHospitalRef._id as any).toString()
    ) {
      return NextResponse.json(
        { error: "Source and destination hospitals must be different" },
        { status: 400 },
      );
    }

    // Generate unique transfer ID
    const transferId = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Combine date and time for scheduled transfer
    const scheduledDateTime =
      transferDate && transferTime
        ? new Date(`${transferDate}T${transferTime}`)
        : new Date();

    // Prepare transfer data based on category
    let transferData: any = {};
    let patientInfo: any = null;
    let patientRecord: any = null;

    if (transferCategory === "patient") {
      patientInfo = {
        firstName: patientFirstName,
        lastName: patientLastName,
        age: parseInt(patientAge as string),
        dossierNumber: patientDossierNumber,
      };
      transferData.patientInfo = patientInfo;

      // Create or find existing patient in Patient collection
      try {
        // Check if patient already exists by dossier number
        patientRecord = await Patient.findOne({
          dossierNumber: patientDossierNumber.toUpperCase(),
          isActive: true,
        });

        if (!patientRecord) {
          // Create new patient record
          patientRecord = new Patient({
            firstName: patientFirstName,
            lastName: patientLastName,
            age: parseInt(patientAge as string),
            dossierNumber: patientDossierNumber.toUpperCase(),
            createdBy: new Types.ObjectId(requestingUser._id),
            lastModifiedBy: new Types.ObjectId(requestingUser._id),
            isActive: true,
          });
          await patientRecord.save();
          log.info("New patient record created", {
            category: "transfer",
            operation: "create_patient",
            patientId: patientRecord._id?.toString(),
          });
        } else {
          // Update existing patient record with latest info
          patientRecord.firstName = patientFirstName;
          patientRecord.lastName = patientLastName;
          patientRecord.age = parseInt(patientAge as string);
          patientRecord.lastModifiedBy = new Types.ObjectId(requestingUser._id);
          await patientRecord.save();
          log.info("Existing patient record updated", {
            category: "transfer",
            operation: "update_patient",
            patientId: patientRecord._id?.toString(),
          });
        }
      } catch (patientError) {
        log.error("Error creating/updating patient record", patientError, {
          category: "transfer",
          operation: "patient_record_error",
        });
        // Continue with transfer creation even if patient record fails
        // This ensures transfer creation isn't blocked by patient record issues
      }
    } else if (transferCategory === "envelope") {
      transferData.envelopeInfo = {
        envelopeNumber,
        senderName,
        recipientName,
        contents,
        weight: weight ? parseFloat(weight.toString()) : undefined,
        dimensions,
      };
    } else if (transferCategory === "patient_file") {
      transferData.fileInfo = {
        patientName,
        dossierNumber,
        fileType,
        fileCount: fileCount ? parseInt(fileCount.toString()) : undefined,
        urgency: fileUrgency || "medium",
      };
    } else if (transferCategory === "medical_instruments") {
      transferData.equipmentInfo = {
        equipmentName,
        serialNumber,
        condition: condition || "good",
        specialInstructions,
      };
    }

    // Extract request info for audit logging
    const requestInfo = extractRequestInfo(request);

    // Create timeline event for transfer creation with audit logging
    const creationEvent = await TimelineService.createEventWithAudit(
      {
        type: "created",
        title: "Transfer Request Created",
        description: `Transfer request created for ${patientInfo?.firstName || patientName || "patient"} ${patientInfo?.lastName || ""}`,
        actor: {
          id: new Types.ObjectId(requestingUser._id),
          name: `${requestingUser.firstName} ${requestingUser.lastName}`,
          email: requestingUser.email,
          userType: requestingUser.userType as "manager" | "employee" | "admin",
        },
        metadata: {
          transferCategory,
          fromHospital: fromHospitalName,
          toHospital: toHospitalName,
          priority,
          reason,
        },
      },
      transferId,
      requestInfo,
    );

    // Create transfer request with polymorphic data
    const transfer = new Transfer({
      transferId,
      transferCategory,
      patientInfo, // Legacy field for backward compatibility
      transferData,
      fromHospital: fromHospitalRef._id,
      toHospital: toHospitalRef._id,
      fromHospitalName,
      toHospitalName,
      requestedBy: new Types.ObjectId(requestingUser._id),
      patient: patientRecord?._id, // Link to patient record if available
      reason,
      priority,
      status: TransferStatus.PENDING,
      requestedDate: new Date(),
      scheduledDate: scheduledDateTime,
      notes: `Issued by: ${issuerFromUser}${notes ? `\nAdditional notes: ${notes}` : ""}`,
      medicalDocuments,
      scheduling: {
        transferTime: transferTime || "09:00",
      },
      lastModifiedBy: new Types.ObjectId(requestingUser._id),
      statusHistory: [
        {
          status: TransferStatus.PENDING,
          changedBy: new Types.ObjectId(requestingUser._id),
          changedAt: new Date(),
          reason: "Transfer created",
        },
      ],
    });

    await transfer.save();

    // Populate the response
    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate("requestedBy", "firstName lastName email userType phone")
      .populate("fromHospital", "name address organization")
      .populate("toHospital", "name address organization")
      .populate("patient", "firstName lastName age dossierNumber");

    // Note: Real-time notifications are now handled by the global SSE system
    log.info(
      "Transfer created successfully - notifications handled by global SSE system",
      {
        category: "transfer",
        operation: "create_transfer",
        transferId,
        userId: requestingUser._id?.toString(),
      },
    );

    // Send comprehensive notifications to admins (email + SMS)
    try {
      log.debug("Fetching full user data for notifications", {
        category: "transfer",
        operation: "notification_setup",
      });

      // Fetch the full user data from database for notifications
      let fullUserData;
      try {
        fullUserData = await User.findById(
          new Types.ObjectId(requestingUser._id),
        ).select("firstName lastName email phone userType");
      } catch (dbError) {
        log.error("Database error fetching user data", dbError, {
          category: "transfer",
          operation: "notification_setup",
        });
        return createSuccessResponse(
          populatedTransfer,
          "Transfer request created successfully",
          201,
        );
      }

      if (!fullUserData) {
        log.warn("Full user data not found for notifications", {
          category: "transfer",
          operation: "notification_setup",
        });
        return createSuccessResponse(
          populatedTransfer,
          "Transfer request created successfully",
          201,
        );
      }

      log.debug("Starting notification service", {
        category: "transfer",
        operation: "notification_setup",
      });
      const TransferNotificationService = (
        await import(
          "@/lib/communication/integrations/TransferNotificationService"
        )
      ).default;
      await TransferNotificationService.sendNewTransferRequestNotification(
        populatedTransfer,
        fullUserData,
      );
      log.info("Notifications sent successfully", {
        category: "transfer",
        operation: "notification_setup",
        transferId,
      });
    } catch (notificationError) {
      log.error(
        "Error sending transfer request notifications",
        notificationError,
        {
          category: "transfer",
          operation: "notification_setup",
          transferId,
          errorDetails: {
            message:
              notificationError instanceof Error
                ? notificationError.message
                : "Unknown error",
            stack:
              notificationError instanceof Error
                ? notificationError.stack
                : undefined,
            name:
              notificationError instanceof Error
                ? notificationError.name
                : "Unknown",
          },
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: populatedTransfer,
        message: "Transfer request created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    log.error("Error creating transfer", error, {
      category: "transfer",
      operation: "create_transfer",
      errorDetails: {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name,
      },
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
