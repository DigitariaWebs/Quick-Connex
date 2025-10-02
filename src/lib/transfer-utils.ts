/**
 * Transfer Utilities and Helper Functions
 * 
 * This file contains utility functions and helpers used throughout
 * the transfer system for common operations, formatting, and calculations.
 */

import {
  TransferStatus,
  TransferPriority,
  TransferType,
  STATUS_DISPLAY_INFO,
  PRIORITY_DISPLAY_INFO,
  TRANSFER_CONFIG
} from '@/constants/transfer-constants';
import {
  TransferResponse,
  TransferStats,
  TransferCalendarEvent,
  SchedulingConfig,
  TransferFilterOptions,
  TransferQueryOptions
} from '@/types/transfer-types';

/**
 * Date and Time Utilities
 */
export class DateUtils {
  /**
   * Format date for display
   */
  static formatDate(date: Date | string, format: 'short' | 'long' | 'time' = 'short'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    switch (format) {
      case 'short':
        return dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      case 'long':
        return dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        });
      case 'time':
        return dateObj.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      default:
        return dateObj.toLocaleDateString();
    }
  }

  /**
   * Format date and time for display
   */
  static formatDateTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Calculate age from date of birth
   */
  static calculateAge(dateOfBirth: Date | string): number {
    const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Calculate duration between two dates in minutes
   */
  static calculateDuration(startDate: Date | string, endDate: Date | string): number {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    const durationMs = end.getTime() - start.getTime();
    return Math.round(durationMs / (1000 * 60)); // Duration in minutes
  }

  /**
   * Format duration in human-readable format
   */
  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    } else if (minutes < 1440) { // Less than 24 hours
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    } else {
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.floor((minutes % 1440) / 60);
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
  }

  /**
   * Check if date is in the past
   */
  static isPastDate(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj < new Date();
  }

  /**
   * Check if date is in the future
   */
  static isFutureDate(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj > new Date();
  }

  /**
   * Get start of day
   */
  static getStartOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay;
  }

  /**
   * Get end of day
   */
  static getEndOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  }

  /**
   * Add days to date
   */
  static addDays(date: Date | string, days: number): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const result = new Date(dateObj);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Add hours to date
   */
  static addHours(date: Date | string, hours: number): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const result = new Date(dateObj);
    result.setHours(result.getHours() + hours);
    return result;
  }
}

/**
 * Transfer Display Utilities
 */
export class TransferDisplayUtils {
  /**
   * Get status display information
   */
  static getStatusDisplayInfo(status: TransferStatus) {
    return STATUS_DISPLAY_INFO[status];
  }

  /**
   * Get priority display information
   */
  static getPriorityDisplayInfo(priority: TransferPriority) {
    return PRIORITY_DISPLAY_INFO[priority];
  }

  // Note: Transport type display info removed as transport types are not needed

  /**
   * Get status badge classes
   */
  static getStatusBadgeClasses(status: TransferStatus): string {
    const info = this.getStatusDisplayInfo(status);
    return `${info.bgColor} ${info.textColor} ${info.borderColor}`;
  }

  /**
   * Get priority badge classes
   */
  static getPriorityBadgeClasses(priority: TransferPriority): string {
    const info = this.getPriorityDisplayInfo(priority);
    return `${info.bgColor} ${info.textColor} ${info.borderColor}`;
  }

  /**
   * Get priority gradient classes
   */
  static getPriorityGradientClasses(priority: TransferPriority): string {
    const info = this.getPriorityDisplayInfo(priority);
    return `bg-gradient-to-r ${info.gradient}`;
  }

  /**
   * Format transfer ID for display
   */
  static formatTransferId(transferId: string): string {
    return transferId.replace(/-/g, ' ').toUpperCase();
  }

