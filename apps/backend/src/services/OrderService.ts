import { Order, OrderStatus, OrderFilters, generateOrderId, getRandomAddress, getRandomCollectorName, getRandomStatus } from '@muta/shared';
import { IOrderService, ServiceHealth, TimeRange, OrderTrend } from '../interfaces/IOrderService';
import { IOrderRepository, PaginationOptions, PaginatedResult } from '../interfaces/IOrderRepository';
import { INotificationService } from '../interfaces/INotificationService';
import { createComponentLogger } from '../utils/logger';
import { ValidationError, ServiceUnavailableError } from '../middleware/errorHandler';

const logger = createComponentLogger('OrderService');

export class OrderService implements IOrderService {
  private repository: IOrderRepository;
  private notificationService: INotificationService;
  private startTime: Date;
  private lastError?: { message: string; timestamp: Date };

  constructor(
    repository: IOrderRepository,
    notificationService: INotificationService
  ) {
    this.repository = repository;
    this.notificationService = notificationService;
    this.startTime = new Date();
  }


  private handleError(message: string, error: unknown): void {
    this.lastError = {
      message: `${message}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
    };
    logger.error(message, { error });
  }

  async initializeWithSampleData(): Promise<void> {
    try {
      const sampleOrders: Array<Omit<Order, 'id' | 'lastUpdated'>> = [];
      
      for (let i = 0; i < 20; i++) {
        sampleOrders.push({
          address: getRandomAddress(),
          status: getRandomStatus(),
          collectorName: getRandomCollectorName(),
        });
      }
      
      await this.createMultipleOrders(sampleOrders);
      logger.info('Sample data initialized', { count: sampleOrders.length });
    } catch (error) {
      this.handleError('Failed to initialize sample data', error);
      throw error;
    }
  }


  async createOrder(orderData: Omit<Order, 'id' | 'lastUpdated'>): Promise<Order> {
    try {
      const order: Order = {
        ...orderData,
        id: generateOrderId(),
        lastUpdated: new Date(),
      };

      const createdOrder = await this.repository.create(order);
      await this.notificationService.notifyOrderCreated(createdOrder);

      logger.info('Order created', { orderId: createdOrder.id });
      return createdOrder;
    } catch (error) {
      this.handleError('Failed to create order', error);
      throw error;
    }
  }

  async getOrderById(id: string): Promise<Order | null> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid order ID');
      }

      const order = await this.repository.findById(id);
      logger.debug('Order retrieved by ID', { orderId: id, found: !!order });
      return order;
    } catch (error) {
      this.handleError('Failed to get order by ID', error);
      throw error;
    }
  }

  async getAllOrders(pagination?: PaginationOptions): Promise<PaginatedResult<Order>> {
    try {
      const result = await this.repository.findByFilters({}, pagination);
      logger.debug('All orders retrieved', { 
        count: result.data.length,
        total: result.pagination.total 
      });
      return result;
    } catch (error) {
      this.handleError('Failed to get all orders', error);
      throw error;
    }
  }

  async updateOrder(id: string, updateData: Partial<Order>): Promise<Order | null> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid order ID');
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        throw new ValidationError('No update data provided');
      }

      const updatedOrder = await this.repository.update(id, updateData);
      
      if (updatedOrder) {
        await this.notificationService.notifyOrderUpdated(updatedOrder);
        logger.info('Order updated', { orderId: id });
      } else {
        logger.warn('Order not found for update', { orderId: id });
      }

      return updatedOrder;
    } catch (error) {
      this.handleError('Failed to update order', error);
      throw error;
    }
  }

  async deleteOrder(id: string): Promise<boolean> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid order ID');
      }

      // Get order before deletion for notification
      const order = await this.repository.findById(id);
      if (!order) {
        return false;
      }

      const deleted = await this.repository.delete(id);
      
      if (deleted) {
        await this.notificationService.notifyOrderDeleted(order);
        logger.info('Order deleted', { orderId: id });
      }

      return deleted;
    } catch (error) {
      this.handleError('Failed to delete order', error);
      throw error;
    }
  }

  async getFilteredOrders(filters: OrderFilters, pagination?: PaginationOptions): Promise<PaginatedResult<Order>> {
    try {
      const result = await this.repository.findByFilters(filters, pagination);
      logger.debug('Filtered orders retrieved', { 
        filters,
        count: result.data.length,
        total: result.pagination.total 
      });
      return result;
    } catch (error) {
      this.handleError('Failed to get filtered orders', error);
      throw error;
    }
  }

  async searchOrders(searchTerm: string, pagination?: PaginationOptions): Promise<PaginatedResult<Order>> {
    try {
      if (!searchTerm || typeof searchTerm !== 'string') {
        throw new ValidationError('Invalid search term');
      }

      const result = await this.repository.search(searchTerm, pagination);
      logger.debug('Orders searched', { 
        searchTerm,
        count: result.data.length,
        total: result.pagination.total 
      });
      return result;
    } catch (error) {
      this.handleError('Failed to search orders', error);
      throw error;
    }
  }

  async getOrderStats(): Promise<Record<OrderStatus, number>> {
    try {
      const stats = await this.repository.countByStatus();
      logger.debug('Order statistics retrieved', { stats });
      return stats;
    } catch (error) {
      this.handleError('Failed to get order statistics', error);
      throw error;
    }
  }

  async getOrderTrends(timeRange: TimeRange): Promise<OrderTrend[]> {
    try {
      // This is a simplified implementation
      // In a real application, you would query historical data
      const currentStats = await this.getOrderStats();
      
      const trends: OrderTrend[] = Object.entries(currentStats).map(([status, count]) => ({
        timestamp: new Date(),
        status: status as OrderStatus,
        count,
      }));

      logger.debug('Order trends calculated', { timeRange, trendsCount: trends.length });
      return trends;
    } catch (error) {
      this.handleError('Failed to get order trends', error);
      throw error;
    }
  }

  async createMultipleOrders(ordersData: Array<Omit<Order, 'id' | 'lastUpdated'>>): Promise<Order[]> {
    try {
      if (!Array.isArray(ordersData) || ordersData.length === 0) {
        throw new ValidationError('Invalid orders data');
      }

      const orders: Order[] = ordersData.map(orderData => ({
        ...orderData,
        id: generateOrderId(),
        lastUpdated: new Date(),
      }));

      const createdOrders = await this.repository.createMany(orders);
      
      // Notify for each created order
      for (const order of createdOrders) {
        try {
          await this.notificationService.notifyOrderCreated(order);
        } catch (error) {
          logger.warn('Failed to notify for bulk created order', { orderId: order.id, error });
        }
      }

      logger.info('Multiple orders created', { count: createdOrders.length });
      return createdOrders;
    } catch (error) {
      this.handleError('Failed to create multiple orders', error);
      throw error;
    }
  }

  async updateMultipleOrders(updates: Array<{ id: string; data: Partial<Order> }>): Promise<Order[]> {
    try {
      if (!Array.isArray(updates) || updates.length === 0) {
        throw new ValidationError('Invalid updates data');
      }

      const updatedOrders = await this.repository.updateMany(updates);
      
      // Notify for each updated order
      for (const order of updatedOrders) {
        try {
          await this.notificationService.notifyOrderUpdated(order);
        } catch (error) {
          logger.warn('Failed to notify for bulk updated order', { orderId: order.id, error });
        }
      }

      logger.info('Multiple orders updated', { count: updatedOrders.length });
      return updatedOrders;
    } catch (error) {
      this.handleError('Failed to update multiple orders', error);
      throw error;
    }
  }

  async deleteMultipleOrders(ids: string[]): Promise<number> {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new ValidationError('Invalid IDs array');
      }

      // Get orders before deletion for notifications
      const ordersToDelete: Order[] = [];
      for (const id of ids) {
        const order = await this.repository.findById(id);
        if (order) {
          ordersToDelete.push(order);
        }
      }

      const deletedCount = await this.repository.deleteMany(ids);
      
      // Notify for each deleted order
      for (const order of ordersToDelete) {
        try {
          await this.notificationService.notifyOrderDeleted(order);
        } catch (error) {
          logger.warn('Failed to notify for bulk deleted order', { orderId: order.id, error });
        }
      }

      logger.info('Multiple orders deleted', { count: deletedCount });
      return deletedCount;
    } catch (error) {
      this.handleError('Failed to delete multiple orders', error);
      throw error;
    }
  }

  async getServiceHealth(): Promise<ServiceHealth> {
    try {
      const totalOrders = await this.repository.getTotalCount();
      const activeConnections = await this.notificationService.getConnectedClients();
      const uptime = Date.now() - this.startTime.getTime();
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      // Determine health status based on various factors
      if (this.lastError) {
        const errorAge = Date.now() - this.lastError.timestamp.getTime();
        if (errorAge < 60000) { // Error in last minute
          status = 'degraded';
        }
        if (errorAge < 10000) { // Error in last 10 seconds
          status = 'unhealthy';
        }
      }
      

      const health: ServiceHealth = {
        status,
        totalOrders,
        activeConnections: activeConnections.length,
        uptime,
        lastError: this.lastError,
      };

      logger.debug('Service health checked', { health });
      return health;
    } catch (error) {
      this.handleError('Failed to get service health', error);
      throw new ServiceUnavailableError('Health check failed');
    }
  }

  // Legacy methods for backward compatibility
  getAllOrdersLegacy(): Order[] {
    logger.warn('Using deprecated getAllOrdersLegacy method');
    // This is a synchronous wrapper for async method - not ideal but needed for compatibility
    throw new Error('Use getAllOrders() async method instead');
  }

  getOrderByIdLegacy(_id: string): Order | undefined {
    logger.warn('Using deprecated getOrderByIdLegacy method');
    // This is a synchronous wrapper for async method - not ideal but needed for compatibility
    throw new Error('Use getOrderById() async method instead');
  }

  getFilteredOrdersLegacy(_filters: { status?: OrderStatus; search?: string }): Order[] {
    logger.warn('Using deprecated getFilteredOrdersLegacy method');
    // This is a synchronous wrapper for async method - not ideal but needed for compatibility
    throw new Error('Use getFilteredOrders() async method instead');
  }

  getOrderStatsLegacy(): Record<OrderStatus, number> {
    logger.warn('Using deprecated getOrderStatsLegacy method');
    // This is a synchronous wrapper for async method - not ideal but needed for compatibility
    throw new Error('Use getOrderStats() async method instead');
  }

  stopSimulation(): void {
    // Method for stopping any ongoing simulations
    // Currently a no-op as there are no simulations running
    logger.debug('Simulation stop requested');
  }
}