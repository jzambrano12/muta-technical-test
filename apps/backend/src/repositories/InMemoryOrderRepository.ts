import { Order, OrderStatus, OrderFilters } from '@muta/shared';
import { IOrderRepository, PaginationOptions, PaginatedResult } from '../interfaces/IOrderRepository';
import { createComponentLogger } from '../utils/logger';
import { ValidationError } from '../middleware/errorHandler';

const logger = createComponentLogger('InMemoryOrderRepository');

export class InMemoryOrderRepository implements IOrderRepository {
  private orders: Map<string, Order> = new Map();
  
  async create(order: Order): Promise<Order> {
    try {
      if (this.orders.has(order.id)) {
        throw new ValidationError(`Order with ID ${order.id} already exists`);
      }
      
      const newOrder: Order = {
        ...order,
        lastUpdated: new Date(),
      };
      
      this.orders.set(order.id, newOrder);
      
      logger.debug('Order created', { orderId: order.id });
      return newOrder;
    } catch (error) {
      logger.error('Failed to create order', { orderId: order.id, error });
      throw error;
    }
  }
  
  async findById(id: string): Promise<Order | null> {
    try {
      const order = this.orders.get(id) || null;
      logger.debug('Order lookup', { orderId: id, found: !!order });
      return order;
    } catch (error) {
      logger.error('Failed to find order by ID', { orderId: id, error });
      throw error;
    }
  }
  
  async findAll(): Promise<Order[]> {
    try {
      const orders = Array.from(this.orders.values());
      logger.debug('Retrieved all orders', { count: orders.length });
      return orders;
    } catch (error) {
      logger.error('Failed to retrieve all orders', { error });
      throw error;
    }
  }
  
  async update(id: string, updateData: Partial<Order>): Promise<Order | null> {
    try {
      const existingOrder = this.orders.get(id);
      if (!existingOrder) {
        logger.warn('Attempted to update non-existent order', { orderId: id });
        return null;
      }
      
      const updatedOrder: Order = {
        ...existingOrder,
        ...updateData,
        id: existingOrder.id, // Prevent ID changes
        lastUpdated: new Date(),
      };
      
      this.orders.set(id, updatedOrder);
      
      logger.debug('Order updated', { orderId: id, updates: Object.keys(updateData) });
      return updatedOrder;
    } catch (error) {
      logger.error('Failed to update order', { orderId: id, error });
      throw error;
    }
  }
  
  async delete(id: string): Promise<boolean> {
    try {
      const existed = this.orders.has(id);
      if (existed) {
        this.orders.delete(id);
        logger.debug('Order deleted', { orderId: id });
      } else {
        logger.warn('Attempted to delete non-existent order', { orderId: id });
      }
      return existed;
    } catch (error) {
      logger.error('Failed to delete order', { orderId: id, error });
      throw error;
    }
  }
  
  async findByStatus(status: OrderStatus): Promise<Order[]> {
    try {
      const orders = Array.from(this.orders.values())
        .filter(order => order.status === status);
      
      logger.debug('Orders retrieved by status', { status, count: orders.length });
      return orders;
    } catch (error) {
      logger.error('Failed to find orders by status', { status, error });
      throw error;
    }
  }
  
