/**
 * Report Types
 * 
 * TypeScript interfaces for admin reports system
 */

export type TimeRange = '7d' | '30d' | '90d' | 'all';

export interface ReportFilters {
  timeRange: TimeRange;
}

// User Report Types
export interface UserStatusBreakdown {
  approved: number;
  pending: number;
  suspended: number;
  rejected: number;
  total: number;
}

export interface UserRoleBreakdown {
  employee: number;
  manager: number;
  admin: number;
  super_admin: number;
}

export interface UserActivityItem {
  userId: string;
  userName: string;
  userEmail: string;
  userType: string;
  action: string;
  description: string;
  timestamp: string;
  category: string;
}

export interface UserReportData {
  timeRange: TimeRange;
  period: {
    start: string;
    end: string;
  };
  statusBreakdown: UserStatusBreakdown;
  roleBreakdown: UserRoleBreakdown;
  totalUsers: number;
  newUsersInPeriod: number;
  activitySummary: UserActivityItem[];
}

// Transfer Report Types
export interface TransferUserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  userType: string;
}

export interface TransferHospitalInfo {
  id: string;
  name: string;
  address: string;
  organization?: {
    type: string;
    name: string;
    region: string;
  };
}

export interface TransferTimelineEvent {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    email: string;
    userType: string;
  };
  status?: string;
  changes?: any;
}

export interface TransferReportData {
  transferId: string;
  transferCategory: 'patient' | 'envelope' | 'medical_instruments';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'urgent';
  requestedDate: string;
  scheduledDate?: string;
  acceptedAt?: string;
  completedDate?: string;
  reason: string;
  notes?: string;
  
  // Transfer-specific data
  patientInfo?: {
    firstName: string;
    lastName: string;
    age: number;
    dossierNumber?: string;
  };
  envelopeInfo?: {
    envelopeNumber?: string;
    senderName: string;
    recipientName: string;
    contents: string;
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
  };
  equipmentInfo?: {
    equipmentName: string;
    serialNumber?: string;
    model: string;
    condition: string;
    maintenanceRequired: boolean;
    specialInstructions?: string;
  };
  
  // Hospital information
  fromHospital: TransferHospitalInfo;
  toHospital: TransferHospitalInfo;
  
  // User information
  requestedBy: TransferUserInfo;
  assignedTo?: TransferUserInfo;
  
  // Timeline
  timeline: TransferTimelineEvent[];
  
  // Additional info
  estimatedDuration?: number;
  actualDuration?: number;
  medicalDocuments?: string[];
}

export interface TransferSummaryStatistics {
  total: number;
  byStatus: {
    pending: number;
    accepted: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  byPriority: {
    low: number;
    urgent: number;
  };
  byCategory: {
    patient: number;
    envelope: number;
    medical_instruments: number;
  };
}

export interface TransferSummaryReportData {
  timeRange: TimeRange;
  period: {
    start: string;
    end: string;
  };
  statistics: TransferSummaryStatistics;
  transfers: TransferReportData[];
}

