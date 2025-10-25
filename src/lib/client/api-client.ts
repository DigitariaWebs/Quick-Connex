/**
 * Base API Client
 * 
 * Reusable fetch wrapper with error handling, retry logic, and type safety.
 * Provides consistent API for all client-side service calls.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

export interface ApiClientOptions {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: Response,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private baseURL: string;
  private defaultTimeout: number;
  private defaultRetries: number;
  private defaultRetryDelay: number;
  private defaultHeaders: Record<string, string>;

  constructor(options: ApiClientOptions = {}) {
    this.baseURL = options.baseURL || '';
    this.defaultTimeout = options.timeout || 10000;
    this.defaultRetries = options.retries || 3;
    this.defaultRetryDelay = options.retryDelay || 1000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  }

  /**
   * Make a GET request
   */
  async get<T>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', url, undefined, options);
  }

  /**
   * Make a POST request
   */
  async post<T>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', url, data, options);
  }

  /**
   * Make a PUT request
   */
  async put<T>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PUT', url, data, options);
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PATCH', url, data, options);
  }

  /**
   * Core request method with retry logic and error handling
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
    const retryDelay = this.defaultRetryDelay;

    const requestOptions: RequestInit = {
      method,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    };

    // Add body for requests that support it
    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      if (data instanceof FormData) {
        requestOptions.body = data;
        // Remove Content-Type header for FormData (browser will set it with boundary)
        delete (requestOptions.headers as any)['Content-Type'];
      } else {
        requestOptions.body = JSON.stringify(data);
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(fullUrl, {
          ...requestOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle non-2xx responses
        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);
          throw new ApiError(
            errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            response,
            errorData
          );
        }

        // Parse successful response
        const result = await this.parseResponse<T>(response);
        return result;

      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (this.shouldNotRetry(error as Error)) {
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt === retries) {
          throw error;
        }

        // Wait before retrying
        await this.delay(retryDelay * Math.pow(2, attempt));
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Parse successful response
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      
      // Handle API response wrapper (only if success field exists)
      if (data && typeof data === 'object' && 'success' in data) {
        if (data.success) {
          return data.data || data;
        } else {
          throw new ApiError(
            data.message || 'API request failed',
            response.status,
            response,
            data
          );
        }
      }
      
      // For APIs that don't use the success wrapper (like auth endpoints),
      // return the data directly
      return data;
    }
    
    // Handle non-JSON responses
    const text = await response.text();
    return text as unknown as T;
  }

  /**
   * Parse error response
   */
  private async parseErrorResponse(response: Response): Promise<any> {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      }
      return { message: await response.text() };
    } catch {
      return { message: 'Unknown error' };
    }
  }

  /**
   * Check if error should not be retried
   */
  private shouldNotRetry(error: Error): boolean {
    // Don't retry on client errors (4xx) except 408, 429
    if (error instanceof ApiError) {
      const status = error.statusCode;
      if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
        return true;
      }
    }
    
    // Don't retry on network errors that are likely permanent
    if (error.name === 'AbortError') {
      return true;
    }
    
    return false;
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a new instance with different options
   */
  create(options: ApiClientOptions): ApiClient {
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