  async findByFilters(filters: OrderFilters, pagination?: PaginationOptions): Promise<PaginatedResult<Order>> {
    try {
      let orders = Array.from(this.orders.values());
      
      // Apply filters
      if (filters.status) {
        orders = orders.filter(order => order.status === filters.status);
      }
      
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        orders = orders.filter(order =>
          order.id.toLowerCase().includes(searchTerm) ||
          order.collectorName.toLowerCase().includes(searchTerm) ||
          order.address.toLowerCase().includes(searchTerm)
        );
      }
      
      // Apply sorting
      if (pagination?.sortBy) {
        orders.sort((a, b) => {
          const aValue = a[pagination.sortBy!];
          const bValue = b[pagination.sortBy!];
          
          let comparison = 0;
          if (aValue < bValue) comparison = -1;
          if (aValue > bValue) comparison = 1;
          
          return pagination.sortOrder === 'desc' ? -comparison : comparison;
        });
      }
      
      const total = orders.length;
      
      // Apply pagination
      if (pagination) {
        const startIndex = (pagination.page - 1) * pagination.limit;
        orders = orders.slice(startIndex, startIndex + pagination.limit);
      }
      
      const result: PaginatedResult<Order> = {
        data: orders,
        pagination: {
          page: pagination?.page || 1,
          limit: pagination?.limit || total,
          total,
          totalPages: pagination ? Math.ceil(total / pagination.limit) : 1,
        },
      };
      
      logger.debug('Orders retrieved with filters', { 
        filters, 
        pagination, 
        resultCount: orders.length,
        total 
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to find orders by filters', { filters, error });
      throw error;
    }
  }
  
  async search(searchTerm: string, pagination?: PaginationOptions): Promise<PaginatedResult<Order>> {
    return this.findByFilters({ search: searchTerm }, pagination);
  }
  
  async countByStatus(): Promise<Record<OrderStatus, number>> {
    try {
      const stats: Record<OrderStatus, number> = {
        [OrderStatus.PENDING]: 0,
        [OrderStatus.EN_ROUTE]: 0,
        [OrderStatus.IN_PROCESS]: 0,
        [OrderStatus.COMPLETED]: 0,
        [OrderStatus.CANCELLED]: 0,
      };
      
      for (const order of this.orders.values()) {
        stats[order.status]++;
      }
      
      logger.debug('Order statistics calculated', { stats });
      return stats;
    } catch (error) {
      logger.error('Failed to count orders by status', { error });
      throw error;
    }
  }
  
  async getTotalCount(): Promise<number> {
    try {
      const count = this.orders.size;
      logger.debug('Total order count retrieved', { count });
      return count;
    } catch (error) {
      logger.error('Failed to get total count', { error });
      throw error;
    }
  }
  
  async createMany(orders: Order[]): Promise<Order[]> {
    try {
      const createdOrders: Order[] = [];
      const errors: string[] = [];
      
      for (const order of orders) {
        try {
          const created = await this.create(order);
          createdOrders.push(created);
        } catch (error) {
          errors.push(`Failed to create order ${order.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      if (errors.length > 0) {
        logger.warn('Some orders failed to create in bulk operation', { 
          attempted: orders.length,
          created: createdOrders.length,
          errors 
        });
      }
      
      logger.debug('Bulk order creation completed', { 
        attempted: orders.length,
        created: createdOrders.length 
      });
      
      return createdOrders;
    } catch (error) {
      logger.error('Failed bulk order creation', { error });
      throw error;
    }
  }
  
  async updateMany(updates: Array<{ id: string; data: Partial<Order> }>): Promise<Order[]> {
    try {
      const updatedOrders: Order[] = [];
      const errors: string[] = [];
      
      for (const { id, data } of updates) {
        try {
          const updated = await this.update(id, data);
          if (updated) {
            updatedOrders.push(updated);
          } else {
            errors.push(`Order ${id} not found`);
          }
        } catch (error) {
          errors.push(`Failed to update order ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      if (errors.length > 0) {
        logger.warn('Some orders failed to update in bulk operation', { 
          attempted: updates.length,
          updated: updatedOrders.length,
          errors 
        });
      }
      
      logger.debug('Bulk order update completed', { 
        attempted: updates.length,
        updated: updatedOrders.length 
      });
      
      return updatedOrders;
    } catch (error) {
      logger.error('Failed bulk order update', { error });
      throw error;
    }
  }
  
  async deleteMany(ids: string[]): Promise<number> {
    try {
      let deletedCount = 0;
      
      for (const id of ids) {
        try {
          const deleted = await this.delete(id);
          if (deleted) {
            deletedCount++;
          }
        } catch (error) {
          logger.warn('Failed to delete order in bulk operation', { orderId: id, error });
        }
      }
      
      logger.debug('Bulk order deletion completed', { 
        attempted: ids.length,
        deleted: deletedCount 
      });
      
      return deletedCount;
    } catch (error) {
      logger.error('Failed bulk order deletion', { error });
      throw error;
    }
  }
}