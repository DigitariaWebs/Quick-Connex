/**
 * Response Builder Utility
 * 
 * Standardized response formatters for all API endpoints.
 * Provides consistent response structure and automatic status code handling.
 */

// Note: Express types would be imported here in a real Express app
// For now, we'll define the Response interface locally
interface Response {
  status(code: number): Response;
  json(data: any): Response;
  send(data?: any): Response;
}
import { ApiResponse, PaginatedResponse, PaginationInfo, ResponseMeta, HTTP_STATUS } from '../types/api.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Response Builder - Standardized response formatters
 */
export class ResponseBuilder {
  /**
   * Success response
   */
  static success<T>(
    res: Response,
    data: T,
    meta?: Partial<ResponseMeta>,
    statusCode: number = HTTP_STATUS.OK
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      timestamp: new Date().toISOString(),
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: uuidv4(),
        ...meta,
      },
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationInfo,
    meta?: Partial<ResponseMeta>
  ): Response {
    const response: PaginatedResponse<T> = {
      success: true,
      timestamp: new Date().toISOString(),
      data,
      pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: uuidv4(),
        ...meta,
      },
    };
    return res.status(HTTP_STATUS.OK).json(response);
  }

  /**
   * Created response (201)
   */
  static created<T>(res: Response, data: T, meta?: Partial<ResponseMeta>): Response {
    return this.success(res, data, meta, HTTP_STATUS.CREATED);
  }

  /**
   * No content response (204)
   */
  static noContent(res: Response): Response {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  /**
   * Helper to build pagination info
   */
  static buildPagination(page: number, limit: number, total: number): PaginationInfo {
    const totalPages = Math.ceil(total / limit);
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Create response with custom metadata
   */
  static withMeta<T>(
    res: Response,
    data: T,
    meta: Record<string, any>,
    statusCode: number = HTTP_STATUS.OK
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      timestamp: new Date().toISOString(),
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: uuidv4(),
        ...meta,
      },
    };
    return res.status(statusCode).json(response);
  }
}