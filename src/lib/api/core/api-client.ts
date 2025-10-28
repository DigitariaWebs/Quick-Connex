/**
 * API Client with ResponseBuilder Flattening
 * 
 * Axios-based client that flattens ResponseBuilder envelope responses
 * and provides a clean interface for the new backend.
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiEnvelope, ApiSuccess, FlattenedResponse } from '../types/response.types';
import { NormalizedApiError } from '../types/error.types';

// Create Axios instance with backend URL and credentials
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to flatten ResponseBuilder responses
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const body = response.data as ApiEnvelope<unknown>;
    
    // Check if this is a ResponseBuilder envelope
    if (body && typeof body === 'object' && 'success' in body) {
      if ((body as ApiSuccess<unknown>).success) {
        // Success response - return flattened data
        const { data, meta } = body as ApiSuccess<unknown>;
        response.data = { data, meta } as any;
        return response;
      } else {
        // Error response - throw normalized error
        const { code, message, details } = (body as any).error;
        const error: NormalizedApiError = Object.assign(new Error(message), {
          code,
          details,
          status: response.status,
        });
        throw error;
      }
    }
    
    // Non-ResponseBuilder response - return as-is
    response.data = { data: body as unknown, meta: undefined } as any;
    return response;
  },
  (error) => {
    // Handle Axios errors (network, timeout, etc.)
    if (error.response?.data) {
      const body = error.response.data as ApiEnvelope<unknown>;
      if (body && typeof body === 'object' && 'success' in body && !(body as ApiSuccess<unknown>).success) {
        // Backend error response
        const { code, message, details } = (body as any).error;
        const normalizedError: NormalizedApiError = Object.assign(new Error(message), {
          code,
          details,
          status: error.response.status,
        });
        throw normalizedError;
      }
    }
    
    // Network or other Axios error
    const normalizedError: NormalizedApiError = Object.assign(
      new Error(error.message || 'Network error'),
      {
        code: 'NETWORK_ERROR',
        status: error.response?.status || 0,
      }
    );
    throw normalizedError;
  }
);

/**
 * Make a request with ResponseBuilder flattening
 */
export async function request<T>(config: AxiosRequestConfig): Promise<FlattenedResponse<T>> {
  const response = await api.request(config);
  return response as FlattenedResponse<T>;
}

// Export convenience methods
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) => request<T>({ ...config, method: 'GET', url }),
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) => request<T>({ ...config, method: 'POST', url, data }),
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) => request<T>({ ...config, method: 'PUT', url, data }),
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) => request<T>({ ...config, method: 'PATCH', url, data }),
  delete: <T>(url: string, config?: AxiosRequestConfig) => request<T>({ ...config, method: 'DELETE', url }),
};
