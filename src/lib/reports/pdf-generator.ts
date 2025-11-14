import PDFDocument from 'pdfkit';
import { UserReportData, TransferReportData, TransferSummaryReportData, TimeRange } from '@/types/reports/report.types';

/**
 * PDF Generator Service
 * 
 * Generates PDF reports for admin dashboard
 */

export class PDFGenerator {
  /**
   * Generate User Report PDF
   */
  static async generateUserReport(data: UserReportData, timeRange: TimeRange): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('User Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Period: ${new Date(data.period.start).toLocaleDateString()} - ${new Date(data.period.end).toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);

      // Status Breakdown
      doc.fontSize(16).text('User Status Breakdown', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Total Users: ${data.statusBreakdown.total}`);
      doc.text(`Approved: ${data.statusBreakdown.approved}`);
      doc.text(`Pending: ${data.statusBreakdown.pending}`);
      doc.text(`Suspended: ${data.statusBreakdown.suspended}`);
      doc.text(`Rejected: ${data.statusBreakdown.rejected}`);
      doc.moveDown();

      // Role Breakdown
      doc.fontSize(16).text('Users by Role', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Employees: ${data.roleBreakdown.employee}`);
      doc.text(`Managers: ${data.roleBreakdown.manager}`);
      doc.text(`Admins: ${data.roleBreakdown.admin}`);
      doc.text(`Super Admins: ${data.roleBreakdown.super_admin}`);
      doc.moveDown();

      // New Users
      doc.fontSize(16).text('New Users in Period', { underline: true });
      doc.moveDown();
      doc.fontSize(11).text(`New Users: ${data.newUsersInPeriod}`);
      doc.moveDown();

      // Activity Summary
      if (data.activitySummary.length > 0) {
        doc.addPage();
        doc.fontSize(16).text('User Activity Summary', { underline: true });
        doc.moveDown();
        
        data.activitySummary.forEach((activity, index) => {
          if (index > 0 && index % 20 === 0) {
            doc.addPage();
          }
          
          doc.fontSize(10);
          doc.text(`${activity.userName} (${activity.userEmail})`, { continued: false });
          doc.fontSize(9).fillColor('gray');
          doc.text(`  ${activity.action} - ${new Date(activity.timestamp).toLocaleString()}`);
          doc.fillColor('black');
          doc.text(`  ${activity.description}`);
          doc.moveDown(0.5);
        });
      }

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).text(
          `Page ${i + 1} of ${pages.count}`,
          50,
          doc.page.height - 30,
          { align: 'center' }
        );
      }

      doc.end();
    });
  }

  /**
   * Generate Individual Transfer Report PDF
   */
  static async generateTransferReport(data: TransferReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Transfer Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Transfer ID: ${data.transferId}`, { align: 'center' });
      doc.moveDown(2);

      // Transfer Information
      doc.fontSize(16).text('Transfer Information', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Category: ${data.transferCategory}`);
      doc.text(`Status: ${data.status}`);
      doc.text(`Priority: ${data.priority}`);
      doc.text(`Requested Date: ${new Date(data.requestedDate).toLocaleString()}`);
      if (data.scheduledDate) {
        doc.text(`Scheduled Date: ${new Date(data.scheduledDate).toLocaleString()}`);
      }
      if (data.completedDate) {
        doc.text(`Completed Date: ${new Date(data.completedDate).toLocaleString()}`);
      }
      doc.text(`Reason: ${data.reason}`);
      if (data.notes) {
        doc.text(`Notes: ${data.notes}`);
      }
      doc.moveDown();

      // Category-specific information
      if (data.patientInfo) {
        doc.fontSize(16).text('Patient Information', { underline: true });
        doc.moveDown();
        doc.fontSize(11);
        doc.text(`Name: ${data.patientInfo.firstName} ${data.patientInfo.lastName}`);
        doc.text(`Age: ${data.patientInfo.age}`);
        if (data.patientInfo.dossierNumber) {
          doc.text(`Dossier Number: ${data.patientInfo.dossierNumber}`);
        }
        doc.moveDown();
      }

      if (data.envelopeInfo) {
        doc.fontSize(16).text('Envelope Information', { underline: true });
        doc.moveDown();
        doc.fontSize(11);
        doc.text(`Sender: ${data.envelopeInfo.senderName}`);
        doc.text(`Recipient: ${data.envelopeInfo.recipientName}`);
        doc.text(`Contents: ${data.envelopeInfo.contents}`);
        if (data.envelopeInfo.envelopeNumber) {
          doc.text(`Envelope Number: ${data.envelopeInfo.envelopeNumber}`);
        }
        if (data.envelopeInfo.weight) {
          doc.text(`Weight: ${data.envelopeInfo.weight} kg`);
        }
        doc.moveDown();
      }

      if (data.equipmentInfo) {
        doc.fontSize(16).text('Equipment Information', { underline: true });
        doc.moveDown();
        doc.fontSize(11);
        doc.text(`Equipment Name: ${data.equipmentInfo.equipmentName}`);
        doc.text(`Model: ${data.equipmentInfo.model}`);
        doc.text(`Condition: ${data.equipmentInfo.condition}`);
        if (data.equipmentInfo.serialNumber) {
          doc.text(`Serial Number: ${data.equipmentInfo.serialNumber}`);
        }
        doc.moveDown();
      }

      // Hospital Information
      doc.fontSize(16).text('Hospital Information', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`From: ${data.fromHospital.name}`);
      doc.text(`  Address: ${data.fromHospital.address || 'N/A'}`);
      doc.moveDown(0.5);
      doc.text(`To: ${data.toHospital.name}`);
      doc.text(`  Address: ${data.toHospital.address || 'N/A'}`);
      doc.moveDown();

      // User Information
      doc.fontSize(16).text('Involved People', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Requested By: ${data.requestedBy.firstName} ${data.requestedBy.lastName}`);
      doc.text(`  Email: ${data.requestedBy.email}`);
      doc.text(`  Phone: ${data.requestedBy.phone || 'N/A'}`);
      doc.text(`  Role: ${data.requestedBy.userType}`);
      doc.moveDown(0.5);
      
      if (data.assignedTo) {
        doc.text(`Assigned To: ${data.assignedTo.firstName} ${data.assignedTo.lastName}`);
        doc.text(`  Email: ${data.assignedTo.email}`);
        doc.text(`  Phone: ${data.assignedTo.phone || 'N/A'}`);
        doc.text(`  Role: ${data.assignedTo.userType}`);
        doc.moveDown();
      }

      // Timeline
      if (data.timeline.length > 0) {
        doc.addPage();
        doc.fontSize(16).text('Transfer Timeline', { underline: true });
        doc.moveDown();
        
        data.timeline.forEach((event, index) => {
          if (index > 0 && index % 15 === 0) {
            doc.addPage();
          }
          
          doc.fontSize(10);
          doc.text(`${new Date(event.timestamp).toLocaleString()}`, { continued: false });
          doc.fontSize(9).fillColor('gray');
          doc.text(`  by ${event.actor.name}`);
          doc.fillColor('black');
          doc.fontSize(10);
          doc.text(`  ${event.action}`);
          doc.fontSize(9).fillColor('gray');
          doc.text(`  ${event.description}`);
          doc.fillColor('black');
          doc.moveDown(0.5);
        });
      }

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).text(
          `Page ${i + 1} of ${pages.count}`,
          50,
          doc.page.height - 30,
          { align: 'center' }
        );
      }

      doc.end();
    });
  }

  /**
   * Generate Transfer Summary Report PDF
   */
  static async generateTransferSummaryReport(data: TransferSummaryReportData, timeRange: TimeRange): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Transfer Summary Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Period: ${new Date(data.period.start).toLocaleDateString()} - ${new Date(data.period.end).toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);

      // Statistics
      doc.fontSize(16).text('Statistics', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Total Transfers: ${data.statistics.total}`);
      doc.moveDown(0.5);
      doc.text('By Status:');
      doc.text(`  Pending: ${data.statistics.byStatus.pending}`);
      doc.text(`  Accepted: ${data.statistics.byStatus.accepted}`);
      doc.text(`  In Progress: ${data.statistics.byStatus.in_progress}`);
      doc.text(`  Completed: ${data.statistics.byStatus.completed}`);
      doc.text(`  Cancelled: ${data.statistics.byStatus.cancelled}`);
      doc.moveDown(0.5);
      doc.text('By Priority:');
      doc.text(`  Low: ${data.statistics.byPriority.low}`);
      doc.text(`  Urgent: ${data.statistics.byPriority.urgent}`);
      doc.moveDown(0.5);
      doc.text('By Category:');
      doc.text(`  Patient: ${data.statistics.byCategory.patient}`);
      doc.text(`  Envelope: ${data.statistics.byCategory.envelope}`);
      doc.text(`  Medical Instruments: ${data.statistics.byCategory.medical_instruments}`);
      doc.moveDown();

      // Transfer Details
      if (data.transfers.length > 0) {
        data.transfers.forEach((transfer, index) => {
          if (index > 0) {
            doc.addPage();
          }
          
          doc.fontSize(16).text(`Transfer ${index + 1}: ${transfer.transferId}`, { underline: true });
          doc.moveDown();
          doc.fontSize(11);
          doc.text(`Category: ${transfer.transferCategory}`);
          doc.text(`Status: ${transfer.status}`);
          doc.text(`Priority: ${transfer.priority}`);
          doc.text(`Requested Date: ${new Date(transfer.requestedDate).toLocaleString()}`);
          doc.text(`From: ${transfer.fromHospital.name}`);
          doc.text(`To: ${transfer.toHospital.name}`);
          doc.text(`Requested By: ${transfer.requestedBy.firstName} ${transfer.requestedBy.lastName} (${transfer.requestedBy.email})`);
          if (transfer.assignedTo) {
            doc.text(`Assigned To: ${transfer.assignedTo.firstName} ${transfer.assignedTo.lastName} (${transfer.assignedTo.email})`);
          }
          doc.text(`Reason: ${transfer.reason}`);
          
          if (transfer.patientInfo) {
            doc.moveDown(0.5);
            doc.text(`Patient: ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}, Age: ${transfer.patientInfo.age}`);
          }
          
          if (transfer.envelopeInfo) {
            doc.moveDown(0.5);
            doc.text(`Envelope: ${transfer.envelopeInfo.senderName} → ${transfer.envelopeInfo.recipientName}`);
          }
          
          if (transfer.completedDate) {
            doc.moveDown(0.5);
            doc.text(`Completed: ${new Date(transfer.completedDate).toLocaleString()}`);
          }
        });
      }

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).text(
          `Page ${i + 1} of ${pages.count}`,
          50,
          doc.page.height - 30,
          { align: 'center' }
        );
      }

      doc.end();
    });
  }
}

