import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { createComponentLogger } from './utils/logger';

// Import middleware
import {
  corsMiddleware,
  helmetMiddleware,
  rateLimitMiddleware,
  compressionMiddleware,
  requestLoggerMiddleware,
  apiSecurityHeadersMiddleware,
  trustProxyMiddleware,
} from './middleware/security';

import {
  errorHandler,
  notFoundHandler,
  handleUncaughtException,
  handleUnhandledRejection,
  timeoutHandler,
} from './middleware/errorHandler';

import {
  connectionAuthMiddleware,
  messageAuthMiddleware,
  connectionMonitor,
  setupHeartbeat,
  AuthenticatedSocket,
} from './middleware/websocketAuth';

// Import services and dependencies
import { InMemoryOrderRepository } from './repositories/InMemoryOrderRepository';
import { SocketIONotificationService } from './services/NotificationService';
import { OrderService } from './services/OrderService';

// Import routes
import ordersRouter from './routes/orders';

const appLogger = createComponentLogger('app');

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Trust proxy if configured
app.use(trustProxyMiddleware);

// Security middleware
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(compressionMiddleware);
app.use(rateLimitMiddleware);
app.use(requestLoggerMiddleware);
app.use(timeoutHandler());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API security headers
app.use('/api', apiSecurityHeadersMiddleware);

// Initialize Socket.IO with security configurations
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: config.websocket.pingTimeout,
  pingInterval: config.websocket.pingInterval,
  transports: ['websocket', 'polling'],
  allowEIO3: false, // Security: disable Engine.IO v3 compatibility
});

// Setup global error handlers
handleUncaughtException();
handleUnhandledRejection();

// Initialize services with dependency injection
const orderRepository = new InMemoryOrderRepository();
const notificationService = new SocketIONotificationService(io);
const orderService = new OrderService(orderRepository, notificationService);

// Make services available to routes
app.locals.orderService = orderService;
app.locals.notificationService = notificationService;

// Setup WebSocket authentication and handling
io.use(connectionAuthMiddleware);

io.on('connection', (socket) => {
  const authSocket = socket as AuthenticatedSocket;

  appLogger.info('WebSocket client connected', {
    socketId: socket.id,
    ip: authSocket.clientInfo?.ip,
    origin: authSocket.clientInfo?.origin,
  });

  // Add to connection monitor
  connectionMonitor.addConnection(authSocket);

  // Setup heartbeat
  setupHeartbeat(authSocket);

  // Setup message authentication middleware
  const messageAuth = messageAuthMiddleware(authSocket);

  // Send initial data to authenticated clients
  if (authSocket.isAuthenticated) {
    orderService
      .getAllOrders({ page: 1, limit: 50 })
      .then((result) => {
        socket.emit('initial-orders', result.data);
      })
      .catch((error) => {
        appLogger.error('Failed to send initial orders', { socketId: socket.id, error });
      });
  }

  // Handle client messages
  socket.on('message', (data, callback) => {
    if (!messageAuth('message', data, callback)) return;

    // Handle different message types
    switch (data.type) {
      case 'subscribe':
        if (authSocket.isAuthenticated) {
          socket.join('orders');
          appLogger.debug('Client subscribed to orders', { socketId: socket.id });
          if (callback) callback({ success: true });
        } else {
          if (callback) callback({ error: 'Authentication required' });
        }
        break;

      case 'unsubscribe':
        socket.leave('orders');
        appLogger.debug('Client unsubscribed from orders', { socketId: socket.id });
        if (callback) callback({ success: true });
        break;

      case 'ping':
        if (callback) callback({ type: 'pong', timestamp: new Date() });
        break;

      default:
        appLogger.warn('Unknown message type', { socketId: socket.id, type: data.type });
        if (callback) callback({ error: 'Unknown message type' });
    }
  });

  socket.on('disconnect', (reason) => {
    appLogger.info('WebSocket client disconnected', {
      socketId: socket.id,
      reason,
      ip: authSocket.clientInfo?.ip,
    });

    connectionMonitor.removeConnection(socket.id);
  });

  socket.on('error', (error) => {
    appLogger.error('WebSocket error', {
      socketId: socket.id,
      error: error.message,
      ip: authSocket.clientInfo?.ip,
    });
  });
});

// Health check endpoint (before routes to avoid rate limiting)
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: connectionMonitor.getConnectionStats(),
  };

  res.json(health);
});

// API routes
app.use('/api/orders', ordersRouter);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Muta Orders API',
    version: '1.0.0',
    description: 'Secure REST API for order management with real-time WebSocket updates',
    endpoints: {
      'GET /health': 'System health check',
      'GET /api/orders': 'List orders with filters and pagination',
      'GET /api/orders/stats': 'Order statistics',
      'GET /api/orders/health': 'Service health check',
      'GET /api/orders/search': 'Search orders',
      'GET /api/orders/:id': 'Get specific order',
      'POST /api/orders': 'Create new order',
      'PUT /api/orders/:id': 'Update order',
      'DELETE /api/orders/:id': 'Delete order',
      'POST /api/orders/bulk': 'Create multiple orders',
      'PUT /api/orders/bulk': 'Update multiple orders',
      'DELETE /api/orders/bulk': 'Delete multiple orders',
    },
    websocket: {
      url: '/socket.io',
      events: {
        'order-created': 'New order created',
        'order-updated': 'Order updated',
        'order-deleted': 'Order deleted',
        'initial-orders': 'Initial order list on connection',
      },
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Initialize application
async function initializeApp(): Promise<void> {
  try {
    appLogger.info('Initializing application...');

    // Initialize sample data
    await orderService.initializeWithSampleData();
    appLogger.info('Sample data initialized');


    appLogger.info('Application initialized successfully');
  } catch (error) {
    appLogger.error('Failed to initialize application', { error });
    throw error;
  }
}

// Start server
const startServer = async (): Promise<void> => {
  try {
    await initializeApp();

    httpServer.listen(config.port, () => {
      appLogger.info(`Server started successfully`, {
        port: config.port,
        environment: config.env,
        cors: config.corsOrigin,
        websocket: true,
      });

      appLogger.info(`API Documentation available at: http://localhost:${config.port}/api`);
      appLogger.info(`Health Check available at: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    appLogger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Graceful shutdown handler
const gracefulShutdown = async (signal: string): Promise<void> => {
  appLogger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Stop accepting new connections
    httpServer.close(() => {
      appLogger.info('HTTP server closed');
    });


    // Close WebSocket connections
    io.close(() => {
      appLogger.info('WebSocket server closed');
    });

    // Give ongoing requests time to complete
    setTimeout(() => {
      appLogger.info('Graceful shutdown completed');
      process.exit(0);
    }, 5000);
  } catch (error) {
    appLogger.error('Error during graceful shutdown', { error });
    process.exit(1);
  }
};

// Setup signal handlers for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  appLogger.error('Unhandled Promise Rejection', { reason, promise: promise.toString() });
  if (config.isProduction) {
    gracefulShutdown('unhandledRejection');
  }
});

process.on('uncaughtException', (error) => {
  appLogger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

// Start the application
startServer();
