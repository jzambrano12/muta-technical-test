import Joi from 'joi';
import { OrderStatus } from '@muta/shared';

// Base schemas for common validations
export const baseSchemas = {
  // MongoDB ObjectId-like string validation
  id: Joi.string()
    .pattern(/^[a-zA-Z0-9\-_]{8,50}$/)
    .required()
    .messages({
      'string.pattern.base': 'ID must be alphanumeric with hyphens and underscores, 8-50 characters long',
      'any.required': 'ID is required',
    }),

  // Order status validation
  orderStatus: Joi.string()
    .valid(...Object.values(OrderStatus))
    .messages({
      'any.only': `Status must be one of: ${Object.values(OrderStatus).join(', ')}`,
    }),

  // Search string validation (prevent injection attacks)
  searchString: Joi.string()
    .max(100)
    .pattern(/^[a-zA-Z0-9\s\-_\.@]+$/)
    .messages({
      'string.max': 'Search term cannot exceed 100 characters',
      'string.pattern.base': 'Search term contains invalid characters',
    }),

  // Pagination parameters
  page: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1',
      'number.max': 'Page cannot exceed 1000',
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),

  // Sort parameters
  sortBy: Joi.string()
    .valid('id', 'status', 'collectorName', 'address', 'lastUpdated')
    .default('lastUpdated')
    .messages({
      'any.only': 'sortBy must be one of: id, status, collectorName, address, lastUpdated',
    }),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'sortOrder must be either "asc" or "desc"',
    }),
};

// Request validation schemas
export const requestSchemas = {
  // GET /api/orders query parameters
  getOrdersQuery: Joi.object({
    status: baseSchemas.orderStatus.optional(),
    search: baseSchemas.searchString.optional(),
    page: baseSchemas.page,
    limit: baseSchemas.limit,
    sortBy: baseSchemas.sortBy,
    sortOrder: baseSchemas.sortOrder,
  }).messages({
    'object.unknown': 'Unknown query parameter: {{#label}}',
  }),

  // GET /api/orders/:id parameters
  getOrderByIdParams: Joi.object({
    id: baseSchemas.id,
  }),

  // WebSocket message validation
  websocketMessage: Joi.object({
    type: Joi.string()
      .valid('subscribe', 'unsubscribe', 'ping')
      .required()
      .messages({
        'any.only': 'Message type must be one of: subscribe, unsubscribe, ping',
        'any.required': 'Message type is required',
      }),
    
    data: Joi.object().optional(),
    
    apiKey: Joi.string()
      .when(Joi.ref('/type'), {
        is: 'subscribe',
        then: Joi.string().required().min(8),
        otherwise: Joi.string().optional(),
      })
      .messages({
        'any.required': 'API key is required for subscription',
        'string.min': 'API key must be at least 8 characters long',
      }),
  }),

  // Order creation/update schema
  createOrder: Joi.object({
    address: Joi.string().required().min(5).max(200),
    status: baseSchemas.orderStatus.required(),
    collectorName: Joi.string().required().min(2).max(100),
  }),

  // Headers validation for sensitive endpoints
  authHeaders: Joi.object({
    'user-agent': Joi.string().max(500).required(),
    'accept': Joi.string().max(200).required(),
    'content-type': Joi.string().valid('application/json').when('method', {
      is: Joi.valid('POST', 'PUT', 'PATCH'),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }).unknown(true), // Allow other headers but validate critical ones
};

// Response validation schemas (for testing)
const orderSchema = Joi.object({
  id: Joi.string().required(),
  address: Joi.string().required(),
  status: baseSchemas.orderStatus.required(),
  collectorName: Joi.string().required(),
  lastUpdated: Joi.date().required(),
});

export const responseSchemas: any = {
  order: orderSchema,

  ordersList: Joi.object({
    orders: Joi.array().items(orderSchema).required(),
    pagination: Joi.object({
      page: Joi.number().integer().min(1).required(),
      limit: Joi.number().integer().min(1).required(),
      total: Joi.number().integer().min(0).required(),
      totalPages: Joi.number().integer().min(0).required(),
    }).required(),
  }),

  orderStats: Joi.object({
    [OrderStatus.PENDING]: Joi.number().integer().min(0).required(),
    [OrderStatus.EN_ROUTE]: Joi.number().integer().min(0).required(),
    [OrderStatus.IN_PROCESS]: Joi.number().integer().min(0).required(),
    [OrderStatus.COMPLETED]: Joi.number().integer().min(0).required(),
    [OrderStatus.CANCELLED]: Joi.number().integer().min(0).required(),
  }),

  error: Joi.object({
    error: Joi.string().required(),
    message: Joi.string().required(),
    statusCode: Joi.number().integer().min(400).max(599).required(),
    timestamp: Joi.date().required(),
  }),

  healthCheck: Joi.object({
    status: Joi.string().valid('ok').required(),
    timestamp: Joi.date().required(),
  }),
};

// Custom validation functions
export const customValidations = {
  // Validate that search doesn't contain SQL injection patterns
  validateSearchSafety: (search: string): boolean => {
    const dangerousPatterns = [
      // SQL injection patterns
      /('|\\')|(;|\\;)|(\|)|(\*)|(\%)|(\+)|(\=)|(\<)|(\>)|(\^)|(\$)|(\[)|(\])|(\{)|(\})|(\()|(\))/i,
      /((\s*(union|select|insert|update|delete|drop|create|alter|exec|execute)\s+))/i,
      /((\s*(or|and)\s+\w+\s*=\s*\w+))/i,
      // Path traversal patterns
      /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/i,
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(search));
  },

  // Validate that the request doesn't exceed rate limits
  validateRequestFrequency: (req: any): boolean => {
    // This would integrate with your rate limiting solution
    // For now, return true (actual rate limiting is handled by middleware)
    return true;
  },

  // Validate WebSocket origin
  validateWebSocketOrigin: (origin: string, allowedOrigins: string[]): boolean => {
    return allowedOrigins.includes(origin) || 
           (origin.startsWith('http://localhost:') && process.env.NODE_ENV === 'development');
  },
};

// Validation middleware factory
export const createValidationMiddleware = (schema: Joi.Schema, property: 'body' | 'query' | 'params' | 'headers' = 'body') => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req[property], { 
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');
      
      return res.status(400).json({
        error: 'Validation Error',
        message: errorMessage,
        statusCode: 400,
        timestamp: new Date(),
      });
    }

    // Replace the original data with validated and sanitized data
    req[property] = value;
    next();
  };
};