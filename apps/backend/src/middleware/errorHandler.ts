import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { createComponentLogger, securityLogger } from '../utils/logger';

const logger = createComponentLogger('errorHandler');

// Custom error classes
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, _details?: Record<string, unknown>) {
    super(message, 400, true, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, true, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 403, true, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, true, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

// Error response interface
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  code?: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

// Sanitize error details for production
const sanitizeErrorForProduction = (error: Error & { statusCode?: number; isOperational?: boolean; code?: string }): Partial<ErrorResponse> => {
  const sanitized: Partial<ErrorResponse> = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    statusCode: 500,
    timestamp: new Date().toISOString(),
  };

  // Only include specific safe errors in production
  if (error instanceof AppError && error.isOperational) {
    sanitized.error = error.name;
    sanitized.message = error.message;
    sanitized.statusCode = error.statusCode;
    sanitized.code = error.code;
  }

  return sanitized;
};

// Create detailed error response for development
const createDetailedError = (error: Error & { statusCode?: number; code?: string; stack?: string }, req: Request): ErrorResponse => {
  const response: ErrorResponse = {
    error: error.name || 'Error',
    message: error.message || 'An unexpected error occurred',
    statusCode: error.statusCode || 500,
    timestamp: new Date().toISOString(),
    requestId: (req as Request & { id?: string }).id,
  };

  if (error.code) {
    response.code = error.code;
  }

  // Add stack trace in development
  if (config.isDevelopment && error.stack) {
    (response as ErrorResponse & { stack?: string }).stack = error.stack;
  }

  return response;
};

// Log error with appropriate level and context
const logError = (error: Error & { statusCode?: number; isOperational?: boolean; code?: string }, req: Request) => {
  const context = {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    requestId: (req as Request & { id?: string }).id,
    statusCode: error.statusCode || 500,
  };

  if (error instanceof AppError && error.isOperational) {
    // Operational errors (expected) - log as warnings
    if (error.statusCode >= 400 && error.statusCode < 500) {
      logger.warn(`Operational error: ${error.message}`, context);
    } else {
      logger.error(`Operational error: ${error.message}`, { ...context, stack: error.stack });
    }
  } else {
    // Programming errors (unexpected) - log as errors
    logger.error(`Unexpected error: ${error.message}`, { 
      ...context, 
      stack: error.stack,
      errorName: error.name,
    });
  }

  // Log security-related errors
  if (error.statusCode === 401 || error.statusCode === 403) {
    securityLogger.logFailedAuth(error.message, req.ip);
  }

  // Log potential attacks
  if (error.statusCode === 400 && error.message.includes('validation')) {
    securityLogger.logSuspiciousActivity('Validation error', {
      url: req.url,
      body: req.body,
      query: req.query,
      ip: req.ip,
    });
  }
};

// Main error handling middleware
export const errorHandler = (error: Error & { statusCode?: number }, req: Request, res: Response, _next: NextFunction): void => {
  // Ensure we have a status code
  error.statusCode = error.statusCode || 500;

  // Log the error
  logError(error, req);

  // Create appropriate response based on environment
  let errorResponse: Partial<ErrorResponse>;

  if (config.isProduction) {
    errorResponse = sanitizeErrorForProduction(error);
  } else {
    errorResponse = createDetailedError(error, req);
  }

  // Send response
  res.status(error.statusCode).json(errorResponse);
};

// 404 handler middleware
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Async error wrapper
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Unhandled promise rejection handler
export const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason: Error | unknown, promise) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: promise.toString(),
    });

    // In production, you might want to gracefully shutdown
    if (config.isProduction) {
      process.exit(1);
    }
  });
};

// Uncaught exception handler
export const handleUncaughtException = () => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack,
    });

    // Exit the process as the application is in an unknown state
    process.exit(1);
  });
};

// Request timeout middleware
export const timeoutHandler = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const error = new ServiceUnavailableError('Request timeout');
        next(error);
      }
    }, timeoutMs);

    // Clear timeout when response is finished
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
};