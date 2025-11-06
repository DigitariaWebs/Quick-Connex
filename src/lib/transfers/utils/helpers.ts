/**
 * Transfer Helper Functions
 * 
 * General utility functions for transfer operations.
 */

import {
  TransferStatus,
  TransferPriority,
  TransferType,
  STATUS_DISPLAY_INFO,
  PRIORITY_DISPLAY_INFO
} from '../core/constants';
import { TRANSFER_CONFIG } from '../core/config';
import {
  SchedulingConfig,
  TransferCalendarEvent,
  TransferStats
} from '@/types/transfers/transfer.types';
import { TransferResponse } from '@/types/dto/transfer.dto';
import {
  TransferFilterOptions,
  TransferQueryOptions
} from '@/types/transfers/service.types';

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
   * Check if date is today
   */
  static isToday(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return dateObj.toDateString() === today.toDateString();
  }

  /**
   * Check if date is in the past
   */
  static isPast(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj < new Date();
  }

  /**
   * Check if date is in the future
   */
  static isFuture(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj > new Date();
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
    const total = transfers.length;
    const pending = transfers.filter(t => t.status === TransferStatus.PENDING).length;
    const accepted = transfers.filter(t => t.status === TransferStatus.ACCEPTED).length;
    const inProgress = transfers.filter(t => t.status === TransferStatus.IN_PROGRESS).length;
    const completed = transfers.filter(t => t.status === TransferStatus.COMPLETED).length;
    const cancelled = transfers.filter(t => t.status === TransferStatus.CANCELLED).length;
    const urgent = transfers.filter(t => t.priority === TransferPriority.URGENT).length;
    const low = transfers.filter(t => t.priority === TransferPriority.LOW).length;

    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    // Calculate average completion time
    const completedTransfers = transfers.filter(t => t.status === TransferStatus.COMPLETED && t.actualDuration);
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
      low,
      averageCompletionTime,
      completionRate
    };
  }

  /**
   * Calculate completion rate
   */
  static calculateCompletionRate(transfers: TransferResponse[]): number {
    const total = transfers.length;
    const completed = transfers.filter(t => t.status === TransferStatus.COMPLETED).length;
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
    
    return completedTransfers.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / completedTransfers.length;
  }
}

/**
 * Transfer Filter Utilities
 */
export class TransferFilterUtils {
  /**
   * Apply filters to transfers
   */
  static applyFilters(transfers: TransferResponse[], filters: TransferFilterOptions): TransferResponse[] {
    let filtered = [...transfers];

    // Status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(t => filters.status!.includes(t.status));
    }

    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      filtered = filtered.filter(t => filters.priority!.includes(t.priority));
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter(t => {
        const transferDate = new Date(t.requestedDate);
        if (filters.dateFrom && transferDate < filters.dateFrom) return false;
        if (filters.dateTo && transferDate > filters.dateTo) return false;
        return true;
      });
    }

    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.transferId.toLowerCase().includes(searchLower) ||
        t.patientInfo.firstName.toLowerCase().includes(searchLower) ||
        t.patientInfo.lastName.toLowerCase().includes(searchLower) ||
        t.fromHospital.toLowerCase().includes(searchLower) ||
        t.toHospital.toLowerCase().includes(searchLower) ||
        t.reason.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  /**
   * Sort transfers
   */
  static sortTransfers(transfers: TransferResponse[], sortBy: string, direction: 'asc' | 'desc' = 'desc'): TransferResponse[] {
    return [...transfers].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'requestedDate':
          aValue = new Date(a.requestedDate);
          bValue = new Date(b.requestedDate);
          break;
        case 'priority':
          const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'status':
          const statusOrder = { 'pending': 1, 'accepted': 2, 'in_progress': 3, 'completed': 4, 'cancelled': 5 };
          aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
          bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
          break;
        default:
          aValue = a[sortBy as keyof TransferResponse];
          bValue = b[sortBy as keyof TransferResponse];
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
}

/**
 * Transfer Validation Utilities
 */
export class TransferValidationUtils {
  /**
   * Validate transfer data
   */
  static validateTransferData(data: any): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    const requiredFields = [
      'patientFirstName',
      'patientLastName',
      'patientDossierNumber',
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
      errors.push('Source and destination hospitals cannot be the same');
    }

    // Date validation
    if (data.transferDate) {
      const transferDate = new Date(data.transferDate);
      const now = new Date();
      
      if (transferDate < now) {
        errors.push('Transfer date cannot be in the past');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Note: Status transition validation functions moved to validation.ts
  // Use validateStatusTransition() and isTerminalStatus() from validation.ts instead
}

