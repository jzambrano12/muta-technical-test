import request from 'supertest';
import express from 'express';
import { 
  corsMiddleware, 
  apiSecurityHeadersMiddleware 
} from '../../middleware/security';
import { errorHandler, ValidationError } from '../../middleware/errorHandler';

// Mock configuration
jest.mock('../../config', () => ({
  config: {
    corsOrigin: 'http://localhost:3000',
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100,
    },
    isDevelopment: true,
    isProduction: false,
    isTest: true,
    logging: {
      level: 'info',
      format: 'json',
    },
  },
}));

describe('Security Middleware', () => {
  let app: express.Application;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
  });

  describe('CORS Middleware', () => {
    beforeEach(async () => {
      app.use(corsMiddleware);
      app.get('/test', (req, res) => res.json({ message: 'success' }));
      app.use(errorHandler);
    });

    it('should allow requests from allowed origins', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should allow requests with no origin (like mobile apps)', async () => {
      await request(app)
        .get('/test')
        .expect(200);
    });

    it('should allow localhost in development', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3001')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3001');
    });

    it('should reject requests from disallowed origins', async () => {
      // Temporarily set production mode
      jest.doMock('../../config', () => ({
        config: {
          corsOrigin: 'https://allowed.com',
          isDevelopment: false,
          isProduction: true,
        },
      }));

      await request(app)
        .get('/test')
        .set('Origin', 'https://malicious.com')
        .expect(403);
    });

    it('should include proper CORS headers', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Rate Limiting Middleware', () => {
    beforeEach(async () => {
      // Create a more permissive rate limiter for testing
      const testRateLimit = (await import('express-rate-limit')).default({
        windowMs: 1000, // 1 second
        max: 3, // 3 requests per second
        message: {
          error: 'Too Many Requests',
          message: 'Too many requests from this IP, please try again later',
          statusCode: 429,
        },
        standardHeaders: true,
        legacyHeaders: false,
      });

      app.use(testRateLimit);
      app.get('/test', (req, res) => res.json({ message: 'success' }));
      app.use(errorHandler);
    });

    it('should allow requests within rate limit', async () => {
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
    });

    it('should block requests exceeding rate limit', async () => {
      // Make 3 requests to reach the limit
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      // 4th request should be rate limited
      const response = await request(app).get('/test').expect(429);
      expect(response.body.error).toBe('Too Many Requests');
    });

    it('should include rate limit headers', async () => {
      const response = await request(app).get('/test').expect(200);
      
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });

    it('should reset rate limit after window expires', async () => {
      // Fill up the rate limit
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(429);

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be able to make requests again
      await request(app).get('/test').expect(200);
    }, 10000);
  });

  describe('API Security Headers Middleware', () => {
    beforeEach(async () => {
      app.use(apiSecurityHeadersMiddleware);
      app.get('/api/test', (req, res) => res.json({ message: 'success' }));
    });

    it('should add security headers to API responses', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    });
  });

  describe('Input Validation Security', () => {
    beforeEach(async () => {
      const { createValidationMiddleware, requestSchemas } = await import('../../schemas/validation');
      
      app.get('/validate-query', 
        createValidationMiddleware(requestSchemas.getOrdersQuery, 'query'),
        (req, res) => res.json({ query: req.query })
      );
      
      app.post('/validate-body',
        createValidationMiddleware(requestSchemas.websocketMessage, 'body'),
        (req, res) => res.json({ body: req.body })
      );
      
      app.use(errorHandler);
    });

    it('should reject malicious query parameters', async () => {
      const maliciousQueries = [
        { search: '<script>alert("xss")</script>' },
        { search: "'; DROP TABLE orders; --" },
        { search: '../../../etc/passwd' },
        { sortBy: 'password; DROP TABLE users; --' },
      ];

      for (const query of maliciousQueries) {
        await request(app)
          .get('/validate-query')
          .query(query)
          .expect(400);
      }
    });

    it('should reject requests with invalid content types', async () => {
      await request(app)
        .post('/validate-body')
        .send('plain text body')
        .expect(400);
    });

    it('should sanitize and validate input data', async () => {
      const response = await request(app)
        .get('/validate-query')
        .query({ 
          page: '1', 
          limit: '20',
          search: 'safe search term',
          sortBy: 'lastUpdated',
          sortOrder: 'desc'
        })
        .expect(200);

      expect(response.body.query.page).toBe(1);
      expect(response.body.query.limit).toBe(20);
      expect(response.body.query.search).toBe('safe search term');
    });

    it('should apply default values for missing parameters', async () => {
      const response = await request(app)
        .get('/validate-query')
        .expect(200);

      expect(response.body.query.page).toBe(1);
      expect(response.body.query.limit).toBe(20);
      expect(response.body.query.sortBy).toBe('lastUpdated');
      expect(response.body.query.sortOrder).toBe('desc');
    });
  });

  describe('Error Handling Security', () => {
    beforeEach(async () => {
      app.get('/error', (req, res, next) => {
        const error = new Error('Sensitive internal error with database details');
        (error as Error & { stack?: string }).stack = 'Error: Sensitive internal error\n    at /home/user/sensitive/path/file.js:123:45';
        next(error);
      });

      app.get('/validation-error', (req, res, next) => {
        next(new ValidationError('Invalid input provided'));
      });

      app.use(errorHandler);
    });

    it('should not expose sensitive error details in production', async () => {
      // Temporarily modify config for this test
      const configModule = await import('../../config');
      const originalIsProduction = configModule.config.isProduction;
      const originalIsDevelopment = configModule.config.isDevelopment;
      
      configModule.config.isProduction = true;
      configModule.config.isDevelopment = false;
      
      try {
        const response = await request(app)
          .get('/error')
          .expect(500);

        expect(response.body.message).toBe('An unexpected error occurred');
        expect(response.body.stack).toBeUndefined();
        expect(response.body.message).not.toContain('database');
        expect(response.body.message).not.toContain('sensitive');
      } finally {
        // Restore original config
        configModule.config.isProduction = originalIsProduction;
        configModule.config.isDevelopment = originalIsDevelopment;
      }
    });

    it('should provide detailed errors in development', async () => {
      jest.doMock('../../config', () => ({
        config: {
          isProduction: false,
          isDevelopment: true,
        },
      }));

      const response = await request(app)
        .get('/error')
        .expect(500);

      // In development, we get more details but still sanitized
      expect(response.body.error).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle validation errors appropriately', async () => {
      const response = await request(app)
        .get('/validation-error')
        .expect(400);

      expect(response.body.error).toBe('ValidationError');
      expect(response.body.message).toBe('Invalid input provided');
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('Content Security', () => {
    beforeEach(async () => {
      app.use(express.json({ limit: '1mb' }));
      app.post('/upload', (req, res) => res.json({ received: true }));
      app.use(errorHandler);
    });

    it('should reject oversized payloads', async () => {
      const largePayload = {
        data: 'x'.repeat(2 * 1024 * 1024), // 2MB payload
      };

      await request(app)
        .post('/upload')
        .send(largePayload)
        .expect(413);
    });

    it('should accept normal-sized payloads', async () => {
      const normalPayload = {
        data: 'normal data',
      };

      await request(app)
        .post('/upload')
        .send(normalPayload)
        .expect(200);
    });
  });
});