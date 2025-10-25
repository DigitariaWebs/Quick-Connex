/**
 * Client Services Exports
 * 
 * Central export point for all client-side services.
 */

// Base API client
export { ApiClient, apiClient, ApiError } from './api-client';
export type { ApiResponse, ApiClientOptions, RequestOptions } from './api-client';

// Shared types
export * from './client-types';

// Auth services
export { AuthClient, authClient } from './auth';
export type { 
  LoginCredentials, 
  SignupData, 
  LoginResult, 
  SignupResult,
  PasswordResetRequest,
  PasswordResetData,
  AuthClientOptions,
  AuthState,
  AuthHookResult
} from './auth';

// Dashboard services
export { DashboardClient, dashboardClient } from './dashboard';
export type {
  DashboardClientOptions,
  TransferFilters,
  SystemHealthOptions,
  DashboardClientResult,
  DashboardStatsResult,
  UrgentTransfersResult,
  RecentActivityResult,
  SystemHealthResult,
  DashboardDataResult,
  ProcessedTransfer,
  ProcessedActivity
} from './dashboard';
