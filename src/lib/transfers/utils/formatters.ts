/**
 * Transfer Formatting Utilities
 * 
 * Formatting functions for display and presentation.
 */

import {
  TransferStatus,
  TransferPriority,
  STATUS_DISPLAY_INFO,
  PRIORITY_DISPLAY_INFO
} from '../core/constants';
import { TransferResponse, TransferCalendarEvent } from '@/types/transfer';

/**
 * Transfer Display Utilities
 */
export class TransferDisplayUtils {
  /**
   * Get status display information
   */
  static getStatusDisplayInfo(status: TransferStatus) {
    return STATUS_DISPLAY_INFO[status] || {
      label: status,
      color: 'gray',
      icon: 'circle'
    };
  }

  /**
   * Get priority display information
   */
  static getPriorityDisplayInfo(priority: TransferPriority) {
    return PRIORITY_DISPLAY_INFO[priority] || {
      label: priority,
      color: 'gray',
      icon: 'circle'
    };
  }

  /**
   * Format transfer ID for display
   */
  static formatTransferId(transferId: string): string {
    return transferId.toUpperCase();
  }

  /**
   * Format patient name for display
   */
  static formatPatientName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName}`.trim();
  }

  /**
   * Format hospital name for display
   */
  static formatHospitalName(hospitalName: string): string {
    return hospitalName.trim();
  }

  /**
   * Format reason for display (truncate if too long)
   */
  static formatReason(reason: string, maxLength: number = 100): string {
    if (reason.length <= maxLength) return reason;
    return reason.substring(0, maxLength) + '...';
  }

  /**
   * Format duration for display
   */
  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Format completion rate for display
   */
  static formatCompletionRate(rate: number): string {
    return `${rate.toFixed(1)}%`;
  }

  /**
   * Format transfer summary for display
   */
  static formatTransferSummary(transfer: TransferResponse): string {
    const patientName = this.formatPatientName(
      transfer.patientInfo.firstName,
      transfer.patientInfo.lastName
    );
    const statusInfo = this.getStatusDisplayInfo(transfer.status);
    
    return `${patientName} - ${statusInfo.label} (${transfer.fromHospital} → ${transfer.toHospital})`;
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
    return {
      id: transfer._id,
      title: this.formatEventTitle(transfer),
      start: new Date(transfer.scheduledDate || transfer.requestedDate),
      end: this.calculateEndTime(transfer),
      transferId: transfer.transferId,
      patientInfo: {
        name: `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`,
        age: transfer.patientInfo.age || 0
      },
      fromHospital: transfer.fromHospital,
      toHospital: transfer.toHospital,
      priority: transfer.priority,
      status: transfer.status,
      assignedTo: transfer.assignedTo?._id?.toString(),
      color: this.getEventColor(transfer)
    };
  }

  /**
   * Format event title for calendar
   */
  private static formatEventTitle(transfer: TransferResponse): string {
    const patientName = `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`;
    const priority = transfer.priority === 'urgent' ? '🚨 ' : '';
    return `${priority}${patientName}`;
  }

  /**
   * Calculate end time for calendar event
   */
  private static calculateEndTime(transfer: TransferResponse): Date {
    const startTime = new Date(transfer.scheduledDate || transfer.requestedDate);
    // Default to 1 hour duration if no estimated duration
    const durationMinutes = transfer.estimatedDuration || 60;
    return new Date(startTime.getTime() + durationMinutes * 60000);
  }

  /**
   * Get event color based on status and priority
   */
  private static getEventColor(transfer: TransferResponse): string {
    if (transfer.priority === 'urgent') return '#ff6b6b';
    
    switch (transfer.status) {
      case 'pending': return '#ffd93d';
      case 'accepted': return '#6bcf7f';
      case 'in_progress': return '#4d9de0';
      case 'completed': return '#95a5a6';
      case 'cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  }

  /**
   * Get event border color
   */
  private static getEventBorderColor(transfer: TransferResponse): string {
    if (transfer.priority === 'urgent') return '#e74c3c';
    return this.getEventColor(transfer);
  }

  /**
   * Get event text color
   */
  private static getEventTextColor(transfer: TransferResponse): string {
    if (transfer.priority === 'urgent') return '#ffffff';
    return '#2c3e50';
  }

  /**
   * Filter calendar events by date range
   */
  static filterEventsByDateRange(
    events: TransferCalendarEvent[],
    startDate: Date,
    endDate: Date
  ): TransferCalendarEvent[] {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      return eventStart >= startDate && eventStart <= endDate;
    });
  }

  /**
   * Filter calendar events by status
   */
  static filterEventsByStatus(
    events: TransferCalendarEvent[],
    statuses: TransferStatus[]
  ): TransferCalendarEvent[] {
    return events.filter(event => 
      statuses.includes(event.status)
    );
  }

  /**
   * Filter calendar events by priority
   */
  static filterEventsByPriority(
    events: TransferCalendarEvent[],
    priorities: TransferPriority[]
  ): TransferCalendarEvent[] {
    return events.filter(event => 
      priorities.includes(event.priority)
    );
  }
}
