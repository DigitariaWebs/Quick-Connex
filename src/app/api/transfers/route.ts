import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import Hospital from '@/models/Hospital';
import { requireManager, requireEmployeeOrManager, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware';
import { validateTransferData } from '@/lib/transfer-validation';
import { getNotificationService } from '@/lib/socket-server';

// GET /api/transfers - Get all transfer requests for employees
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

    // Build query - if no status specified, get all transfers
    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
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
      patientFirstName,
      patientLastName,
      patientAge,
      patientDossierNumber,
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

    // Create transfer request with embedded patient info
    const transfer = new Transfer({
      transferId,
      patientInfo: {
        firstName: patientFirstName,
        lastName: patientLastName,
        age: parseInt(patientAge as string),
        dossierNumber: patientDossierNumber
      },
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
      }]
    });

    await transfer.save();

    // Populate the response
    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate('requestedBy', 'firstName lastName email userType phone')
      .populate('fromHospital', 'name address organization')
      .populate('toHospital', 'name address organization');

    // Send real-time notification for new transfer
    try {
      const { getNotificationService } = await import('@/lib/socket-server');
      const notificationService = getNotificationService();
      if (notificationService) {
        await notificationService.sendTransferStatusChange(
          populatedTransfer,
          null,
          'pending',
          requestingUser
        );
      }
    } catch (notificationError) {
      console.error('Error sending real-time notification:', notificationError);
    }

    // Send SMS notification to admins
    try {
      const TransferSMSService = (await import('@/lib/communication/transfer-sms-service')).default;
      
      if (populatedTransfer.priority === 'urgent') {
        await TransferSMSService.sendUrgentTransferRequestSMS(populatedTransfer, requestingUser);
      } else {
        await TransferSMSService.sendNewTransferRequestSMS(populatedTransfer, requestingUser);
      }
    } catch (smsError) {
      console.error('Error sending SMS notification:', smsError);
    }

    return createSuccessResponse(populatedTransfer, 'Transfer request created successfully', 201);

  } catch (error) {
    console.error('Error creating transfer:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return createErrorResponse(`Failed to create transfer request: ${error.message}`, 'CREATE_ERROR', 500, {
      originalError: error.message,
      errorType: error.name
    });
  }
}
