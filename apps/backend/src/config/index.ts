import dotenv from 'dotenv';
import Joi from 'joi';

// Load environment variables
dotenv.config();

// Define the schema for environment variables
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  
  PORT: Joi.number()
    .port()
    .default(3001),
  
  CORS_ORIGIN: Joi.string()
    .uri()
    .default('http://localhost:3000'),
  
  // Rate limiting configuration
  RATE_LIMIT_WINDOW_MS: Joi.number()
    .positive()
    .default(15 * 60 * 1000), // 15 minutes
  
  RATE_LIMIT_MAX: Joi.number()
    .positive()
    .default(100), // limit each IP to 100 requests per windowMs
  
  // WebSocket configuration
  WS_PING_TIMEOUT: Joi.number()
    .positive()
    .default(60000), // 60 seconds
  
  WS_PING_INTERVAL: Joi.number()
    .positive()
    .default(25000), // 25 seconds
  
  // Simulation configuration
  SIMULATION_MIN_INTERVAL: Joi.number()
    .positive()
    .default(3000), // 3 seconds
  
  SIMULATION_MAX_INTERVAL: Joi.number()
    .positive()
    .default(10000), // 10 seconds
  
  // Security configuration
  TRUST_PROXY: Joi.boolean()
    .default(false),
  
  // Logging configuration
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  
  LOG_FORMAT: Joi.string()
    .valid('json', 'simple')
    .default('json'),
  
  // API Key for WebSocket authentication (optional for enhanced security)
  WS_API_KEY: Joi.string()
    .optional(),
    
}).unknown();

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Export the validated configuration
export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  corsOrigin: envVars.CORS_ORIGIN,
  
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    max: envVars.RATE_LIMIT_MAX,
  },
  
  websocket: {
    pingTimeout: envVars.WS_PING_TIMEOUT,
    pingInterval: envVars.WS_PING_INTERVAL,
    apiKey: envVars.WS_API_KEY,
  },
  
  simulation: {
    minInterval: envVars.SIMULATION_MIN_INTERVAL,
    maxInterval: envVars.SIMULATION_MAX_INTERVAL,
  },
  
  security: {
    trustProxy: envVars.TRUST_PROXY,
  },
  
  logging: {
    level: envVars.LOG_LEVEL,
    format: envVars.LOG_FORMAT,
  },
  
  // Derived configurations
  isDevelopment: envVars.NODE_ENV === 'development',
  isProduction: envVars.NODE_ENV === 'production',
  isTest: envVars.NODE_ENV === 'test',
} as const;

// Type for the configuration
export type Config = typeof config;