import { Router, Request, Response } from 'express';
import { OrderService } from '../services/OrderService';
import { requestSchemas, createValidationMiddleware } from '../schemas/validation';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { strictRateLimitMiddleware } from '../middleware/security';
import { createComponentLogger } from '../utils/logger';
import { OrderStatus, Order } from '@muta/shared';

const router: Router = Router();
const logger = createComponentLogger('ordersRouter');

// Apply strict rate limiting to all order endpoints
router.use(strictRateLimitMiddleware);

// Middleware to get OrderService instance
const getOrderService = (req: Request): OrderService => {
  const orderService = req.app.locals.orderService;
  if (!orderService) {
    throw new Error('OrderService not available');
  }
  return orderService;
};

// GET /api/orders - Get all orders with optional filters and pagination
router.get('/', 
  createValidationMiddleware(requestSchemas.getOrdersQuery, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const orderService = getOrderService(req);
    const { status, search, page, limit, sortBy, sortOrder } = req.query as {
      status?: string;
      search?: string;
      page?: string;
      limit?: string;
      sortBy?: string;
      sortOrder?: string;
    };
    
    logger.info('Orders list requested', {
      filters: { status, search },
      pagination: { page, limit, sortBy, sortOrder },
      requestId: (req as Request & { id?: string }).id,
    });
    
    const filters = { 
      status: status && Object.values(OrderStatus).includes(status as OrderStatus) ? status as OrderStatus : undefined, 
      search 
    };
    const pagination = { 
      page: page ? parseInt(page, 10) : 1, 
      limit: limit ? parseInt(limit, 10) : 20, 
      sortBy: sortBy && ['id', 'address', 'status', 'collectorName', 'lastUpdated'].includes(sortBy) ? sortBy as keyof Order : undefined, 
      sortOrder: sortOrder as 'asc' | 'desc' | undefined
    };
    
    const result = await orderService.getFilteredOrders(filters, pagination);
    
    // Add pagination headers
    res.set({
      'X-Total-Count': result.pagination.total.toString(),
      'X-Page': result.pagination.page.toString(),
      'X-Total-Pages': result.pagination.totalPages.toString(),
    });
    
    logger.debug('Orders list response', {
      count: result.data.length,
      total: result.pagination.total,
      requestId: (req as Request & { id?: string }).id,
    });
    
    res.json(result);
  })
);

// GET /api/orders/stats - Get order statistics
router.get('/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const orderService = getOrderService(req);
    
    logger.info('Order statistics requested', {
      requestId: (req as Request & { id?: string }).id,
    });
    
    const stats = await orderService.getOrderStats();
    
    logger.debug('Order statistics response', {
      stats,
      requestId: (req as Request & { id?: string }).id,
    });
    
    res.json(stats);
  })
);

// GET /api/orders/health - Get service health
router.get('/health',
  asyncHandler(async (req: Request, res: Response) => {
    const orderService = getOrderService(req);
    
    logger.info('Service health requested', {
      requestId: (req as Request & { id?: string }).id,
    });
    
    const health = await orderService.getServiceHealth();
    
    // Set appropriate status code based on health
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(health);
  })
);

// GET /api/orders/search - Search orders
router.get('/search',
  createValidationMiddleware(requestSchemas.getOrdersQuery, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const orderService = getOrderService(req);
    const { search, page, limit, sortBy, sortOrder } = req.query as {
      search?: string;
      page?: string;
      limit?: string;
      sortBy?: string;
      sortOrder?: string;
    };
    
    if (!search) {
      throw new ValidationError('Search term is required');
    }
    
    logger.info('Order search requested', {
      searchTerm: search,
      pagination: { page, limit, sortBy, sortOrder },
      requestId: (req as Request & { id?: string }).id,
    });
    
    const pagination = { 
      page: page ? parseInt(page, 10) : 1, 
      limit: limit ? parseInt(limit, 10) : 20, 
      sortBy: sortBy && ['id', 'address', 'status', 'collectorName', 'lastUpdated'].includes(sortBy) ? sortBy as keyof Order : undefined, 
      sortOrder: sortOrder as 'asc' | 'desc' | undefined
    };
    const result = await orderService.searchOrders(search, pagination);
    
    // Add pagination headers
    res.set({
      'X-Total-Count': result.pagination.total.toString(),
      'X-Page': result.pagination.page.toString(),
      'X-Total-Pages': result.pagination.totalPages.toString(),
    });
    
    logger.debug('Order search response', {
      searchTerm: search,
      count: result.data.length,
      total: result.pagination.total,
      requestId: (req as Request & { id?: string }).id,
    });
    
    res.json(result);
  })
);

// GET /api/orders/:id - Get specific order by ID
router.get('/:id',
  createValidationMiddleware(requestSchemas.getOrderByIdParams, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const orderService = getOrderService(req);
    const { id } = req.params;
    
    logger.info('Single order requested', {
      orderId: id,
      requestId: (req as Request & { id?: string }).id,
    });
    
    const order = await orderService.getOrderById(id);
    
    if (!order) {
      logger.warn('Order not found', {
        orderId: id,
        requestId: (req as Request & { id?: string }).id,
      });
      throw new NotFoundError('Order not found');
    }
    
    logger.debug('Single order response', {
      orderId: id,
      requestId: (req as Request & { id?: string }).id,
    });
    
    res.json(order);
  })
);

