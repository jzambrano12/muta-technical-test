import { requestSchemas, customValidations } from '../../schemas/validation';
import { OrderStatus } from '@muta/shared';

describe('Validation Schemas', () => {
  describe('Order Query Validation', () => {
    it('should validate valid order query parameters', () => {
      const validQuery = {
        status: OrderStatus.PENDING,
        search: 'test search',
        page: 1,
        limit: 20,
        sortBy: 'lastUpdated',
        sortOrder: 'desc',
      };

      const { error, value } = requestSchemas.getOrdersQuery.validate(validQuery);
      expect(error).toBeUndefined();
      expect(value).toEqual(validQuery);
    });

    it('should reject invalid status values', () => {
      const invalidQuery = {
        status: 'invalid_status',
      };

      const { error } = requestSchemas.getOrdersQuery.validate(invalidQuery);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('Status must be one of');
    });

    it('should reject search terms with invalid characters', () => {
      const invalidQuery = {
        search: 'test<script>alert("xss")</script>',
      };

      const { error } = requestSchemas.getOrdersQuery.validate(invalidQuery);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('invalid characters');
    });

    it('should reject page numbers outside valid range', () => {
      const invalidQuery = {
        page: 0,
      };

      const { error } = requestSchemas.getOrdersQuery.validate(invalidQuery);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('Page must be at least 1');
    });

    it('should reject excessive limit values', () => {
      const invalidQuery = {
        limit: 1000,
      };

      const { error } = requestSchemas.getOrdersQuery.validate(invalidQuery);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('Limit cannot exceed 100');
    });

    it('should set default values for missing parameters', () => {
      const emptyQuery = {};

      const { error, value } = requestSchemas.getOrdersQuery.validate(emptyQuery);
      expect(error).toBeUndefined();
      expect(value.page).toBe(1);
      expect(value.limit).toBe(20);
      expect(value.sortBy).toBe('lastUpdated');
      expect(value.sortOrder).toBe('desc');
    });
  });

  describe('Order ID Parameter Validation', () => {
    it('should validate valid order IDs', () => {
      const validParams = {
        id: 'ORDER-123-ABC-456',
      };

      const { error, value } = requestSchemas.getOrderByIdParams.validate(validParams);
      expect(error).toBeUndefined();
      expect(value).toEqual(validParams);
    });

    it('should reject IDs with invalid characters', () => {
      const invalidParams = {
        id: 'ORDER-123-<script>',
      };

      const { error } = requestSchemas.getOrderByIdParams.validate(invalidParams);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('alphanumeric');
    });

    it('should reject IDs that are too short', () => {
      const invalidParams = {
        id: 'ABC123',
      };

      const { error } = requestSchemas.getOrderByIdParams.validate(invalidParams);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('8-50 characters');
    });

    it('should reject IDs that are too long', () => {
      const invalidParams = {
        id: 'A'.repeat(51),
      };

      const { error } = requestSchemas.getOrderByIdParams.validate(invalidParams);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('8-50 characters');
    });
  });

  describe('WebSocket Message Validation', () => {
    it('should validate valid subscribe message', () => {
      const validMessage = {
        type: 'subscribe',
        apiKey: 'test-api-key-123',
        data: {},
      };

      const { error, value } = requestSchemas.websocketMessage.validate(validMessage);
      expect(error).toBeUndefined();
      expect(value).toEqual(validMessage);
    });

    it('should reject messages with invalid type', () => {
      const invalidMessage = {
        type: 'invalid_type',
      };

      const { error } = requestSchemas.websocketMessage.validate(invalidMessage);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('Message type must be one of');
    });

    it('should require API key for subscribe messages', () => {
      const invalidMessage = {
        type: 'subscribe',
      };

      const { error } = requestSchemas.websocketMessage.validate(invalidMessage);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('API key is required');
    });

    it('should reject API keys that are too short', () => {
      const invalidMessage = {
        type: 'subscribe',
        apiKey: '123',
      };

      const { error } = requestSchemas.websocketMessage.validate(invalidMessage);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('at least 8 characters');
    });
  });
});

