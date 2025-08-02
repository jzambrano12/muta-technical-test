import { Order, OrderStatus, OrderFilters } from '@muta/shared';

// Repository pattern interface for data access
export interface IOrderRepository {
  // Basic CRUD operations
  create(order: Order): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findAll(): Promise<Order[]>;
  update(id: string, updateData: Partial<Order>): Promise<Order | null>;
  delete(id: string): Promise<boolean>;
  
  // Query operations
  findByStatus(status: OrderStatus): Promise<Order[]>;
  findByFilters(filters: OrderFilters, pagination?: PaginationOptions): Promise<PaginatedResult<Order>>;
  search(searchTerm: string, pagination?: PaginationOptions): Promise<PaginatedResult<Order>>;
  
  // Statistics
  countByStatus(): Promise<Record<OrderStatus, number>>;
  getTotalCount(): Promise<number>;
  
  // Bulk operations
  createMany(orders: Order[]): Promise<Order[]>;
  updateMany(updates: Array<{ id: string; data: Partial<Order> }>): Promise<Order[]>;
  deleteMany(ids: string[]): Promise<number>;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: keyof Order;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}