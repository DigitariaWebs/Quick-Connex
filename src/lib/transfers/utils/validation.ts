/**
 * Transfer status validation and business logic
 */

import { TransferStatus, TransferPriority, TRANSFER_CONSTANTS } from '../core/constants';

/**
 * Validate if a status transition is allowed
 */
export function validateStatusTransition(
  currentStatus: TransferStatus, 
  newStatus: TransferStatus
): boolean {
  const transitions = TRANSFER_CONSTANTS.STATUS_TRANSITIONS[currentStatus];
  return Array.isArray(transitions) && transitions.includes(newStatus);
}

/**
 * Get allowed transitions for a given status
 */
export function getAllowedTransitions(currentStatus: TransferStatus): readonly TransferStatus[] {
  return TRANSFER_CONSTANTS.STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Check if a status is terminal (no further transitions allowed)
 */
export function isTerminalStatus(status: TransferStatus): boolean {
  return TRANSFER_CONSTANTS.STATUS_TRANSITIONS[status]?.length === 0;
}

/**
 * Validate transfer data
 */
export interface TransferValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTransferData(data: any): TransferValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate transfer category
  const validCategories = ['patient', 'envelope', 'medical_instruments'];
  if (!data.transferCategory || !validCategories.includes(data.transferCategory)) {
    errors.push('Transfer category is required and must be one of: patient, envelope, medical_instruments');
  }

  // Common required fields
  const commonRequiredFields = [
    'fromHospital',
    'toHospital',
    'transferDate',
    'reason'
  ];

  for (const field of commonRequiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim().length === 0)) {
      const fieldNames: Record<string, string> = {
        'fromHospital': 'Source hospital',
        'toHospital': 'Destination hospital',
        'transferDate': 'Transfer date',
        'reason': 'Reason for transfer'
      };
      errors.push(`${fieldNames[field] || field} is required`);
    }
  }

  // Category-specific validation
  if (data.transferCategory === 'patient') {
    const patientFields = ['patientFirstName', 'patientLastName', 'patientDossierNumber'];
    for (const field of patientFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim().length === 0)) {
        const fieldNames: Record<string, string> = {
          'patientFirstName': 'Patient first name',
          'patientLastName': 'Patient last name',
          'patientDossierNumber': 'Dossier number'
        };
        errors.push(`${fieldNames[field]} is required for patient transfers`);
      }
    }
  } else if (data.transferCategory === 'envelope') {
    const envelopeFields = ['senderName', 'recipientName', 'contents'];
    for (const field of envelopeFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim().length === 0)) {
        const fieldNames: Record<string, string> = {
          'senderName': 'Sender name',
          'recipientName': 'Recipient name',
          'contents': 'Content'
        };
        errors.push(`${fieldNames[field]} is required for envelope transfers`);
      }
    }
  } else if (data.transferCategory === 'medical_instruments') {
    const medicalFields = ['equipmentName', 'serialNumber', 'condition'];
    for (const field of medicalFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim().length === 0)) {
        const fieldNames: Record<string, string> = {
          'equipmentName': 'Equipment name',
          'serialNumber': 'Serial number',
          'condition': 'Equipment condition'
        };
        errors.push(`${fieldNames[field]} is required for medical instruments transfers`);
      }
    }
  }

  // Business logic validation
  // Check if hospitals are the same (by name or ID)
  const fromHospitalValue = data.fromHospitalId || data.fromHospital;
  const toHospitalValue = data.toHospitalId || data.toHospital;
  
  if (fromHospitalValue && toHospitalValue && fromHospitalValue === toHospitalValue) {
    errors.push('From and to hospitals cannot be the same');
  }

  // Date validation
  if (data.transferDate) {
    const transferDate = new Date(data.transferDate);
    const now = new Date();
    
    if (transferDate < now) {
      errors.push('Transfer date cannot be in the past');
    }
    
    // Warning for dates too far in the future
    const maxFutureDate = new Date();
    maxFutureDate.setDate(maxFutureDate.getDate() + 30); // 30 days from now
    
    if (transferDate > maxFutureDate) {
      warnings.push('Transfer date is more than 30 days in the future');
    }
  }

  // Priority validation
  if (data.priority && !['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
    errors.push('Invalid priority level');
  }

  // Reason length validation
  if (data.reason && data.reason.length < 10) {
    warnings.push('Transfer reason is quite short. Consider providing more details.');
  }

  // Dossier number validation (optional field)
  if (data.patientDossierNumber && data.patientDossierNumber.toString().trim() !== '') {
    const dossierNumber = data.patientDossierNumber.toString().trim();
    
    // Check if dossier number contains only alphanumeric characters and common separators
    if (!/^[A-Za-z0-9\-_\/]+$/.test(dossierNumber)) {
      errors.push('Dossier number can only contain letters, numbers, hyphens, underscores, and forward slashes');
    }
    
    // Check length (reasonable limits)
    if (dossierNumber.length < 3) {
      errors.push('Dossier number must be at least 3 characters long');
    }
    
    if (dossierNumber.length > 50) {
      errors.push('Dossier number cannot exceed 50 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate transfer action permissions
 */
export interface TransferActionPermissions {
  canAccept: boolean;
  canStart: boolean;
  canComplete: boolean;
  canCancel: boolean;
  canCreate: boolean;
  reason?: string;
}

export function getTransferActionPermissions(
  transfer: any,
  user: any
): TransferActionPermissions {
  const permissions: TransferActionPermissions = {
    canAccept: false,
    canStart: false,
    canComplete: false,
    canCancel: false,
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
  if (!isTerminalStatus(transfer.status)) {
    if (user.userType === 'manager' || 
        transfer.requestedBy?.toString() === user._id ||
        transfer.assignedTo?.toString() === user._id) {
      permissions.canCancel = true;
    }
  }

  return permissions;
}

/**
 * Calculate transfer duration
 */
export function calculateTransferDuration(
  startDate: Date,
  endDate: Date = new Date()
): number {
  const durationMs = endDate.getTime() - startDate.getTime();
  return Math.round(durationMs / (1000 * 60)); // Duration in minutes
}

// Note: Status and priority display info functions removed.
// Use STATUS_DISPLAY_INFO and PRIORITY_DISPLAY_INFO constants from core/constants.ts instead.
// Or use TransferDisplayUtils.getStatusDisplayInfo() and TransferDisplayUtils.getPriorityDisplayInfo() from formatters.ts
