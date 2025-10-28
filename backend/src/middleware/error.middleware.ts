/**
 * Global Error Handler Middleware
 * 
 * Centralized error handling for all Express routes.
 * Provides consistent error responses and logging.
 */

import { Request, Response, NextFunction } from 'express';
import { ResponseBuilder } from '../utils/response.util';

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  // Log error details
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    timestamp: new Date().toISOString(),
  });

  // Handle different error types with ResponseBuilder
  if (err.name === 'ValidationError') {
    return ResponseBuilder.validationError(res, err.message, err.details || []);
  }
  
  if (err.name === 'UnauthorizedError') {
    return ResponseBuilder.unauthorized(res, err.message);
  }
  
  if (err.name === 'ForbiddenError') {
    return ResponseBuilder.forbidden(res, err.message);
  }
  
  if (err.name === 'NotFoundError') {
    return ResponseBuilder.notFound(res, err.message);
  }
  
  if (err.name === 'ConflictError') {
    return ResponseBuilder.conflict(res, err.message, err.details);
  }
  
  // Default to server error for unexpected errors
  return ResponseBuilder.serverError(res, 'An unexpected error occurred');
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): Response {
  return ResponseBuilder.notFound(res, `Route ${req.method} ${req.url} not found`);
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to the error handler
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${(res as any).statusCode || 200} - ${duration}ms`);
  });
  
  next();
}
