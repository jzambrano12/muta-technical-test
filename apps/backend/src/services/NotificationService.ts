import { Server, Socket } from 'socket.io';
import { Order, WebSocketMessage, OrderStatus } from '@muta/shared';
import { INotificationService } from '../interfaces/INotificationService';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('NotificationService');

export class SocketIONotificationService implements INotificationService {
  private io: Server;
  private connectedClients: Map<string, { socket: Socket; metadata?: Record<string, unknown> }> = new Map();
  
  constructor(io: Server) {
    this.io = io;
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.addClient(socket.id, { socket }).catch(error => {
        logger.error('Failed to add client on connection', { socketId: socket.id, error });
      });
      
      socket.on('disconnect', () => {
        this.removeClient(socket.id).catch(error => {
          logger.error('Failed to remove client on disconnect', { socketId: socket.id, error });
        });
      });
    });
  }
  
  async notifyOrderCreated(order: Order): Promise<void> {
    try {
      const message: WebSocketMessage = {
        type: 'order-created',
        data: order,
        timestamp: new Date(),
      };
      
      await this.broadcast(message);
      logger.debug('Order creation notification sent', { orderId: order.id });
    } catch (error) {
      logger.error('Failed to notify order creation', { orderId: order.id, error });
      throw error;
    }
  }
  
  async notifyOrderUpdated(order: Order): Promise<void> {
    try {
      const message: WebSocketMessage = {
        type: 'order-update',
        data: order,
        timestamp: new Date(),
      };
      
      await this.broadcast(message);
      logger.debug('Order update notification sent', { orderId: order.id });
    } catch (error) {
      logger.error('Failed to notify order update', { orderId: order.id, error });
      throw error;
    }
  }
  
  async notifyOrderDeleted(order: Order): Promise<void> {
    try {
      const message: WebSocketMessage = {
        type: 'order-deleted',
        data: order,
        timestamp: new Date(),
      };
      
      await this.broadcast(message);
      logger.debug('Order deletion notification sent', { orderId: order.id });
    } catch (error) {
      logger.error('Failed to notify order deletion', { orderId: order.id, error });
      throw error;
    }
  }
  
  async broadcast(message: WebSocketMessage): Promise<void> {
    try {
      this.io.emit(message.type, message);
      
      logger.debug('Message broadcasted', { 
        type: message.type,
        recipients: this.connectedClients.size 
      });
    } catch (error) {
      logger.error('Failed to broadcast message', { messageType: message.type, error });
      throw error;
    }
  }
  
  async broadcastToRoom(room: string, message: WebSocketMessage): Promise<void> {
    try {
      this.io.to(room).emit(message.type, message);
      
      logger.debug('Message broadcasted to room', { 
        room,
        type: message.type 
      });
    } catch (error) {
      logger.error('Failed to broadcast message to room', { 
        room,
        messageType: message.type,
        error 
      });
      throw error;
    }
  }
  
  async addClient(clientId: string, metadata?: { socket: Socket; metadata?: Record<string, unknown> }): Promise<void> {
    try {
      this.connectedClients.set(clientId, metadata || { socket: this.io.sockets.sockets.get(clientId)! });
      
      logger.info('Client connected', { 
        clientId,
        totalClients: this.connectedClients.size 
      });
    } catch (error) {
      logger.error('Failed to add client', { clientId, error });
      throw error;
    }
  }
  
  async removeClient(clientId: string): Promise<void> {
    try {
      const existed = this.connectedClients.delete(clientId);
      
      if (existed) {
        logger.info('Client disconnected', { 
          clientId,
          totalClients: this.connectedClients.size 
        });
      }
    } catch (error) {
      logger.error('Failed to remove client', { clientId, error });
      throw error;
    }
  }
  
  async getConnectedClients(): Promise<string[]> {
    try {
      const clients = Array.from(this.connectedClients.keys());
      logger.debug('Retrieved connected clients', { count: clients.length });
      return clients;
    } catch (error) {
      logger.error('Failed to get connected clients', { error });
      throw error;
    }
  }
  
  async notifySystemStatus(status: 'healthy' | 'degraded' | 'unhealthy'): Promise<void> {
    try {
      const systemOrder: Order = {
        id: 'SYSTEM_STATUS',
        address: 'System Health',
        status: OrderStatus.PENDING,
        collectorName: `System-${status}`,
        lastUpdated: new Date(),
      };
      
      const message: WebSocketMessage = {
        type: 'order-update',
        data: systemOrder,
        timestamp: new Date(),
      };
      
      await this.broadcast(message);
      logger.info('System status notification sent', { status });
    } catch (error) {
      logger.error('Failed to notify system status', { status, error });
      throw error;
    }
  }
  
  // Additional utility methods
  getConnectionCount(): number {
    return this.connectedClients.size;
  }
  
  async sendToClient(clientId: string, message: WebSocketMessage): Promise<boolean> {
    try {
      const client = this.connectedClients.get(clientId);
      if (!client?.socket) {
        logger.warn('Attempted to send message to non-existent client', { clientId });
        return false;
      }
      
      client.socket.emit(message.type, message);
      logger.debug('Message sent to specific client', { clientId, type: message.type });
      return true;
    } catch (error) {
      logger.error('Failed to send message to client', { clientId, error });
      return false;
    }
  }
  
  async disconnectClient(clientId: string, reason?: string): Promise<boolean> {
    try {
      const client = this.connectedClients.get(clientId);
      if (!client?.socket) {
        logger.warn('Attempted to disconnect non-existent client', { clientId });
        return false;
      }
      
      client.socket.disconnect(true);
      await this.removeClient(clientId);
      
      logger.info('Client forcibly disconnected', { clientId, reason });
      return true;
    } catch (error) {
      logger.error('Failed to disconnect client', { clientId, error });
      return false;
    }
  }
}