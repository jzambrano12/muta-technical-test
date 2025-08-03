export enum OrderStatus {
  PENDING = 'pending',
  EN_ROUTE = 'in-route',
  IN_PROCESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface Order {
  id: string;
  address: string;
  status: OrderStatus;
  collectorName: string;
  lastUpdated: Date;
}

export interface OrderFilters {
  status?: OrderStatus;
  search?: string;
}

export interface WebSocketMessage {
  type: 'order-update' | 'order-created' | 'order-deleted';
  data: Order;
  timestamp: Date;
}
