import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import Hospital from '@/models/Hospital';
import { requireManager, requireEmployeeOrManager, createErrorResponse, createSuccessResponse } from '@/lib/auth/auth-middleware';
import { validateTransferData } from '@/lib/transfers/transfer-validation';
import TimelineService from '@/lib/services/timeline-service';

// GET /api/transfers - Get transfer requests for employees
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const user = authResult.user;

    // Build query based on user type
    const query: any = {};
    
    if (user.userType === 'employee') {
      // Employees can only see approved transfers (not pending ones)
      // If no status specified, show only approved transfers
      if (status && status !== 'all') {
        if (status === 'pending') {
          // Employees cannot see pending transfers
          return createSuccessResponse({
            transfers: [],
            count: 0
          });
        }
        query.status = status;
      } else {
        // Default: only show approved and active transfers to employees
        query.status = { $in: ['accepted', 'in_progress', 'completed', 'cancelled'] };
      }
    } else if (user.userType === 'manager') {
      // Managers can see all transfers including pending ones
      if (status && status !== 'all') {
        query.status = status;
      }
      // If no status specified, get all transfers for managers
    }

    // Get transfers with populated data
    const transfers = await Transfer.find(query)
      .populate('requestedBy', 'firstName lastName email userType')
      .populate('fromHospital', 'name address organization')
      .populate('toHospital', 'name address organization')
      .sort({ requestedDate: -1 })
      .limit(50);

    return createSuccessResponse({
      transfers,
      count: transfers.length
    });

  } catch (error) {
    console.error('Error fetching transfers:', error);
    return createErrorResponse('Failed to fetch transfers', 'FETCH_ERROR', 500);
  }
}

// POST /api/transfers - Create a new transfer request (for managers)
export async function POST(request: NextRequest) {
  try {
    // Authenticate user - only managers can create transfers
    const authResult = await requireManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    const body = await request.json();
    const {
      transferCategory = 'patient', // Default to patient for backward compatibility
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
      issuer,
      priority = 'medium',
      reason,
      notes,
      medicalDocuments = [],
      scheduling
    } = body;

    // Validate transfer data
    const validation = validateTransferData(body);
    if (!validation.isValid) {
      return createErrorResponse('Validation failed', 'VALIDATION_ERROR', 400, {
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    // Use authenticated user
    const requestingUser = authResult.user;

    // Validate and get hospital references
    let fromHospitalRef, toHospitalRef;
    let fromHospitalName = fromHospital, toHospitalName = toHospital;

    if (fromHospitalId) {
      fromHospitalRef = await Hospital.findById(fromHospitalId);
      if (!fromHospitalRef) {
        return createErrorResponse('Invalid source hospital ID', 'VALIDATION_ERROR', 400);
      }
      fromHospitalName = fromHospitalRef.name;
    } else {
      // Fallback: find hospital by name
      fromHospitalRef = await Hospital.findOne({ name: fromHospital, isActive: true });
      if (!fromHospitalRef) {
        return createErrorResponse('Source hospital not found in system', 'VALIDATION_ERROR', 400);
      }
    }

    if (toHospitalId) {
      toHospitalRef = await Hospital.findById(toHospitalId);
      if (!toHospitalRef) {
        return createErrorResponse('Invalid destination hospital ID', 'VALIDATION_ERROR', 400);
      }
      toHospitalName = toHospitalRef.name;
    } else {
      // Fallback: find hospital by name
      toHospitalRef = await Hospital.findOne({ name: toHospital, isActive: true });
      if (!toHospitalRef) {
        return createErrorResponse('Destination hospital not found in system', 'VALIDATION_ERROR', 400);
      }
    }

    // Validate that hospitals are different
    if (fromHospitalRef._id.toString() === toHospitalRef._id.toString()) {
      return createErrorResponse('Source and destination hospitals must be different', 'VALIDATION_ERROR', 400);
    }

    // Generate unique transfer ID
    const transferId = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Combine date and time for scheduled transfer
    const scheduledDateTime = transferDate && transferTime ? 
      new Date(`${transferDate}T${transferTime}`) : 
      new Date();

    // Prepare transfer data based on category
    let transferData: any = {};
    let patientInfo: any = null;

    if (transferCategory === 'patient') {
      patientInfo = {
        firstName: patientFirstName,
        lastName: patientLastName,
        age: parseInt(patientAge as string),
        dossierNumber: patientDossierNumber
      };
      transferData.patientInfo = patientInfo;
    } else if (transferCategory === 'envelope') {
      transferData.envelopeInfo = {
        envelopeNumber,
        senderName,
        recipientName,
        contents,
        weight: weight ? parseFloat(weight.toString()) : undefined,
        dimensions
      };
    } else if (transferCategory === 'patient_file') {
      transferData.fileInfo = {
        patientName,
        dossierNumber,
        fileType,
        fileCount: fileCount ? parseInt(fileCount.toString()) : undefined,
        urgency: fileUrgency || 'medium'
      };
    } else if (transferCategory === 'medical_equipment') {
      transferData.equipmentInfo = {
        equipmentName,
        serialNumber,
        model,
        condition: condition || 'good',
        maintenanceRequired: maintenanceRequired || false,
        specialInstructions
      };
    }

    // Create timeline event for transfer creation
    const creationEvent = TimelineService.createTransferCreatedEvent(
      {
        id: requestingUser._id as any,
        name: `${requestingUser.firstName} ${requestingUser.lastName}`,
        email: requestingUser.email,
        userType: requestingUser.userType as 'manager' | 'employee' | 'admin'
      },
      {
        transferId,
        transferCategory,
        patientInfo: patientInfo || {
          firstName: patientName || 'N/A',
          lastName: '',
          age: 0,
          dossierNumber: dossierNumber || 'N/A'
        },
        fromHospitalName,
        toHospitalName,
        priority,
        reason
      }
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
      requestedBy: requestingUser._id,
      reason,
      priority,
      status: 'pending',
      requestedDate: new Date(),
      scheduledDate: scheduledDateTime,
      notes: `Issued by: ${issuer}${notes ? `\nAdditional notes: ${notes}` : ''}`,
      medicalDocuments,
      scheduling: {
        transferTime: transferTime || '09:00'
      },
      lastModifiedBy: requestingUser._id,
      statusHistory: [{
        status: 'pending',
        changedBy: requestingUser._id,
        changedAt: new Date(),
        reason: 'Transfer created'
      }],
      timeline: [creationEvent]
    });

    await transfer.save();

    // Populate the response
    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate('requestedBy', 'firstName lastName email userType phone')
      .populate('fromHospital', 'name address organization')
      .populate('toHospital', 'name address organization');

    // Note: Real-time notifications are now handled by the global SSE system
    console.log('✅ Transfer created successfully - notifications handled by global SSE system');

    // Send comprehensive notifications to admins (email + SMS)
    try {
      const TransferNotificationService = (await import('@/lib/communication/transfer-notification-service')).default;
      await TransferNotificationService.sendNewTransferRequestNotification(populatedTransfer, requestingUser);
    } catch (notificationError) {
      console.error('Error sending transfer request notifications:', notificationError);
    }

    return createSuccessResponse(populatedTransfer, 'Transfer request created successfully', 201);

  } catch (error) {
    console.error('Error creating transfer:', error);
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name
    });
    return createErrorResponse(`Failed to create transfer request: ${(error as Error).message}`, 'CREATE_ERROR', 500, {
      originalError: (error as Error).message,
      errorType: (error as Error).name
    });
  }
}
