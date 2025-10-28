/**
 * Normalized API Error Types
 * 
 * Error types for ResponseBuilder responses
 */

/**
 * Normalized API error for ResponseBuilder responses
 */
export interface NormalizedApiError extends Error {
  code: string;
  details?: unknown;
  status?: number;
}
