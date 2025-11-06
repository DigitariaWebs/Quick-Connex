/**
 * Audit Log DTOs
 * 
 * Data Transfer Objects for Audit Log-related API responses.
 */

export interface AuditLogDTO {
  _id: string;
  actorId: string;
  actorType: 'admin' | 'user' | 'system' | 'api' | 'batch';
  actorEmail?: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  description: string;
  targetResourceId?: string;
  targetResourceType?: string;
  metadata?: Record<string, any>;
  requestInfo?: {
    ipAddress: string;
    userAgent: string;
    method?: string;
    endpoint?: string;
  };
  success: boolean;
  errorMessage?: string;
  riskLevel: 'low' | 'medium' | 'high';
  isSensitive: boolean;
  requiresReview: boolean;
  timestamp: Date;
}

export interface AuditLogListDTO {
  logs: AuditLogDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AuditLogStatsDTO {
  total: number;
  byActorType: {
    admin: number;
    user: number;
    system: number;
    api: number;
    batch: number;
  };
  byRiskLevel: {
    low: number;
    medium: number;
    high: number;
  };
  bySuccess: {
    success: number;
    failed: number;
  };
  recentActivity: number;
  sensitiveLogs: number;
  requiresReview: number;
}
