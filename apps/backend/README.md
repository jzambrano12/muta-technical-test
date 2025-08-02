# Muta Backend - Secure Order Management API

A production-ready Node.js backend with TypeScript, implementing secure REST APIs and real-time WebSocket communication for order management.

## 🔐 Security Features

- **Authentication & Authorization**: WebSocket API key authentication
- **Input Validation**: Comprehensive Joi schemas for all inputs
- **Rate Limiting**: Express rate limiting with IP-based controls
- **Security Headers**: Helmet.js with CSP, HSTS, and security headers
- **CORS Protection**: Configurable CORS with origin validation
- **Error Handling**: Centralized error handling without information leakage
- **Logging**: Structured logging with sensitive data sanitization
- **WebSocket Security**: Connection authentication and message validation

## 🏗️ Architecture

Built following SOLID principles with clean architecture:

- **Repository Pattern**: Data access abstraction
- **Dependency Injection**: Loose coupling between components
- **Interface Segregation**: Focused, single-responsibility interfaces
- **Service Layer**: Business logic separation
- **Middleware Pipeline**: Security and validation layers

## 🚀 Quick Start

### Development

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Setup environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**:
   ```bash
   pnpm run dev
   ```

### Production Deployment

1. **Configure environment**:
   ```bash
   cp .env.example .env
   # Set production values in .env
   ```

2. **Deploy with Docker**:
   ```bash
   ./deploy.sh production
   ```

## 📡 API Endpoints

### REST API

- `GET /health` - System health check
- `GET /api` - API documentation
- `GET /api/orders` - List orders (with filters and pagination)
- `GET /api/orders/stats` - Order statistics
- `GET /api/orders/health` - Service health check
- `GET /api/orders/search` - Search orders
- `GET /api/orders/:id` - Get specific order
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order
- `POST /api/orders/bulk` - Create multiple orders
- `PUT /api/orders/bulk` - Update multiple orders
- `DELETE /api/orders/bulk` - Delete multiple orders

### WebSocket Events

- `order-created` - New order created
- `order-updated` - Order updated
- `order-deleted` - Order deleted
- `initial-orders` - Initial order list on connection

## 🛡️ Security Configuration

### Environment Variables

```bash
# Security
NODE_ENV=production
WS_API_KEY=your-secure-api-key-here
TRUST_PROXY=true
CORS_ORIGIN=https://your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json
```

### Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Sensitive endpoints**: 10 requests per 15 minutes per IP
- **WebSocket messages**: 30 messages per minute per connection

### Input Validation

All inputs are validated using Joi schemas:
- SQL injection prevention
- XSS protection
- Path traversal protection
- Input sanitization and length limits

## 🧪 Testing

### Run all tests:
```bash
pnpm run test
```

### Security tests:
```bash
pnpm run test -- --testPathPattern=security
```

### Service tests:
```bash
pnpm run test -- --testPathPattern=services
```

## 📊 Monitoring & Logging

### Health Checks

- `GET /health` - Basic system health
- `GET /api/orders/health` - Service-specific health with detailed metrics

### Logging

Structured JSON logging with:
- Request/response tracking
- Security event logging
- Error tracking with sanitization
- Performance metrics

### Metrics

Available through health endpoints:
- Total orders count
- Active WebSocket connections
- Service uptime
- Memory usage
- Error rates

## 🐳 Docker Deployment

### Production Dockerfile

Multi-stage build with security hardening:
- Non-root user execution
- Minimal attack surface
- Health checks
- Resource limits

### Docker Compose

Production-ready compose with:
- Security constraints
- Resource limits
- Nginx reverse proxy
- SSL termination
- Logging configuration

## 🔧 Configuration

### Development
```bash
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

### Production
```bash
NODE_ENV=production
PORT=8080
CORS_ORIGIN=https://your-domain.com
TRUST_PROXY=true
LOG_LEVEL=warn
WS_API_KEY=secure-production-key
```

## 📁 Project Structure

```
src/
├── config/           # Configuration and environment validation
├── interfaces/       # TypeScript interfaces and contracts
├── middleware/       # Security and validation middleware
├── repositories/     # Data access layer
├── routes/          # API route handlers
├── schemas/         # Validation schemas
├── services/        # Business logic layer
├── utils/           # Utilities and helpers
└── __tests__/       # Test suites
    └── security/    # Security-focused tests
```

## 🔐 Security Best Practices

### Implemented Security Measures

1. **Input Validation**: All inputs validated with Joi schemas
2. **Rate Limiting**: Multiple layers of rate limiting
3. **CORS Protection**: Strict origin validation
4. **Security Headers**: Comprehensive security headers
5. **Error Handling**: No information leakage in errors
6. **Logging**: Secure logging with data sanitization
7. **Authentication**: WebSocket API key authentication
8. **Docker Security**: Non-root execution, read-only filesystem

### Recommended Additional Measures

1. **SSL/TLS**: Use proper SSL certificates in production
2. **Firewall**: Configure firewall rules
3. **Monitoring**: Set up monitoring and alerting
4. **Backups**: Implement data backup strategy
5. **Updates**: Keep dependencies updated
6. **Penetration Testing**: Regular security assessments

## 🤝 Contributing

1. Follow TypeScript and ESLint configurations
2. Write tests for new features
3. Follow SOLID principles
4. Update documentation
5. Ensure security best practices

## 📄 License

This project is part of the Muta technical test and follows security-first development practices.