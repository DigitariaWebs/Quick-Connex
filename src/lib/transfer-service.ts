/**
 * Transfer Service Layer
 * 
 * This service contains all the business logic for transfer operations,
 * including validation, status transitions, conflict detection, and more.
 */

import { Types } from 'mongoose';
import dbConnect from './mongoose';
import Transfer from '@/models/Transfer';
import Patient from '@/models/Patient';
import User from '@/models/User';
import {
  TransferStatus,
  TransferPriority,
  TransferType,
  TRANSFER_CONFIG,
  TRANSFER_ERRORS,
  TRANSFER_SUCCESS
} from '@/constants/transfer-constants';
import {
  ITransfer,
  TransferRequestData,
  TransferResponse,
  TransferValidationResult,
  TransferActionPermissions,
  TransferStats,
  TransferFilterOptions,
  TransferQueryOptions,
  TransferListResponse,
  SchedulingConfig,
  RecurringTransferInstance
} from '@/types/transfer-types';

export class TransferService {
  /**
   * Create a new transfer request
   */
  static async createTransfer(
    transferData: TransferRequestData,
    requestingUser: any
  ): Promise<{ success: boolean; transfer?: TransferResponse; error?: string }> {
    try {
      await dbConnect();

      // Validate that only managers can create transfers
      if (requestingUser.userType !== 'manager') {
        return {
          success: false,
          error: TRANSFER_ERRORS.PERMISSIONS.MANAGER_ONLY_CREATE
        };
      }

      // Validate transfer data
      const validation = this.validateTransferData(transferData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Create or find patient
      const patient = await this.createOrFindPatient(transferData);
      if (!patient) {
        return {
          success: false,
          error: 'Failed to create or find patient'
        };
      }

      // Generate unique transfer ID
      const transferId = this.generateTransferId();

      // Create scheduling configuration
      const scheduling = this.createSchedulingConfig(transferData);

      // Create transfer document
      const transfer = new Transfer({
        transferId,
        patientId: patient.patientId,
        patient: patient._id,
        fromHospital: transferData.fromHospital,
        toHospital: transferData.toHospital,
        requestedBy: requestingUser._id,
        reason: transferData.reason,
        priority: transferData.priority,
        status: transferData.transferType === TransferType.STAT ? 
          TransferStatus.PENDING : TransferStatus.PENDING,
        requestedDate: new Date(),
        scheduledDate: new Date(`${transferData.transferDate}T${transferData.transferTime}`),
        scheduledEndDate: scheduling.timeSlot.endTime ? 
          new Date(`${transferData.transferDate}T${scheduling.timeSlot.endTime}`) :
          new Date(new Date(`${transferData.transferDate}T${transferData.transferTime}`).getTime() + 60 * 60000),
        notes: `Issued by: ${transferData.issuer}${transferData.notes ? `\nAdditional notes: ${transferData.notes}` : ''}`,
        medicalDocuments: transferData.medicalDocuments || [],
        scheduling,
        lastModifiedBy: requestingUser._id,
        statusHistory: [{
          status: transferData.transferType === TransferType.STAT ? 
            TransferStatus.PENDING : TransferStatus.PENDING,
          changedBy: requestingUser._id,
          changedAt: new Date(),
          reason: 'Transfer created'
        }]
      });

      await transfer.save();

      // Populate and return the transfer
      const populatedTransfer = await this.getTransferById(transfer._id?.toString() || '');
      return {
        success: true,
        transfer: populatedTransfer || undefined
      };

    } catch (error) {
      console.error('Error creating transfer:', error);
      return {
        success: false,
        error: 'Failed to create transfer request'
      };
    }
  }

  /**
   * Get transfer by ID
   */
  static async getTransferById(transferId: string): Promise<TransferResponse | null> {
    try {
      await dbConnect();

      const transfer = await Transfer.findById(transferId)
        .populate('patient', 'patientId firstName lastName dateOfBirth gender phone currentHospital currentDepartment')
        .populate('requestedBy', 'firstName lastName email userType')
        .populate('assignedTo', 'firstName lastName email userType')
        .populate('lastModifiedBy', 'firstName lastName email userType')
        .populate('statusHistory.changedBy', 'firstName lastName email userType');

      return transfer ? this.mapTransferToResponse(transfer) : null;
    } catch (error) {
      console.error('Error fetching transfer:', error);
      return null;
    }
  }

  /**
   * Get transfers with filtering and pagination
   */
  static async getTransfers(
    queryOptions: TransferQueryOptions = {}
  ): Promise<TransferListResponse> {
    try {
      await dbConnect();

      const {
        filter = {},
        sort = { field: 'requestedDate', direction: 'desc' },
        page = 1,
        pageSize = TRANSFER_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE
      } = queryOptions;

      // Build query
      const query: any = {};
      
      if (filter.status && filter.status.length > 0) {
        query.status = { $in: filter.status };
      }
      
      if (filter.priority && filter.priority.length > 0) {
        query.priority = { $in: filter.priority };
      }
      
      if (filter.requestedBy && filter.requestedBy.length > 0) {
        query.requestedBy = { $in: filter.requestedBy };
      }
      
      if (filter.assignedTo && filter.assignedTo.length > 0) {
        query.assignedTo = { $in: filter.assignedTo };
      }
      
      if (filter.fromHospital && filter.fromHospital.length > 0) {
        query.fromHospital = { $in: filter.fromHospital };
      }
      
      if (filter.toHospital && filter.toHospital.length > 0) {
        query.toHospital = { $in: filter.toHospital };
      }
      
      if (filter.dateFrom || filter.dateTo) {
        query.requestedDate = {};
        if (filter.dateFrom) query.requestedDate.$gte = filter.dateFrom;
        if (filter.dateTo) query.requestedDate.$lte = filter.dateTo;
      }
      
      if (filter.isRecurring !== undefined) {
        query['scheduling.isRecurring'] = filter.isRecurring;
      }
      
      // Note: Conflict filtering removed as hospitals handle their own logistics
      
      if (filter.searchTerm) {
        query.$or = [
          { transferId: { $regex: filter.searchTerm, $options: 'i' } },
          { 'patient.firstName': { $regex: filter.searchTerm, $options: 'i' } },
          { 'patient.lastName': { $regex: filter.searchTerm, $options: 'i' } },
          { fromHospital: { $regex: filter.searchTerm, $options: 'i' } },
          { toHospital: { $regex: filter.searchTerm, $options: 'i' } },
          { reason: { $regex: filter.searchTerm, $options: 'i' } }
        ];
      }

      // Build sort object
      const sortObj: any = {};
      sortObj[sort.field] = sort.direction === 'asc' ? 1 : -1;

      // Calculate pagination
      const skip = (page - 1) * pageSize;
      const total = await Transfer.countDocuments(query);
      const totalPages = Math.ceil(total / pageSize);

      // Execute query
      const transfers = await Transfer.find(query)
        .populate('patient', 'patientId firstName lastName dateOfBirth gender phone currentHospital currentDepartment')
        .populate('requestedBy', 'firstName lastName email userType')
        .populate('assignedTo', 'firstName lastName email userType')
        .populate('lastModifiedBy', 'firstName lastName email userType')
        .sort(sortObj)
        .skip(skip)
        .limit(pageSize);

      const transferResponses = transfers.map(transfer => this.mapTransferToResponse(transfer));

      return {
        transfers: transferResponses,
        count: transferResponses.length,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      };

    } catch (error) {
      console.error('Error fetching transfers:', error);
      throw new Error('Failed to fetch transfers');
    }
  }

  /**
   * Accept a transfer
   */
  static async acceptTransfer(
    transferId: string,
    userId: string,
    notes?: string
  ): Promise<{ success: boolean; transfer?: TransferResponse; error?: string }> {
    try {
      await dbConnect();

      const transfer = await Transfer.findById(transferId);
      if (!transfer) {
        return { success: false, error: TRANSFER_ERRORS.NOT_FOUND.TRANSFER };
      }

      // Validate status transition
      if (!this.isValidStatusTransition(transfer.status, TransferStatus.ACCEPTED)) {
        return { success: false, error: TRANSFER_ERRORS.VALIDATION.INVALID_TRANSITION };
      }

      // Update transfer
      transfer.status = TransferStatus.ACCEPTED;
      transfer.assignedTo = new Types.ObjectId(userId);
      transfer.lastModifiedBy = new Types.ObjectId(userId);
      
      if (notes) {
        transfer.notes = transfer.notes ? `${transfer.notes}\n${notes}` : notes;
      }

      await transfer.save();

      const populatedTransfer = await this.getTransferById(transferId);
      return {
        success: true,
        transfer: populatedTransfer || undefined
      };

    } catch (error) {
      console.error('Error accepting transfer:', error);
      return { success: false, error: 'Failed to accept transfer' };
    }
  }

  /**
   * Start a transfer
   */
  static async startTransfer(
    transferId: string,
    userId: string,
    notes?: string
  ): Promise<{ success: boolean; transfer?: TransferResponse; error?: string }> {
    try {
      await dbConnect();

      const transfer = await Transfer.findById(transferId);
      if (!transfer) {
        return { success: false, error: TRANSFER_ERRORS.NOT_FOUND.TRANSFER };
      }

      // Validate status transition
      if (!this.isValidStatusTransition(transfer.status, TransferStatus.IN_PROGRESS)) {
        return { success: false, error: TRANSFER_ERRORS.VALIDATION.INVALID_TRANSITION };
      }

      // Update transfer
      transfer.status = TransferStatus.IN_PROGRESS;
      transfer.lastModifiedBy = new Types.ObjectId(userId);
      
      if (notes) {
        transfer.notes = transfer.notes ? `${transfer.notes}\n${notes}` : notes;
      }

      await transfer.save();

      const populatedTransfer = await this.getTransferById(transferId);
      return {
        success: true,
        transfer: populatedTransfer || undefined
      };

    } catch (error) {
      console.error('Error starting transfer:', error);
      return { success: false, error: 'Failed to start transfer' };
    }
  }

  /**
   * Complete a transfer
   */
  static async completeTransfer(
    transferId: string,
    userId: string,
    notes?: string
  ): Promise<{ success: boolean; transfer?: TransferResponse; error?: string }> {
    try {
      await dbConnect();

      const transfer = await Transfer.findById(transferId);
      if (!transfer) {
        return { success: false, error: TRANSFER_ERRORS.NOT_FOUND.TRANSFER };
      }

      // Validate status transition
      if (!this.isValidStatusTransition(transfer.status, TransferStatus.COMPLETED)) {
        return { success: false, error: TRANSFER_ERRORS.VALIDATION.INVALID_TRANSITION };
      }

      // Calculate actual duration
      const actualDuration = this.calculateTransferDuration(
        transfer.requestedDate,
        new Date()
      );

      // Update transfer
      transfer.status = TransferStatus.COMPLETED;
      transfer.completedDate = new Date();
      transfer.actualDuration = actualDuration;
      transfer.lastModifiedBy = new Types.ObjectId(userId);
      
      if (notes) {
        transfer.notes = transfer.notes ? `${transfer.notes}\n${notes}` : notes;
      }

      await transfer.save();

      const populatedTransfer = await this.getTransferById(transferId);
      return {
        success: true,
        transfer: populatedTransfer || undefined
      };

    } catch (error) {
      console.error('Error completing transfer:', error);
      return { success: false, error: 'Failed to complete transfer' };
    }
  }

  /**
   * Cancel a transfer
   */
  static async cancelTransfer(
    transferId: string,
    userId: string,
    reason: string
  ): Promise<{ success: boolean; transfer?: TransferResponse; error?: string }> {
    try {
      await dbConnect();

      const transfer = await Transfer.findById(transferId);
      if (!transfer) {
        return { success: false, error: TRANSFER_ERRORS.NOT_FOUND.TRANSFER };
      }

      // Validate status transition
      if (!this.isValidStatusTransition(transfer.status, TransferStatus.CANCELLED)) {
        return { success: false, error: TRANSFER_ERRORS.VALIDATION.INVALID_TRANSITION };
      }

      // Update transfer
      transfer.status = TransferStatus.CANCELLED;
      transfer.lastModifiedBy = new Types.ObjectId(userId);
      transfer.notes = transfer.notes ? `${transfer.notes}\nCancelled: ${reason}` : `Cancelled: ${reason}`;

      await transfer.save();

      const populatedTransfer = await this.getTransferById(transferId);
      return {
        success: true,
        transfer: populatedTransfer || undefined
      };

    } catch (error) {
      console.error('Error cancelling transfer:', error);
      return { success: false, error: 'Failed to cancel transfer' };
    }
  }

  /**
   * Get transfer statistics
   */
  static async getTransferStats(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<TransferStats> {
    try {
      await dbConnect();

      const query: any = {};
      if (dateFrom || dateTo) {
        query.requestedDate = {};
        if (dateFrom) query.requestedDate.$gte = dateFrom;
        if (dateTo) query.requestedDate.$lte = dateTo;
      }

      const [
        total,
        pending,
        accepted,
        inProgress,
        completed,
        cancelled,
        urgent,
        high,
        medium,
        low
      ] = await Promise.all([
        Transfer.countDocuments(query),
        Transfer.countDocuments({ ...query, status: TransferStatus.PENDING }),
        Transfer.countDocuments({ ...query, status: TransferStatus.ACCEPTED }),
        Transfer.countDocuments({ ...query, status: TransferStatus.IN_PROGRESS }),
        Transfer.countDocuments({ ...query, status: TransferStatus.COMPLETED }),
        Transfer.countDocuments({ ...query, status: TransferStatus.CANCELLED }),
        Transfer.countDocuments({ ...query, priority: TransferPriority.URGENT }),
        Transfer.countDocuments({ ...query, priority: TransferPriority.HIGH }),
        Transfer.countDocuments({ ...query, priority: TransferPriority.MEDIUM }),
        Transfer.countDocuments({ ...query, priority: TransferPriority.LOW })
      ]);

      // Calculate completion rate
      const completionRate = total > 0 ? (completed / total) * 100 : 0;

      // Calculate average completion time
      const completedTransfers = await Transfer.find({
        ...query,
        status: TransferStatus.COMPLETED,
        actualDuration: { $exists: true }
      }).select('actualDuration');

      const averageCompletionTime = completedTransfers.length > 0
        ? completedTransfers.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / completedTransfers.length
        : undefined;

      return {
        total,
        pending,
        accepted,
        inProgress,
        completed,
        cancelled,
        urgent,
        high,
        medium,
        low,
        averageCompletionTime,
        completionRate
      };

    } catch (error) {
      console.error('Error fetching transfer stats:', error);
      throw new Error('Failed to fetch transfer statistics');
    }
  }

  /**
   * Get transfer action permissions for a user
   */
  static getTransferActionPermissions(
    transfer: ITransfer,
    user: any
  ): TransferActionPermissions {
    const permissions: TransferActionPermissions = {
      canAccept: false,
      canStart: false,
      canComplete: false,
      canCancel: false,
      canEdit: false,
      canView: true,
      canCreate: user.userType === 'manager' // Only managers can create transfers
    };

    // Only employees can accept transfers
    if (user.userType === 'employee' && transfer.status === TransferStatus.PENDING) {
      permissions.canAccept = true;
    }

    // Only assigned employee or manager can start transfer
    if (transfer.status === TransferStatus.ACCEPTED) {
      if (user.userType === 'manager' || 
          transfer.assignedTo?.toString() === user._id) {
        permissions.canStart = true;
      }
    }

    // Only assigned employee or manager can complete transfer
    if (transfer.status === TransferStatus.IN_PROGRESS) {
      if (user.userType === 'manager' || 
          transfer.assignedTo?.toString() === user._id) {
        permissions.canComplete = true;
      }
    }

    // Cancellation permissions
    if (!this.isTerminalStatus(transfer.status)) {
      if (user.userType === 'manager' || 
          transfer.requestedBy?.toString() === user._id ||
          transfer.assignedTo?.toString() === user._id) {
        permissions.canCancel = true;
      }
    }

    // Edit permissions (managers only, and only for pending transfers)
    if (user.userType === 'manager' && transfer.status === TransferStatus.PENDING) {
      permissions.canEdit = true;
    }

    return permissions;
  }

  // Note: Conflict detection methods removed as hospitals handle their own logistics

  // Private helper methods

  private static validateTransferData(data: TransferRequestData): TransferValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    const requiredFields = [
      'patientFirstName',
      'patientLastName', 
      'fromHospital',
      'toHospital',
      'transferDate',
      'reason'
    ];

    for (const field of requiredFields) {
      const value = (data as any)[field];
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        errors.push(`${field} is required`);
      }
    }

    // Business logic validation
    if (data.fromHospital && data.toHospital && data.fromHospital === data.toHospital) {
      errors.push(TRANSFER_ERRORS.VALIDATION.SAME_HOSPITALS);
    }

    // Date validation
    if (data.transferDate) {
      const transferDate = new Date(data.transferDate);
      const now = new Date();
      
      if (transferDate < now) {
        errors.push(TRANSFER_ERRORS.VALIDATION.INVALID_DATE);
      }
      
      // Warning for dates too far in the future
      const maxFutureDate = new Date();
      maxFutureDate.setDate(maxFutureDate.getDate() + TRANSFER_CONFIG.VALIDATION.MAX_FUTURE_DAYS);
      
      if (transferDate > maxFutureDate) {
        warnings.push(`Transfer date is more than ${TRANSFER_CONFIG.VALIDATION.MAX_FUTURE_DAYS} days in the future`);
      }
    }

    // Priority validation
    if (data.priority && !Object.values(TransferPriority).includes(data.priority)) {
      errors.push(TRANSFER_ERRORS.VALIDATION.INVALID_PRIORITY);
    }

    // Reason length validation
    if (data.reason) {
      if (data.reason.length < TRANSFER_CONFIG.VALIDATION.MIN_REASON_LENGTH) {
        warnings.push(TRANSFER_ERRORS.VALIDATION.SHORT_REASON);
      }
      if (data.reason.length > TRANSFER_CONFIG.VALIDATION.MAX_REASON_LENGTH) {
        errors.push(TRANSFER_ERRORS.VALIDATION.LONG_REASON);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private static async createOrFindPatient(transferData: TransferRequestData): Promise<any> {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - transferData.patientAge);
    
    // Try to find existing patient first
    let patient = await Patient.findOne({
      firstName: transferData.patientFirstName,
      lastName: transferData.patientLastName,
      dateOfBirth: dob
    });
    
    if (!patient) {
      // Generate a unique patient ID
      const patientId = `PAT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      // Create new patient record
      patient = new Patient({
        patientId,
        firstName: transferData.patientFirstName,
        lastName: transferData.patientLastName,
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
        currentHospital: transferData.fromHospital,
        status: 'active'
      });

      await patient.save();
    }

    return patient;
  }

  private static generateTransferId(): string {
    return `${TRANSFER_CONFIG.ID_PREFIXES.TRANSFER}-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  private static createSchedulingConfig(transferData: TransferRequestData): SchedulingConfig {
    return {
      isRecurring: false,
      timeSlot: {
        startTime: transferData.transferTime,
        endTime: transferData.scheduling?.timeSlot?.endTime || 
          new Date(new Date(`2000-01-01T${transferData.transferTime}`).getTime() + 60 * 60000)
            .toTimeString().slice(0, 5),
        duration: transferData.scheduling?.timeSlot?.duration || TRANSFER_CONFIG.DEFAULTS.DURATION_MINUTES
      },
      location: {
        pickupLocation: transferData.fromHospital,
        dropoffLocation: transferData.toHospital
      },
      resources: {
        requiredEquipment: transferData.scheduling?.resources?.requiredEquipment || [],
        specialInstructions: transferData.scheduling?.resources?.specialInstructions || ''
      }
    };
  }

  private static mapTransferToResponse(transfer: any): TransferResponse {
    return {
      _id: transfer._id.toString(),
      transferId: transfer.transferId,
      patientId: transfer.patientId,
      patient: transfer.patient,
      fromHospital: transfer.fromHospital,
      toHospital: transfer.toHospital,
      requestedBy: transfer.requestedBy,
      assignedTo: transfer.assignedTo,
      reason: transfer.reason,
      priority: transfer.priority,
      status: transfer.status,
      requestedDate: transfer.requestedDate.toISOString(),
      scheduledDate: transfer.scheduledDate?.toISOString(),
      scheduledEndDate: transfer.scheduledEndDate?.toISOString(),
      completedDate: transfer.completedDate?.toISOString(),
      notes: transfer.notes,
      medicalDocuments: transfer.medicalDocuments,
      scheduling: transfer.scheduling,
      statusHistory: transfer.statusHistory,
      lastModifiedBy: transfer.lastModifiedBy,
      estimatedDuration: transfer.estimatedDuration,
      actualDuration: transfer.actualDuration,
      createdAt: transfer.createdAt.toISOString(),
      updatedAt: transfer.updatedAt.toISOString()
    };
  }

  private static isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const transitions = TRANSFER_CONFIG.STATUS_TRANSITIONS[currentStatus as TransferStatus];
    return Array.isArray(transitions) && transitions.includes(newStatus as TransferStatus);
  }

  private static isTerminalStatus(status: TransferStatus): boolean {
    return TRANSFER_CONFIG.STATUS_TRANSITIONS[status]?.length === 0;
  }

  private static calculateTransferDuration(startDate: Date, endDate: Date = new Date()): number {
    const durationMs = endDate.getTime() - startDate.getTime();
    return Math.round(durationMs / (1000 * 60)); // Duration in minutes
  }

  // Note: Private conflict detection methods removed as hospitals handle their own logistics
}