  /**
   * Format patient name
   */
  static formatPatientName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName}`;
  }

  /**
   * Format hospital name (truncate if too long)
   */
  static formatHospitalName(hospitalName: string, maxLength: number = 30): string {
    return hospitalName.length > maxLength 
      ? `${hospitalName.substring(0, maxLength)}...` 
      : hospitalName;
  }

  /**
   * Format transfer route
   */
  static formatTransferRoute(fromHospital: string, toHospital: string): string {
    return `${fromHospital} → ${toHospital}`;
  }

  /**
   * Get transfer urgency indicator
   */
  static getUrgencyIndicator(priority: TransferPriority, status: TransferStatus): {
    isUrgent: boolean;
    indicator: string;
    color: string;
  } {
    const isUrgent = priority === TransferPriority.URGENT || 
                    (priority === TransferPriority.HIGH && status === TransferStatus.PENDING);
    
    return {
      isUrgent,
      indicator: isUrgent ? '🚨' : '📋',
      color: isUrgent ? 'text-red-500' : 'text-blue-500'
    };
  }
}

/**
 * Transfer Calculation Utilities
 */
export class TransferCalculationUtils {
  /**
   * Calculate transfer statistics
   */
  static calculateStats(transfers: TransferResponse[]): TransferStats {
    const stats: TransferStats = {
      total: transfers.length,
      pending: 0,
      accepted: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    let totalCompletionTime = 0;
    let completedCount = 0;

    transfers.forEach(transfer => {
      // Status counts
      switch (transfer.status) {
        case TransferStatus.PENDING:
          stats.pending++;
          break;
        case TransferStatus.ACCEPTED:
          stats.accepted++;
          break;
        case TransferStatus.IN_PROGRESS:
          stats.inProgress++;
          break;
        case TransferStatus.COMPLETED:
          stats.completed++;
          if (transfer.actualDuration) {
            totalCompletionTime += transfer.actualDuration;
            completedCount++;
          }
          break;
        case TransferStatus.CANCELLED:
          stats.cancelled++;
          break;
      }

      // Priority counts
      switch (transfer.priority) {
        case TransferPriority.URGENT:
          stats.urgent++;
          break;
        case TransferPriority.HIGH:
          stats.high++;
          break;
        case TransferPriority.MEDIUM:
          stats.medium++;
          break;
        case TransferPriority.LOW:
          stats.low++;
          break;
      }
    });

    // Calculate derived statistics
    stats.averageCompletionTime = completedCount > 0 ? totalCompletionTime / completedCount : undefined;
    stats.completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

    return stats;
  }

  /**
   * Calculate completion rate
   */
  static calculateCompletionRate(completed: number, total: number): number {
    return total > 0 ? (completed / total) * 100 : 0;
  }

  /**
   * Calculate average completion time
   */
  static calculateAverageCompletionTime(transfers: TransferResponse[]): number | undefined {
    const completedTransfers = transfers.filter(t => 
      t.status === TransferStatus.COMPLETED && t.actualDuration
    );
    
    if (completedTransfers.length === 0) return undefined;
    
    const totalTime = completedTransfers.reduce((sum, t) => sum + (t.actualDuration || 0), 0);
    return totalTime / completedTransfers.length;
  }

  /**
   * Calculate priority score for sorting
   */
  static calculatePriorityScore(priority: TransferPriority): number {
    return TRANSFER_CONFIG.PRIORITY_WEIGHTS[priority] || 0;
  }

  /**
   * Calculate urgency score (priority + time factor)
   */
  static calculateUrgencyScore(
    priority: TransferPriority, 
    requestedDate: Date | string,
    status: TransferStatus
  ): number {
    const priorityScore = this.calculatePriorityScore(priority);
    const dateObj = typeof requestedDate === 'string' ? new Date(requestedDate) : requestedDate;
    const hoursSinceRequest = DateUtils.calculateDuration(requestedDate, new Date()) / 60;
    
    // Add time urgency factor
    let timeUrgency = 0;
    if (status === TransferStatus.PENDING && hoursSinceRequest > 2) {
      timeUrgency = Math.min(hoursSinceRequest / 24, 2); // Max 2 points for time urgency
    }
    
    return priorityScore + timeUrgency;
  }
}

/**
 * Transfer Filter Utilities
 */
export class TransferFilterUtils {
  /**
   * Apply filters to transfers
   */
  static filterTransfers(
    transfers: TransferResponse[], 
    filters: TransferFilterOptions
  ): TransferResponse[] {
    return transfers.filter(transfer => {
      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(transfer.status)) return false;
      }

      // Priority filter
      if (filters.priority && filters.priority.length > 0) {
        if (!filters.priority.includes(transfer.priority)) return false;
      }

      // Requested by filter
      if (filters.requestedBy && filters.requestedBy.length > 0) {
        if (!filters.requestedBy.includes(transfer.requestedBy._id.toString())) return false;
      }

      // Assigned to filter
      if (filters.assignedTo && filters.assignedTo.length > 0) {
        if (!transfer.assignedTo || !filters.assignedTo.includes(transfer.assignedTo._id.toString())) return false;
      }

      // Hospital filters
      if (filters.fromHospital && filters.fromHospital.length > 0) {
        if (!filters.fromHospital.includes(transfer.fromHospital)) return false;
      }

      if (filters.toHospital && filters.toHospital.length > 0) {
        if (!filters.toHospital.includes(transfer.toHospital)) return false;
      }

      // Date filters
      if (filters.dateFrom) {
        const transferDate = new Date(transfer.requestedDate);
        if (transferDate < filters.dateFrom) return false;
      }

      if (filters.dateTo) {
        const transferDate = new Date(transfer.requestedDate);
        if (transferDate > filters.dateTo) return false;
      }

      // Note: Recurring filter removed as it's not supported in current implementation

      // Note: Conflict filtering removed as hospitals handle their own logistics

      // Search term filter
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        
        // Helper function to get hospital name from either string or object
        const getHospitalName = (hospital: string | { name: string; [key: string]: any }) => {
          return typeof hospital === 'string' ? hospital : hospital?.name || '';
        };
        
        const searchableText = [
          transfer.transferId,
          transfer.patientInfo?.firstName || '',
          transfer.patientInfo?.lastName || '',
          transfer.patientInfo?.dossierNumber || '',
          getHospitalName(transfer.fromHospital),
          getHospitalName(transfer.toHospital),
          transfer.reason
        ].join(' ').toLowerCase();

        if (!searchableText.includes(searchTerm)) return false;
      }

      return true;
    });
  }

  /**
   * Sort transfers
   */
  static sortTransfers(
    transfers: TransferResponse[],
    sortBy: 'date' | 'priority' | 'status' | 'patient' = 'date',
    direction: 'asc' | 'desc' = 'desc'
  ): TransferResponse[] {
    return [...transfers].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.requestedDate).getTime() - new Date(b.requestedDate).getTime();
          break;
        case 'priority':
          comparison = TransferCalculationUtils.calculatePriorityScore(a.priority) - 
                      TransferCalculationUtils.calculatePriorityScore(b.priority);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'patient':
          comparison = TransferDisplayUtils.formatPatientName(a.patientInfo.firstName, a.patientInfo.lastName)
                      .localeCompare(TransferDisplayUtils.formatPatientName(b.patientInfo.firstName, b.patientInfo.lastName));
          break;
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Paginate transfers
   */
  static paginateTransfers(
    transfers: TransferResponse[],
    page: number = 1,
    pageSize: number = TRANSFER_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE
  ): {
    items: TransferResponse[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  } {
    const total = transfers.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const items = transfers.slice(startIndex, endIndex);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      }
    };
  }
}

/**
 * Transfer Calendar Utilities
 */
export class TransferCalendarUtils {
  /**
   * Convert transfer to calendar event
   */
  static transferToCalendarEvent(transfer: TransferResponse): TransferCalendarEvent {
    const startDate = transfer.scheduledDate ? new Date(transfer.scheduledDate) : new Date(transfer.requestedDate);
    const endDate = transfer.scheduledDate ? new Date(transfer.scheduledDate) : DateUtils.addHours(startDate, 1);
    
    const priorityInfo = TransferDisplayUtils.getPriorityDisplayInfo(transfer.priority);
    
    return {
      id: transfer._id,
      title: transfer.patientInfo ? `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}` : 'Unknown Patient',
      start: startDate,
      end: endDate,
      transferId: transfer.transferId,
      patientInfo: {
        name: transfer.patientInfo ? `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}` : 'Unknown Patient',
        age: transfer.patientInfo?.age || 0
      },
      fromHospital: transfer.fromHospital,
      toHospital: transfer.toHospital,
      priority: transfer.priority,
      status: transfer.status,
      assignedTo: transfer.assignedTo?.firstName + ' ' + transfer.assignedTo?.lastName,
      color: this.getEventColor(transfer.priority, transfer.status)
    };
  }

  /**
   * Get event color based on priority and status
   */
  private static getEventColor(priority: TransferPriority, status: TransferStatus): string {
    if (status === TransferStatus.CANCELLED) return '#ef4444'; // red
    if (status === TransferStatus.COMPLETED) return '#10b981'; // green
    
    switch (priority) {
      case TransferPriority.URGENT:
        return '#dc2626'; // red
      case TransferPriority.HIGH:
        return '#ea580c'; // orange
      case TransferPriority.MEDIUM:
        return '#d97706'; // amber
      case TransferPriority.LOW:
        return '#059669'; // emerald
      default:
        return '#6b7280'; // gray
    }
  }

  /**
   * Generate recurring transfer instances
   * Note: Recurring transfers are not supported in current implementation
   */
  /*
  static generateRecurringInstances(
    transfer: TransferResponse,
    startDate: Date,
    endDate: Date
  ): any[] {
    // Recurring transfers not supported
    return [];
  }
  */
}

/**
 * Transfer Validation Utilities
 */
export class TransferValidationUtils {
  /**
   * Validate transfer ID format
   */
  static isValidTransferId(transferId: string): boolean {
    const pattern = /^TRF-\d{13}-[A-Z0-9]{9}$/;
    return pattern.test(transferId);
  }

  /**
   * Validate patient ID format
   */
  static isValidPatientId(patientId: string): boolean {
    const pattern = /^PAT-\d{13}-[A-Z0-9]{6}$/;
    return pattern.test(patientId);
  }

  /**
   * Validate time format (HH:MM)
   */
  static isValidTimeFormat(time: string): boolean {
    const pattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return pattern.test(time);
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  }

  /**
   * Validate phone format
   */
  static isValidPhone(phone: string): boolean {
    const pattern = /^[\+]?[1-9][\d]{0,15}$/;
    return pattern.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(file: File): { isValid: boolean; error?: string } {
    const maxSize = TRANSFER_CONFIG.FILE_UPLOAD.MAX_FILE_SIZE_MB * 1024 * 1024;
    const allowedTypes = TRANSFER_CONFIG.FILE_UPLOAD.ALLOWED_TYPES;
    
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size must be less than ${TRANSFER_CONFIG.FILE_UPLOAD.MAX_FILE_SIZE_MB}MB`
      };
    }
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedTypes.includes(fileExtension as any)) {
      return {
        isValid: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }
    
    return { isValid: true };
  }
}

