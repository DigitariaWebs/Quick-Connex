import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Transfer from '@/models/Transfer';
import Patient from '@/models/Patient';
import User from '@/models/User';
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

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const assignedTo = searchParams.get('assignedTo');

    // Build query
    const query: any = { status };
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    // Get transfers with populated data
    const transfers = await Transfer.find(query)
      .populate('patient', 'patientId firstName lastName dateOfBirth gender phone currentHospital currentDepartment')
      .populate('requestedBy', 'firstName lastName email userType')
      .populate('assignedTo', 'firstName lastName email')
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

    await connectDB();

    const body = await request.json();
    const {
      patientFirstName,
      patientLastName,
      patientAge,
      fromHospital,
      toHospital,
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

    // Create or find patient
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - parseInt(patientAge as string));
    
    // Try to find existing patient first
    let patient = await Patient.findOne({
      firstName: patientFirstName,
      lastName: patientLastName,
      dateOfBirth: dob
    });
    
    if (!patient) {
      // Generate a unique patient ID
      const patientId = `PAT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      // Create new patient record with proper validation
      patient = new Patient({
        patientId,
        firstName: patientFirstName,
        lastName: patientLastName,
        dateOfBirth: dob,
        gender: 'other', // Default since we don't collect in the form
        phone: '000-000-0000', // Default since we don't collect in the form
        address: {
          street: 'Unknown',
          city: 'Unknown',
          state: 'Unknown',
          zipCode: 'Unknown',
          country: 'Unknown'
        },
        medicalInfo: {
          emergencyContact: {
            name: 'Unknown',
            relationship: 'Unknown',
            phone: 'Unknown'
          }
        },
        currentHospital: fromHospital,
        status: 'active'
      });

      await patient.save();
    }

    // Generate unique transfer ID
    const transferId = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Combine date and time for scheduled transfer
    const scheduledDateTime = transferDate && transferTime ? 
      new Date(`${transferDate}T${transferTime}`) : 
      new Date();

    // Create transfer request
    const transfer = new Transfer({
      transferId,
      patientId: patient.patientId,
      patient: patient._id,
      fromHospital,
      fromDepartment: 'General', // Default since we don't collect in the form
      toHospital,
      toDepartment: 'General', // Default since we don't collect in the form
      requestedBy: requestingUser._id,
      reason,
      priority,
      status: transferType === 'stat' ? 'urgent' : 'pending',
      requestedDate: new Date(),
      scheduledDate: scheduledDateTime,
      scheduledEndDate: scheduling?.timeSlot?.endTime ? 
        new Date(`${transferDate}T${scheduling.timeSlot.endTime}`) : 
        new Date(scheduledDateTime.getTime() + 60 * 60000), // Default 1 hour duration
      notes: `Issued by: ${issuer}${notes ? `\nAdditional notes: ${notes}` : ''}`,
      medicalDocuments,
      scheduling: scheduling || {
        isRecurring: false,
        timeSlot: {
          startTime: transferTime || '09:00',
          endTime: scheduling?.timeSlot?.endTime || '10:00',
          duration: 60
        },
        location: {
          pickupLocation: fromHospital,
          dropoffLocation: toHospital,
          transportType: 'ambulance'
        },
        resources: {
          requiredEquipment: [],
          specialInstructions: ''
        }
      },
      lastModifiedBy: requestingUser._id,
      statusHistory: [{
        status: transferType === 'stat' ? 'urgent' : 'pending',
        changedBy: requestingUser._id,
        changedAt: new Date(),
        reason: 'Transfer created'
      }]
    });

    await transfer.save();

    // Populate the response
    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate('patient', 'patientId firstName lastName dateOfBirth gender phone currentHospital currentDepartment')
      .populate('requestedBy', 'firstName lastName email userType');

    // Send real-time notification for new transfer
    try {
      const notificationService = getNotificationService();
      if (notificationService) {
        // Send urgent transfer notification if it's a stat transfer
        if (transferType === 'stat') {
          notificationService.sendUrgentTransferNotification(populatedTransfer, 'stat');
        } else {
          // Send regular new transfer notification to employees
          notificationService.sendToRole('employee', 'new_transfer', {
            id: `new_transfer_${populatedTransfer._id}_${Date.now()}`,
            type: 'new_transfer',
            priority: priority === 'urgent' ? 'high' : 'medium',
            title: 'New Transfer Request',
            message: `New transfer request for ${populatedTransfer.patient.firstName} ${populatedTransfer.patient.lastName} from ${fromHospital} to ${toHospital}`,
            transferId: populatedTransfer.transferId,
            transfer: {
              id: populatedTransfer._id,
              transferId: populatedTransfer.transferId,
              patient: populatedTransfer.patient,
              fromHospital,
              toHospital,
              priority,
              scheduledDate: populatedTransfer.scheduledDate
            },
            requestedBy: {
              id: requestingUser._id,
              name: `${requestingUser.firstName} ${requestingUser.lastName}`,
              userType: requestingUser.userType
            },
            timestamp: new Date().toISOString(),
            read: false
          });
        }
      }
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      // Don't fail the request if notification fails
    }

    return createSuccessResponse(populatedTransfer, 'Transfer request created successfully', 201);

  } catch (error) {
    console.error('Error creating transfer:', error);
    return createErrorResponse('Failed to create transfer request', 'CREATE_ERROR', 500);
  }
}
