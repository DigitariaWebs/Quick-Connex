/**
 * Transfer DTOs
 * 
 * Data Transfer Objects for Transfer-related API responses.
 */

export interface TransferDTO {
  _id: string;
  transferId: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'stat';
  patientInfo: {
    firstName: string;
    lastName: string;
    age?: number;
    dossierNumber?: string;
  };
  fromHospital: {
    _id: string;
    name: string;
    address: string;
  };
  toHospital: {
    _id: string;
    name: string;
    address: string;
  };
  requestedDate: Date;
  scheduledDate?: Date;
  reason: string;
  assignedTo?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferListDTO {
  transfers: TransferDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TransferStatsDTO {
  total: number;
  pending: number;
  accepted: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  urgent: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
    stat: number;
  };
  averageProcessingTime: number;
  successRate: number;
}
