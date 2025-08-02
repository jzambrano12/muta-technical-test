import { Order, OrderStatus, OrderFilters } from '@muta/shared';
import { PaginationOptions, PaginatedResult } from './IOrderRepository';

// Main service interface following Single Responsibility Principle
export interface IOrderService {
  // Order management
  createOrder(orderData: Omit<Order, 'id' | 'lastUpdated'>): Promise<Order>;
  getOrderById(id: string): Promise<Order | null>;
  getAllOrders(pagination?: PaginationOptions): Promise<PaginatedResult<Order>>;
  updateOrder(id: string, updateData: Partial<Order>): Promise<Order | null>;
  deleteOrder(id: string): Promise<boolean>;
  
  // Filtering and search
  getFilteredOrders(filters: OrderFilters, pagination?: PaginationOptions): Promise<PaginatedResult<Order>>;
  searchOrders(searchTerm: string, pagination?: PaginationOptions): Promise<PaginatedResult<Order>>;
  
  // Statistics
  getOrderStats(): Promise<Record<OrderStatus, number>>;
  getOrderTrends(timeRange: TimeRange): Promise<OrderTrend[]>;
  
  // Bulk operations
  createMultipleOrders(ordersData: Array<Omit<Order, 'id' | 'lastUpdated'>>): Promise<Order[]>;
  updateMultipleOrders(updates: Array<{ id: string; data: Partial<Order> }>): Promise<Order[]>;
  deleteMultipleOrders(ids: string[]): Promise<number>;
  
  // Health and monitoring
  getServiceHealth(): Promise<ServiceHealth>;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface OrderTrend {
  timestamp: Date;
  status: OrderStatus;
  count: number;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  totalOrders: number;
  activeConnections: number;
  uptime: number;
  lastError?: {
    message: string;
    timestamp: Date;
  };
}