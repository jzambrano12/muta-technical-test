import { Order, WebSocketMessage } from '@muta/shared';

// Interface for notification/messaging service
export interface INotificationService {
  // Order-related notifications
  notifyOrderCreated(order: Order): Promise<void>;
  notifyOrderUpdated(order: Order): Promise<void>;
  notifyOrderDeleted(order: Order): Promise<void>;
  
  // General message broadcasting
  broadcast(message: WebSocketMessage): Promise<void>;
  broadcastToRoom(room: string, message: WebSocketMessage): Promise<void>;
  
  // Client management
  addClient(clientId: string, metadata?: any): Promise<void>;
  removeClient(clientId: string): Promise<void>;
  getConnectedClients(): Promise<string[]>;
  
  // System notifications
  notifySystemStatus(status: 'healthy' | 'degraded' | 'unhealthy'): Promise<void>;
}