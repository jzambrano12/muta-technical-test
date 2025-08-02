import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { config } from '../config';
import { createComponentLogger, securityLogger } from '../utils/logger';
import { requestSchemas, customValidations } from '../schemas/validation';

const logger = createComponentLogger('websocketAuth');

// Extended socket interface to include authentication data
export interface AuthenticatedSocket extends Socket {
  isAuthenticated: boolean;
  clientInfo: {
    ip: string;
    userAgent: string;
    origin: string;
    connectedAt: Date;
  };
  rateLimitData: {
    messageCount: number;
    lastReset: Date;
    isBlocked: boolean;
  };
}

// Rate limiting for WebSocket messages
const WS_RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxMessages: 30, // 30 messages per minute
  blockDurationMs: 5 * 60 * 1000, // 5 minutes block
};

// Connection authentication middleware
export const connectionAuthMiddleware = (socket: Socket, next: (err?: ExtendedError) => void) => {
  const authSocket = socket as AuthenticatedSocket;
  
  try {
    // Extract client information
    const clientIP = socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
    const origin = socket.handshake.headers.origin || socket.handshake.headers.referer || 'Unknown';
    
    // Validate origin
    const allowedOrigins = config.corsOrigin.split(',').map((o: string) => o.trim());
    if (!customValidations.validateWebSocketOrigin(origin, allowedOrigins)) {
      securityLogger.logSecurityEvent('WS_INVALID_ORIGIN', {
        ip: clientIP,
        origin,
        userAgent,
      });
      
      return next(new Error('Invalid origin'));
    }
    
    // Initialize client info
    authSocket.clientInfo = {
      ip: clientIP,
      userAgent,
      origin,
      connectedAt: new Date(),
    };
    
    // Initialize rate limit data
    authSocket.rateLimitData = {
      messageCount: 0,
      lastReset: new Date(),
      isBlocked: false,
    };
    
    // Set initial authentication status
    authSocket.isAuthenticated = !config.websocket.apiKey; // If no API key required, auto-authenticate
    
    logger.info('WebSocket connection attempt', {
      socketId: socket.id,
      ip: clientIP,
      origin,
      userAgent,
      requiresAuth: !!config.websocket.apiKey,
    });
    
    next();
  } catch (error) {
    logger.error('WebSocket connection authentication failed', {
      socketId: socket.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    next(new Error('Authentication failed'));
  }
};

// Message authentication and validation middleware
export const messageAuthMiddleware = (socket: AuthenticatedSocket) => {
  return (event: string, data: any, callback?: Function) => {
    try {
      // Check if socket is blocked due to rate limiting
      if (socket.rateLimitData.isBlocked) {
        const blockExpiry = new Date(socket.rateLimitData.lastReset.getTime() + WS_RATE_LIMIT.blockDurationMs);
        if (new Date() < blockExpiry) {
          securityLogger.logSecurityEvent('WS_BLOCKED_MESSAGE_ATTEMPT', {
            socketId: socket.id,
            ip: socket.clientInfo.ip,
            event,
          });
          
          if (callback) {
            callback({ error: 'Client is temporarily blocked' });
          }
          return;
        } else {
          // Reset block status
          socket.rateLimitData.isBlocked = false;
          socket.rateLimitData.messageCount = 0;
          socket.rateLimitData.lastReset = new Date();
        }
      }
      
      // Apply rate limiting
      const now = new Date();
      const timeSinceReset = now.getTime() - socket.rateLimitData.lastReset.getTime();
      
      if (timeSinceReset > WS_RATE_LIMIT.windowMs) {
        // Reset rate limit window
        socket.rateLimitData.messageCount = 1;
        socket.rateLimitData.lastReset = now;
      } else {
        socket.rateLimitData.messageCount++;
        
        if (socket.rateLimitData.messageCount > WS_RATE_LIMIT.maxMessages) {
          // Block the socket
          socket.rateLimitData.isBlocked = true;
          
          securityLogger.logSecurityEvent('WS_RATE_LIMIT_EXCEEDED', {
            socketId: socket.id,
            ip: socket.clientInfo.ip,
            messageCount: socket.rateLimitData.messageCount,
            event,
          });
          
          if (callback) {
            callback({ error: 'Rate limit exceeded. Client temporarily blocked.' });
          }
          return;
        }
      }
      
      // Validate message structure for specific events
      if (event === 'message' || event === 'subscribe' || event === 'unsubscribe') {
        const validation = requestSchemas.websocketMessage.validate(data);
        if (validation.error) {
          securityLogger.logSecurityEvent('WS_INVALID_MESSAGE', {
            socketId: socket.id,
            ip: socket.clientInfo.ip,
            event,
            error: validation.error.message,
          });
          
          if (callback) {
            callback({ error: 'Invalid message format' });
          }
          return;
        }
        
        // Check authentication for subscription
        if (data.type === 'subscribe' && config.websocket.apiKey && !socket.isAuthenticated) {
          if (!data.apiKey || data.apiKey !== config.websocket.apiKey) {
            securityLogger.logFailedAuth('Invalid WebSocket API key', socket.clientInfo.ip);
            
            if (callback) {
              callback({ error: 'Authentication required' });
            }
            return;
          }
          
          // Authenticate the socket
          socket.isAuthenticated = true;
          logger.info('WebSocket client authenticated', {
            socketId: socket.id,
            ip: socket.clientInfo.ip,
          });
        }
      }
      
      // Proceed with the original event if validation passes
      return true;
    } catch (error) {
      logger.error('WebSocket message validation failed', {
        socketId: socket.id,
        event,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      if (callback) {
        callback({ error: 'Message processing failed' });
      }
      return false;
    }
  };
};

// Connection monitoring and cleanup
export const connectionMonitor = {
  connections: new Map<string, AuthenticatedSocket>(),
  
  addConnection(socket: AuthenticatedSocket): void {
    this.connections.set(socket.id, socket);
    
    logger.info('WebSocket connection established', {
      socketId: socket.id,
      ip: socket.clientInfo.ip,
      totalConnections: this.connections.size,
    });
  },
  
  removeConnection(socketId: string): void {
    const socket = this.connections.get(socketId);
    if (socket) {
      const connectionDuration = Date.now() - socket.clientInfo.connectedAt.getTime();
      
      logger.info('WebSocket connection closed', {
        socketId,
        ip: socket.clientInfo.ip,
        duration: connectionDuration,
        totalConnections: this.connections.size - 1,
      });
      
      this.connections.delete(socketId);
    }
  },
  
  getConnectionStats(): {
    total: number;
    authenticated: number;
    blocked: number;
    byOrigin: Record<string, number>;
  } {
    const stats = {
      total: this.connections.size,
      authenticated: 0,
      blocked: 0,
      byOrigin: {} as Record<string, number>,
    };
    
    for (const socket of this.connections.values()) {
      if (socket.isAuthenticated) stats.authenticated++;
      if (socket.rateLimitData.isBlocked) stats.blocked++;
      
      const origin = socket.clientInfo.origin;
      stats.byOrigin[origin] = (stats.byOrigin[origin] || 0) + 1;
    }
    
    return stats;
  },
  
  // Cleanup blocked connections periodically
  cleanup(): void {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [socketId, socket] of this.connections.entries()) {
      // Remove connections that have been blocked for too long
      if (socket.rateLimitData.isBlocked) {
        const blockExpiry = new Date(socket.rateLimitData.lastReset.getTime() + WS_RATE_LIMIT.blockDurationMs);
        if (now > blockExpiry) {
          socket.disconnect(true);
          this.removeConnection(socketId);
          cleanedCount++;
        }
      }
      
      // Remove very old inactive connections
      const connectionAge = now.getTime() - socket.clientInfo.connectedAt.getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (connectionAge > maxAge) {
        socket.disconnect(true);
        this.removeConnection(socketId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info('WebSocket connections cleaned up', { cleanedCount });
    }
  },
};

// Start periodic cleanup
setInterval(() => {
  connectionMonitor.cleanup();
}, 5 * 60 * 1000); // Every 5 minutes

// Heartbeat mechanism to detect dead connections
export const setupHeartbeat = (socket: AuthenticatedSocket): void => {
  let pingInterval: NodeJS.Timeout;
  let pongTimeout: NodeJS.Timeout;
  
  const startHeartbeat = () => {
    pingInterval = setInterval(() => {
      socket.emit('ping');
      
      pongTimeout = setTimeout(() => {
        logger.warn('WebSocket client did not respond to ping', {
          socketId: socket.id,
          ip: socket.clientInfo.ip,
        });
        socket.disconnect(true);
      }, config.websocket.pingTimeout);
    }, config.websocket.pingInterval);
  };
  
  const stopHeartbeat = () => {
    if (pingInterval) clearInterval(pingInterval);
    if (pongTimeout) clearTimeout(pongTimeout);
  };
  
  socket.on('pong', () => {
    if (pongTimeout) clearTimeout(pongTimeout);
  });
  
  socket.on('disconnect', stopHeartbeat);
  
  startHeartbeat();
};