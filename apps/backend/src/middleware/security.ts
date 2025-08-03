import { Request, Response, NextFunction, RequestHandler } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cors from 'cors';
import { config } from '../config';
import { createComponentLogger, securityLogger } from '../utils/logger';
import { AppError, RateLimitError, ForbiddenError } from './errorHandler';

const logger = createComponentLogger('security');

// Enhanced CORS configuration
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    const allowedOrigins = config.corsOrigin.split(',').map((o: string) => o.trim());
    
    // In development, allow localhost with any port
    if (config.isDevelopment && origin.includes('localhost')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    securityLogger.logSecurityEvent('CORS_VIOLATION', { origin });
    callback(new ForbiddenError('CORS policy violation'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  maxAge: 86400, // 24 hours
});

// Security headers with helmet
export const helmetMiddleware = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // X-Frame-Options
  frameguard: { action: 'deny' },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // Referrer Policy
  referrerPolicy: { policy: 'same-origin' },
  
  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: false,
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
});

// Rate limiting configuration
export const rateLimitMiddleware = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later',
    statusCode: 429,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  // Custom key generator for better tracking
  keyGenerator: (req: Request): string => {
    return req.ip || 'unknown';
  },
  
  // Custom handler for rate limit exceeded
  handler: (req: Request, res: Response, next: NextFunction) => {
    securityLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
    });
    
    const error = new RateLimitError('Rate limit exceeded');
    next(error);
  },
  
  // Skip certain requests (health checks, etc.)
  skip: (req: Request): boolean => {
    return req.url === '/health' || req.url === '/metrics';
  },
});

// Stricter rate limiting for sensitive endpoints
export const strictRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests to sensitive endpoint, please try again later',
    statusCode: 429,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  handler: (req: Request, res: Response, next: NextFunction) => {
    securityLogger.logSecurityEvent('STRICT_RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
    });
    
    const error = new RateLimitError('Strict rate limit exceeded');
    next(error);
  },
});

// Compression middleware with security considerations
export const compressionMiddleware: RequestHandler = compression({
  // Only compress responses that are larger than 1kb
  threshold: 1024,
  
  // Don't compress responses that are already compressed
  filter: (req: Request, res: Response): boolean => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Don't compress if response is already compressed
    if (res.get('Content-Encoding')) {
      return false;
    }
    
    return compression.filter(req, res);
  },
  
  // Compression level (1-9, where 9 is best compression but slowest)
  level: 6,
  
  // Memory level (1-9, where 9 uses most memory but is fastest)
  memLevel: 8,
});

// Request logging middleware
export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Generate request ID for tracking
  (req as Request & { id?: string }).id = Math.random().toString(36).substring(2, 15);
  
  // Log request details
  logger.info('Incoming request', {
    requestId: (req as Request & { id?: string }).id,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    contentLength: req.get('Content-Length') || '0',
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: unknown, encoding?: BufferEncoding): Response {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      requestId: (req as Request & { id?: string }).id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length') || '0',
    });
    
    return originalEnd.call(res, chunk as string | Buffer, encoding || 'utf8');
  } as typeof res.end;
  
  next();
};

// IP whitelist middleware (for admin endpoints)
export const ipWhitelistMiddleware = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip;
    
    if (!allowedIPs.includes(clientIP || '')) {
      securityLogger.logSecurityEvent('IP_WHITELIST_VIOLATION', {
        ip: clientIP,
        url: req.url,
        userAgent: req.get('User-Agent'),
      });
      
      const error = new ForbiddenError('IP address not whitelisted');
      return next(error);
    }
    
    next();
  };
};

// Security headers middleware for API responses
export const apiSecurityHeadersMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Set additional security headers for API responses
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  
  next();
};

// Body size limit middleware
export const bodySizeLimitMiddleware = (limit: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0', 10);
    const limitBytes = parseLimit(limit);
    
    if (contentLength > limitBytes) {
      securityLogger.logSecurityEvent('BODY_SIZE_EXCEEDED', {
        ip: req.ip,
        contentLength,
        limit: limitBytes,
        url: req.url,
      });
      
      const error = new AppError('Request body too large', 413);
      return next(error);
    }
    
    next();
  };
};

// Utility function to parse size limits
function parseLimit(limit: string): number {
  const units: { [key: string]: number } = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024,
  };
  
  const match = limit.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * (units[unit] || 1));
}

// Trust proxy middleware
export const trustProxyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Set trust proxy based on configuration
  if (config.security.trustProxy) {
    req.app.set('trust proxy', true);
  }
  
  next();
};