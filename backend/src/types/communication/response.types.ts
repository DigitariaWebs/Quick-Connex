/**
 * Communication Response Types
 * 
 * Response and result types for communication operations.
 */

import { CommunicationChannel, CommunicationStatus, CommunicationAnalytics } from './core.types';

/**
 * Base API Response
 */
export interface BaseResponse {
  success: boolean;
  message: string;
  timestamp: Date;
  requestId?: string;
}

/**
 * Communication Service Response
 */
export interface CommunicationServiceResponse extends BaseResponse {
  messageId: string;
  providerId?: string;
  status: CommunicationStatus;
  error?: string;
  cost?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

/**
 * Bulk Communication Response
 */
export interface BulkCommunicationResponse extends BaseResponse {
  totalSent: number;
  totalFailed: number;
  results: CommunicationServiceResponse[];
  summary: {
    byChannel: Record<CommunicationChannel, number>;
    byStatus: Record<CommunicationStatus, number>;
    totalCost: number;
    averageDeliveryTime: number;
  };
}

/**
 * Template Response
 */
export interface TemplateResponse extends BaseResponse {
  templateId: string;
  content?: {
    subject?: string;
    text: string;
    html?: string;
  };
  variables?: {
    used: string[];
    missing: string[];
    unused: string[];
  };
}

/**
 * Analytics Response
 */
export interface AnalyticsResponse extends BaseResponse {
  analytics: CommunicationAnalytics;
  timeRange: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;
}

/**
 * Health Check Response
 */
export interface HealthCheckResponse extends BaseResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    email: ServiceHealth;
    sms: ServiceHealth;
    queue: ServiceHealth;
    database: ServiceHealth;
  };
  uptime: number;
  version: string;
}

/**
 * Service Health
 */
export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: Date;
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Provider Status Response
 */
export interface ProviderStatusResponse extends BaseResponse {
  providers: {
    email: ProviderStatus;
    sms: ProviderStatus;
  };
}

/**
 * Provider Status
 */
export interface ProviderStatus {
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastUsed?: Date;
  successRate: number;
  averageResponseTime: number;
  quota?: {
    used: number;
    limit: number;
    resetDate: Date;
  };
}

/**
 * User Preferences Response
 */
export interface UserPreferencesResponse extends BaseResponse {
  userId: string;
  preferences: {
    email: ChannelPreferences;
    sms: ChannelPreferences;
    push: ChannelPreferences;
  };
  updatedAt: Date;
}

/**
 * Channel Preferences
 */
export interface ChannelPreferences {
  enabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  types: string[];
  quietHours?: {
    start: string; // HH:MM format
    end: string; // HH:MM format
    timezone: string;
  };
}

/**
 * Error Response
 */
export interface ErrorResponse extends BaseResponse {
  error: {
    code: string;
    type: string;
    details?: any;
    stack?: string;
  };
  retryable: boolean;
  retryAfter?: number; // in seconds
}

/**
 * Validation Response
 */
export interface ValidationResponse extends BaseResponse {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation Error
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code: string;
}

/**
 * Validation Warning
 */
export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> extends BaseResponse {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Search Response
 */
export interface SearchResponse<T> extends BaseResponse {
  results: T[];
  query: {
    term: string;
    filters: Record<string, any>;
    sort: Record<string, 'asc' | 'desc'>;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

/**
 * Export Response
 */
export interface ExportResponse extends BaseResponse {
  exportId: string;
  format: 'csv' | 'json' | 'xlsx' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt: Date;
  recordCount: number;
}

/**
 * Import Response
 */
export interface ImportResponse extends BaseResponse {
  importId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  summary: {
    totalRecords: number;
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  errors?: Array<{
    row: number;
    field: string;
    message: string;
    value: any;
  }>;
}

