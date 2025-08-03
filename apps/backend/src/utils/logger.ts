import winston from 'winston';
import { config } from '../config';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(colors);

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Simple format for development
const simpleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.simple(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `[${timestamp}] ${level}: ${message} ${metaString}`;
  })
);

// Create transports
const transports: winston.transport[] = [];

// Console transport
if (config.isDevelopment || config.isTest) {
  transports.push(
    new winston.transports.Console({
      format: config.logging.format === 'json' ? logFormat : simpleFormat,
    })
  );
} else {
  // Production console transport (structured JSON only)
  transports.push(
    new winston.transports.Console({
      format: logFormat,
    })
  );
}

// File transports for production
if (config.isProduction) {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
}

// Create the logger
export const logger = winston.createLogger({
  level: config.logging.level,
  levels,
  format: logFormat,
  transports,
  // Prevent logging in test environment unless explicitly enabled
  silent: config.isTest && process.env.ENABLE_LOGGING !== 'true',
});

// Create specialized loggers for different components
export const createComponentLogger = (component: string) => {
  return {
    error: (message: string, meta?: object) => 
      logger.error(message, { component, ...meta }),
    
    warn: (message: string, meta?: object) => 
      logger.warn(message, { component, ...meta }),
    
    info: (message: string, meta?: object) => 
      logger.info(message, { component, ...meta }),
    
    debug: (message: string, meta?: object) => 
      logger.debug(message, { component, ...meta }),
  };
};

// Security-focused logger that sanitizes sensitive data
export const securityLogger = {
  logSecurityEvent: (event: string, details: object) => {
    const sanitizedDetails = sanitizeSensitiveData(details);
    logger.warn(`SECURITY: ${event}`, {
      component: 'security',
      event,
      ...sanitizedDetails,
    });
  },
  
  logFailedAuth: (reason: string, ip?: string) => {
    logger.warn('Authentication failed', {
      component: 'auth',
      reason,
      ip: ip ? maskIP(ip) : undefined,
    });
  },
  
  logSuspiciousActivity: (activity: string, details: object) => {
    logger.error(`SUSPICIOUS: ${activity}`, {
      component: 'security',
      activity,
      ...sanitizeSensitiveData(details),
    });
  },
};

// Utility function to sanitize sensitive data from logs
function sanitizeSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'authorization'];
  const sanitized = { ...data };

  for (const key in sanitized) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeSensitiveData(sanitized[key]);
    }
  }

  return sanitized;
}

// Utility function to mask IP addresses for privacy
function maskIP(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  // For IPv6 or other formats, just show first part
  return ip.split(':')[0] + ':xxxx';
}

// Export default logger for backward compatibility
export default logger;