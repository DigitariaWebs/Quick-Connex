/**
 * Transfer status validation and business logic
 */

export type TransferStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
export type TransferPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Valid status transitions
 */
export const STATUS_TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [], // Terminal state
  cancelled: [] // Terminal state
};

/**
 * Validate if a status transition is allowed
 */
export function validateStatusTransition(
  currentStatus: TransferStatus, 
  newStatus: TransferStatus
): boolean {
  return STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
}

/**
 * Get allowed transitions for a given status
 */
export function getAllowedTransitions(currentStatus: TransferStatus): TransferStatus[] {
  return STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Check if a status is terminal (no further transitions allowed)
 */
export function isTerminalStatus(status: TransferStatus): boolean {
  return STATUS_TRANSITIONS[status]?.length === 0;
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
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim().length === 0)) {
      errors.push(`${field} is required`);
    }
  }

  // Business logic validation
  if (data.fromHospital && data.toHospital && data.fromHospital === data.toHospital) {
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
  if (user.userType === 'employee' && transfer.status === 'pending') {
    permissions.canAccept = true;
  }

  // Only assigned employee or manager can start transfer
  if (transfer.status === 'accepted') {
    if (user.userType === 'manager' || 
        transfer.assignedTo?.toString() === user._id) {
      permissions.canStart = true;
    }
  }

  // Only assigned employee or manager can complete transfer
  if (transfer.status === 'in_progress') {
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

/**
 * Get status display information
 */
export function getStatusDisplayInfo(status: TransferStatus) {
  const statusInfo = {
    pending: {
      label: 'Pending',
      color: 'amber',
      icon: 'clock',
      description: 'Waiting for employee to accept'
    },
    accepted: {
      label: 'Accepted',
      color: 'green',
      icon: 'check-circle',
      description: 'Accepted by employee, ready to start'
    },
    in_progress: {
      label: 'In Progress',
      color: 'blue',
      icon: 'arrow-right',
      description: 'Transfer is currently in progress'
    },
    completed: {
      label: 'Completed',
      color: 'purple',
      icon: 'check-circle-2',
      description: 'Transfer completed successfully'
    },
    cancelled: {
      label: 'Cancelled',
      color: 'red',
      icon: 'x-circle',
      description: 'Transfer was cancelled'
    }
  };

  return statusInfo[status];
}

/**
 * Get priority display information
 */
export function getPriorityDisplayInfo(priority: TransferPriority) {
  const priorityInfo = {
    low: {
      label: 'Low',
      color: 'green',
      icon: 'arrow-down',
      description: 'Non-urgent transfer'
    },
    medium: {
      label: 'Medium',
      color: 'yellow',
      icon: 'minus',
      description: 'Standard priority transfer'
    },
    high: {
      label: 'High',
      color: 'orange',
      icon: 'arrow-up',
      description: 'High priority transfer'
    },
    urgent: {
      label: 'Urgent',
      color: 'red',
      icon: 'alert-triangle',
      description: 'Urgent transfer - immediate attention required'
    }
  };

  return priorityInfo[priority];
}
