/**
 * Authentication Error Handler
 * 
 * Centralized error handling for authentication operations.
 * Provides consistent error responses across all auth endpoints.
 */

import { NextResponse } from 'next/server';
import { 
  AuthError, 
  ValidationError, 
  RateLimitError, 
  NotFoundError,
  AppError
} from '@/lib/utils/error-handling';
import { ZodError } from 'zod';

/**
 * Handle authentication errors with consistent response format
 */
export function handleAuthError(error: unknown): NextResponse {
  console.error('Auth error:', error);
  
  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json({
      message: 'Validation failed',
      errors: error.flatten().fieldErrors,
      errorCode: 'VALIDATION_ERROR'
    }, { status: 400 });
  }
  
  // Custom auth errors
  if (error instanceof RateLimitError) {
    return NextResponse.json({
      message: error.message,
      errorCode: 'RATE_LIMITED'
    }, { status: 429 });
  }
  
  if (error instanceof ValidationError) {
    return NextResponse.json({
      message: error.message,
      errorCode: 'VALIDATION_ERROR'
    }, { status: 400 });
  }
  
  if (error instanceof NotFoundError) {
    return NextResponse.json({
      message: error.message,
      errorCode: 'NOT_FOUND'
    }, { status: 404 });
  }
  
  if (error instanceof AuthError) {
    return NextResponse.json({
      message: error.message,
      errorCode: error.code
    }, { status: error.statusCode || 401 });
  }
  
  if (error instanceof AppError) {
    return NextResponse.json({
      message: error.message,
      errorCode: error.code
    }, { status: error.statusCode || 500 });
  }
  
  // Default error
  return NextResponse.json({
    message: 'An unexpected error occurred',
    errorCode: 'INTERNAL_ERROR'
  }, { status: 500 });
}
