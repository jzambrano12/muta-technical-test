export enum OrderStatus {
  PENDING = 'pendiente',
  EN_ROUTE = 'en ruta',
  IN_PROCESS = 'en proceso',
  COMPLETED = 'completada',
  CANCELLED = 'cancelada'
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