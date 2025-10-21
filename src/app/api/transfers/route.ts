import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/database/mongoose';
import { Transfer, User, Hospital, Patient } from '@/lib/database/models';
import { requireEmployeeOrManager, requireManager, handleAuthError, createErrorResponse, createSuccessResponse } from '@/lib/auth/auth-utils';
import { validateTransferData } from '@/lib/transfers/transfer-validation';
import TimelineService from '@/lib/services/timeline-service';

// GET /api/transfers - Get transfer requests for employees
export async function GET(request: NextRequest) {
  try {
    // Authenticate user with full session validation
    const { user } = await requireEmployeeOrManager();

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const scheduledDate = searchParams.get('scheduledDate');

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
        $lte: endOfDay
      };
    }
    
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
    return handleAuthError(error);
  }
}

// POST /api/transfers - Create a new transfer request (for managers)
export async function POST(request: NextRequest) {
  try {
    // Authenticate user - only managers can create transfers
    const { user } = await requireManager();

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
      priority = 'medium',
      reason,
      notes,
      medicalDocuments = [],
      scheduling
    } = body;

    // Validate transfer data
    const validation = validateTransferData(body);
    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Validation failed',
        errors: validation.errors,
        warnings: validation.warnings
      }, { status: 400 });
    }

    // Use authenticated user
    const requestingUser = user;
    const issuerFromUser = `${requestingUser.firstName} ${requestingUser.lastName}`;

    // Validate and get hospital references
    let fromHospitalRef, toHospitalRef;
    let fromHospitalName = fromHospital, toHospitalName = toHospital;

    if (fromHospitalId) {
      fromHospitalRef = await Hospital.findById(fromHospitalId);
      if (!fromHospitalRef) {
        return NextResponse.json({ error: 'Invalid source hospital ID' }, { status: 400 });
      }
      fromHospitalName = fromHospitalRef.name;
    } else {
      // Fallback: find hospital by name
      fromHospitalRef = await Hospital.findOne({ name: fromHospital, isActive: true });
      if (!fromHospitalRef) {
        return NextResponse.json({ error: 'Source hospital not found in system' }, { status: 400 });
      }
    }

    if (toHospitalId) {
      toHospitalRef = await Hospital.findById(toHospitalId);
      if (!toHospitalRef) {
        return NextResponse.json({ error: 'Invalid destination hospital ID' }, { status: 400 });
      }
      toHospitalName = toHospitalRef.name;
    } else {
      // Fallback: find hospital by name
      toHospitalRef = await Hospital.findOne({ name: toHospital, isActive: true });
      if (!toHospitalRef) {
        return NextResponse.json({ error: 'Destination hospital not found in system' }, { status: 400 });
      }
    }

    // Validate that hospitals are different
    if ((fromHospitalRef._id as any).toString() === (toHospitalRef._id as any).toString()) {
      return NextResponse.json({ error: 'Source and destination hospitals must be different' }, { status: 400 });
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
    let patientRecord: any = null;

    if (transferCategory === 'patient') {
      patientInfo = {
        firstName: patientFirstName,
        lastName: patientLastName,
        age: parseInt(patientAge as string),
        dossierNumber: patientDossierNumber
      };
      transferData.patientInfo = patientInfo;

      // Create or find existing patient in Patient collection
      try {
        // Check if patient already exists by dossier number
        patientRecord = await Patient.findOne({ 
          dossierNumber: patientDossierNumber.toUpperCase(),
          isActive: true 
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
            isActive: true
          });
          await patientRecord.save();
          console.log('✅ New patient record created:', patientRecord._id);
        } else {
          // Update existing patient record with latest info
          patientRecord.firstName = patientFirstName;
          patientRecord.lastName = patientLastName;
          patientRecord.age = parseInt(patientAge as string);
          patientRecord.lastModifiedBy = new Types.ObjectId(requestingUser._id);
          await patientRecord.save();
          console.log('✅ Existing patient record updated:', patientRecord._id);
        }
      } catch (patientError) {
        console.error('Error creating/updating patient record:', patientError);
        // Continue with transfer creation even if patient record fails
        // This ensures transfer creation isn't blocked by patient record issues
      }
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
    } else if (transferCategory === 'medical_instruments') {
      transferData.equipmentInfo = {
        equipmentName,
        serialNumber,
        condition: condition || 'good',
        specialInstructions
      };
    }

    // Create timeline event for transfer creation
    const creationEvent = TimelineService.createTransferCreatedEvent(
      {
        id: new Types.ObjectId(requestingUser._id),
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
      requestedBy: new Types.ObjectId(requestingUser._id),
      patient: patientRecord?._id, // Link to patient record if available
      reason,
      priority,
      status: 'pending',
      requestedDate: new Date(),
      scheduledDate: scheduledDateTime,
      notes: `Issued by: ${issuerFromUser}${notes ? `\nAdditional notes: ${notes}` : ''}`,
      medicalDocuments,
      scheduling: {
        transferTime: transferTime || '09:00'
      },
      lastModifiedBy: new Types.ObjectId(requestingUser._id),
      statusHistory: [{
        status: 'pending',
        changedBy: new Types.ObjectId(requestingUser._id),
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
      .populate('toHospital', 'name address organization')
      .populate('patient', 'firstName lastName age dossierNumber');

    // Note: Real-time notifications are now handled by the global SSE system
    console.log('✅ Transfer created successfully - notifications handled by global SSE system');

    // Send comprehensive notifications to admins (email + SMS)
    try {
      console.log('🔍 Fetching full user data for notifications...');
      
      // Fetch the full user data from database for notifications
      let fullUserData;
      try {
        fullUserData = await User.findById(new Types.ObjectId(requestingUser.userId)).select('firstName lastName email phone userType');
      } catch (dbError) {
        console.error('❌ Database error fetching user data:', dbError);
        return createSuccessResponse(populatedTransfer, 'Transfer request created successfully', 201);
      }
      
      if (!fullUserData) {
        console.error('❌ Full user data not found for notifications');
        return createSuccessResponse(populatedTransfer, 'Transfer request created successfully', 201);
      }
      
      console.log('📧 Starting notification service...');
      const TransferNotificationService = (await import('@/lib/communication/integrations/transfer-notification-service')).default;
      await TransferNotificationService.sendNewTransferRequestNotification(populatedTransfer, fullUserData);
      console.log('✅ Notifications sent successfully');
    } catch (notificationError) {
      console.error('❌ Error sending transfer request notifications:', notificationError);
      console.error('❌ Notification error details:', {
        message: notificationError.message,
        stack: notificationError.stack,
        name: notificationError.name
      });
    }

    return createSuccessResponse(populatedTransfer, 'Transfer request created successfully', 201);

  } catch (error) {
    console.error('Error creating transfer:', error);
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name
    });
    return handleAuthError(error);
  }
}