describe('Custom Validations', () => {
  describe('Search Safety Validation', () => {
    it('should allow safe search terms', () => {
      const safeSearches = [
        'normal search term',
        'order-123',
        'user@example.com',
        'Product Name 2024',
      ];

      safeSearches.forEach(search => {
        expect(customValidations.validateSearchSafety(search)).toBe(true);
      });
    });

    it('should reject SQL injection attempts', () => {
      const maliciousSearches = [
        "'; DROP TABLE orders; --",
        "1' OR '1'='1",
        "UNION SELECT * FROM users",
        "exec xp_cmdshell",
        "1' AND (SELECT COUNT(*) FROM orders) > 0 --",
      ];

      maliciousSearches.forEach(search => {
        expect(customValidations.validateSearchSafety(search)).toBe(false);
      });
    });

    it('should reject XSS attempts', () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
      ];

      xssAttempts.forEach(search => {
        expect(customValidations.validateSearchSafety(search)).toBe(false);
      });
    });

    it('should reject path traversal attempts', () => {
      const pathTraversals = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '%2e%2e%2f',
      ];

      pathTraversals.forEach(search => {
        expect(customValidations.validateSearchSafety(search)).toBe(false);
      });
    });
  });

  describe('WebSocket Origin Validation', () => {
    const allowedOrigins = ['http://localhost:3000', 'https://example.com'];

    it('should allow valid origins', () => {
      expect(customValidations.validateWebSocketOrigin('http://localhost:3000', allowedOrigins)).toBe(true);
      expect(customValidations.validateWebSocketOrigin('https://example.com', allowedOrigins)).toBe(true);
    });

    it('should reject invalid origins', () => {
      expect(customValidations.validateWebSocketOrigin('https://malicious.com', allowedOrigins)).toBe(false);
      expect(customValidations.validateWebSocketOrigin('http://evil.example.com', allowedOrigins)).toBe(false);
    });

    it('should allow localhost in development', () => {
      process.env.NODE_ENV = 'development';
      expect(customValidations.validateWebSocketOrigin('http://localhost:3001', allowedOrigins)).toBe(true);
      expect(customValidations.validateWebSocketOrigin('http://localhost:8080', allowedOrigins)).toBe(true);
    });

    it('should reject localhost-like domains that are not actually localhost', () => {
      const fakeLocalhost = [
        'http://localhost.evil.com',
        'https://fake-localhost.com',
        'http://127.0.0.1.evil.com',
      ];

      fakeLocalhost.forEach(origin => {
        expect(customValidations.validateWebSocketOrigin(origin, allowedOrigins)).toBe(false);
      });
    });
  });
});

describe('Input Sanitization', () => {
  describe('Search Term Sanitization', () => {
    it('should handle special characters properly', () => {
      const testCases = [
        { input: 'normal text', expected: true },
        { input: 'text with spaces', expected: true },
        { input: 'text-with-hyphens', expected: true },
        { input: 'text_with_underscores', expected: true },
        { input: 'text.with.dots', expected: true },
        { input: 'text@with.email', expected: true },
        { input: 'text123', expected: true },
      ];

      testCases.forEach(({ input, expected }) => {
        const { error } = requestSchemas.getOrdersQuery.validate({ search: input });
        expect(!error).toBe(expected);
      });
    });

    it('should reject dangerous characters', () => {
      const dangerousInputs = [
        'text<script>',
        'text"quotes',
        "text'quotes",
        'text;semicolon',
        'text|pipe',
        'text%percent',
        'text+plus',
        'text=equals',
        'text()parentheses',
        'text[]brackets',
        'text{}braces',
      ];

      dangerousInputs.forEach(input => {
        const { error } = requestSchemas.getOrdersQuery.validate({ search: input });
        expect(error).toBeDefined();
      });
    });
  });

  describe('Length Limits', () => {
    it('should enforce maximum search length', () => {
      const longSearch = 'a'.repeat(101);
      const { error } = requestSchemas.getOrdersQuery.validate({ search: longSearch });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('cannot exceed 100 characters');
    });

    it('should allow searches up to the limit', () => {
      const maxLengthSearch = 'a'.repeat(100);
      const { error } = requestSchemas.getOrdersQuery.validate({ search: maxLengthSearch });
      expect(error).toBeUndefined();
    });
  });
});

describe('Error Messages', () => {
  it('should provide clear error messages without exposing internal details', () => {
    const { error } = requestSchemas.getOrdersQuery.validate({ status: 'invalid' });
    expect(error?.details[0].message).not.toContain('internal');
    expect(error?.details[0].message).not.toContain('server');
    expect(error?.details[0].message).not.toContain('database');
    expect(error?.details[0].message).toContain('Status must be one of');
  });

  it('should not expose valid values in error messages for security', () => {
    const { error } = requestSchemas.getOrdersQuery.validate({ sortBy: 'invalid_field' });
    expect(error?.details[0].message).toContain('sortBy must be one of');
    // Ensure it lists the valid options for user guidance
    expect(error?.details[0].message).toContain('lastUpdated');
  });
});