// POST /api/orders - Create a new order
router.post('/',
  createValidationMiddleware(requestSchemas.createOrder, 'body'),
  asyncHandler(async (req: Request, res: Response) => {
    const orderService = getOrderService(req);
    const orderData = req.body;
    
    logger.info('Order creation requested', {
      orderData: { ...orderData, id: undefined }, // Don't log sensitive data
      requestId: (req as Request & { id?: string }).id,
    });
    
    const createdOrder = await orderService.createOrder(orderData);
    
    logger.info('Order created successfully', {
      orderId: createdOrder.id,
      requestId: (req as Request & { id?: string }).id,
    });
    
    res.status(201).json(createdOrder);
  })
);

// PUT /api/orders/:id - Update an existing order
router.put('/:id',
  createValidationMiddleware(requestSchemas.getOrderByIdParams, 'params'),
  createValidationMiddleware(requestSchemas.createOrder, 'body'),
  asyncHandler(async (req: Request, res: Response) => {
    const orderService = getOrderService(req);
    const { id } = req.params;
    const updateData = req.body;
    
    logger.info('Order update requested', {
      orderId: id,
      updateData: { ...updateData, id: undefined }, // Don't log sensitive data
      requestId: (req as Request & { id?: string }).id,
    });
    
    const updatedOrder = await orderService.updateOrder(id, updateData);
    
    if (!updatedOrder) {
      logger.warn('Order not found for update', {
        orderId: id,
        requestId: (req as Request & { id?: string }).id,
      });
      throw new NotFoundError('Order not found');
    }
    
    logger.info('Order updated successfully', {
      orderId: id,
      requestId: (req as Request & { id?: string }).id,
    });
    
    res.json(updatedOrder);
  })
);

// DELETE /api/orders/:id - Delete an order
router.delete('/:id',
  createValidationMiddleware(requestSchemas.getOrderByIdParams, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const orderService = getOrderService(req);
    const { id } = req.params;
    
    logger.info('Order deletion requested', {
      orderId: id,
      requestId: (req as Request & { id?: string }).id,
    });
    
    const deleted = await orderService.deleteOrder(id);
    
    if (!deleted) {
      logger.warn('Order not found for deletion', {
        orderId: id,
        requestId: (req as Request & { id?: string }).id,
      });
      throw new NotFoundError('Order not found');
    }
    
    logger.info('Order deleted successfully', {
      orderId: id,
      requestId: (req as Request & { id?: string }).id,
    });
    
    res.status(204).send(); // No content
  })
);

// POST /api/orders/bulk - Create multiple orders
router.post('/bulk',
  createValidationMiddleware(requestSchemas.websocketMessage, 'body'), // Adapt for bulk
  asyncHandler(async (req: Request, res: Response) => {
    const orderService = getOrderService(req);
    const { orders } = req.body;
    
    if (!Array.isArray(orders) || orders.length === 0) {
      throw new ValidationError('Orders array is required and cannot be empty');
    }
    
    if (orders.length > 100) {
      throw new ValidationError('Cannot create more than 100 orders at once');
    }
    
    logger.info('Bulk order creation requested', {
      count: orders.length,
      requestId: (req as Request & { id?: string }).id,
    });
    
    const createdOrders = await orderService.createMultipleOrders(orders);
    
    logger.info('Bulk orders created successfully', {
      requested: orders.length,
      created: createdOrders.length,
      requestId: (req as Request & { id?: string }).id,
    });
    
    res.status(201).json({
      created: createdOrders,
      summary: {
        requested: orders.length,
        created: createdOrders.length,
        failed: orders.length - createdOrders.length,
      },
    });
  })
);

// PUT /api/orders/bulk - Update multiple orders
router.put('/bulk',
  createValidationMiddleware(requestSchemas.websocketMessage, 'body'), // Adapt for bulk
  asyncHandler(async (req: Request, res: Response) => {
    const orderService = getOrderService(req);
    const { updates } = req.body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new ValidationError('Updates array is required and cannot be empty');
    }
    
    if (updates.length > 100) {
      throw new ValidationError('Cannot update more than 100 orders at once');
    }
    
    logger.info('Bulk order update requested', {
      count: updates.length,
      requestId: (req as Request & { id?: string }).id,
    });
    
    const updatedOrders = await orderService.updateMultipleOrders(updates);
    
    logger.info('Bulk orders updated successfully', {
      requested: updates.length,
      updated: updatedOrders.length,
      requestId: (req as Request & { id?: string }).id,
    });
    
    res.json({
      updated: updatedOrders,
      summary: {
        requested: updates.length,
        updated: updatedOrders.length,
        failed: updates.length - updatedOrders.length,
      },
    });
  })
);

// DELETE /api/orders/bulk - Delete multiple orders
router.delete('/bulk',
  createValidationMiddleware(requestSchemas.websocketMessage, 'body'), // Adapt for bulk
  asyncHandler(async (req: Request, res: Response) => {
    const orderService = getOrderService(req);
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError('IDs array is required and cannot be empty');
    }
    
    if (ids.length > 100) {
      throw new ValidationError('Cannot delete more than 100 orders at once');
    }
    
    logger.info('Bulk order deletion requested', {
      count: ids.length,
      requestId: (req as Request & { id?: string }).id,
    });
    
    const deletedCount = await orderService.deleteMultipleOrders(ids);
    
    logger.info('Bulk orders deleted successfully', {
      requested: ids.length,
      deleted: deletedCount,
      requestId: (req as Request & { id?: string }).id,
    });
    
    res.json({
      summary: {
        requested: ids.length,
        deleted: deletedCount,
        failed: ids.length - deletedCount,
      },
    });
  })
);

// Error handling middleware specific to orders router
router.use((error: Error, req: Request, res: Response, next: (err?: Error) => void) => {
  logger.error('Orders router error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    requestId: (req as Request & { id?: string }).id,
  });
  
  next(error);
});

export default router;