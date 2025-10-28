/**
 * Global Error Handler Middleware
 * 
 * Centralized error handling for all Express routes.
 * Provides consistent error responses and logging.
 */

import { Request, Response, NextFunction } from 'express';
import { ErrorBuilder } from '../utils/error.util';

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

  // Use ErrorBuilder to handle and format the error
  return ErrorBuilder.handleError(res, err);
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): Response {
  return ErrorBuilder.notFound(res, `Route ${req.method} ${req.url} not found`);
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
