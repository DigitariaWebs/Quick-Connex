/**
 * Enhanced API Client
 * 
 * Type-safe HTTP client with standardized request/response handling,
 * automatic retry logic, and comprehensive error handling.
 */

import { ApiResponse, PaginatedResponse, PaginationParams } from '../types/response.types';
import { ApiErrorException, ErrorCode, NetworkError, TimeoutError, AbortedError } from '../types/error.types';
import { ErrorHandler } from './error-handler';

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * Enhanced API Client with standardized request/response handling
 */
export class ApiClient {
  private baseURL: string;
  private defaultTimeout: number;
  private defaultRetries: number;
  private defaultRetryDelay: number;
  private defaultHeaders: Record<string, string>;

  constructor(options: {
    baseURL?: string;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    headers?: Record<string, string>;
  } = {}) {
    this.baseURL = options.baseURL || '';
    this.defaultTimeout = options.timeout || 30000;
    this.defaultRetries = options.retries || 3;
    this.defaultRetryDelay = options.retryDelay || 1000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  }

  /**
   * GET request
   */
  async get<T>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', url, undefined, options);
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', url, data, options);
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PUT', url, data, options);
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PATCH', url, data, options);
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  /**
   * GET paginated data
   */
  async getPaginated<T>(
    url: string,
    params?: PaginationParams,
    options: RequestOptions = {}
  ): Promise<PaginatedResponse<T>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.sort) queryParams.set('sort', params.sort);
    if (params?.order) queryParams.set('order', params.order);

    const fullUrl = queryParams.toString() ? `${url}?${queryParams}` : url;
    return this.request<PaginatedResponse<T>>('GET', fullUrl, undefined, options);
  }

  /**
   * Core request method with retry logic
   */
  private async request<T>(
    method: string,
    url: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const fullUrl = this.baseURL + url;
    const timeout = options.timeout || this.defaultTimeout;
    const retries = options.retries ?? this.defaultRetries;
    const retryDelay = options.retryDelay || this.defaultRetryDelay;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const requestOptions: RequestInit = {
          method,
          headers: {
            ...this.defaultHeaders,
            ...options.headers,
          },
          credentials: 'include',
          signal: controller.signal,
          ...options,
        };

        // Add body for requests that support it
        if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
          if (data instanceof FormData) {
            requestOptions.body = data;
            delete (requestOptions.headers as any)['Content-Type'];
          } else {
            requestOptions.body = JSON.stringify(data);
          }
        }

        const response = await fetch(fullUrl, requestOptions);
        clearTimeout(timeoutId);

        return await this.handleResponse<T>(response);

      } catch (error) {
        lastError = error as Error;

        // Handle abort as timeout
        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new TimeoutError();
        }

        // Check if we should retry
        const shouldRetry = ErrorHandler.shouldRetry(lastError, attempt, retries);
        if (!shouldRetry || attempt === retries) {
          throw lastError;
        }

        // Wait before retrying with exponential backoff
        await this.delay(retryDelay * Math.pow(2, attempt));
      }
    }

    throw lastError || new NetworkError('Request failed after all retries');
  }

  /**
   * Handle response and extract data
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    // Parse JSON response
    if (contentType?.includes('application/json')) {
      const apiResponse: ApiResponse<any> = await response.json();

      // Handle error responses
      if (!response.ok || !apiResponse.success) {
        throw ErrorHandler.parseApiError(apiResponse.error!, response.status);
      }

      // For paginated responses, return the full structure
      if ('pagination' in apiResponse) {
        return apiResponse as T;
      }

      // For regular responses, return just the data
      return apiResponse.data as T;
    }

    // Handle non-JSON responses
    if (!response.ok) {
      const text = await response.text();
      throw new ApiErrorException(
        ErrorCode.SERVER_ERROR,
        text || 'Request failed',
        response.status
      );
    }

    const text = await response.text();
    return text as T;
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a new instance with different options
   */
  create(options: {
    baseURL?: string;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    headers?: Record<string, string>;
  }): ApiClient {
    return new ApiClient({
      baseURL: this.baseURL,
      timeout: this.defaultTimeout,
      retries: this.defaultRetries,
      retryDelay: this.defaultRetryDelay,
      headers: { ...this.defaultHeaders },
      ...options,
    });
  }
}

// Default instance
export const apiClient = new ApiClient();
