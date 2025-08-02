import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Order } from '@muta/shared';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  orders: Order[];
  error: string | null;
}

export function useSocket(url: string = 'http://localhost:3001'): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const socketInstance = io(url, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      setError(null);
      reconnectAttempts.current = 0;
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      reconnectAttempts.current += 1;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        setError('No se pudo conectar al servidor. Verifique su conexión.');
      } else {
        setError(`Reintentando conexión (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
      }
    });

    socketInstance.on('initial-orders', (initialOrders: Order[]) => {
      console.log('Received initial orders:', initialOrders.length);
      setOrders(initialOrders);
    });

    socketInstance.on('order-created', (message: { data: Order }) => {
      console.log('New order created:', message.data.id);
      setOrders(prev => [...prev, message.data]);
    });

    socketInstance.on('order-update', (message: { data: Order }) => {
      console.log('Order updated:', message.data.id);
      setOrders(prev => 
        prev.map(order => 
          order.id === message.data.id ? message.data : order
        )
      );
    });

    socketInstance.on('order-deleted', (message: { data: Order }) => {
      console.log('Order deleted:', message.data.id);
      setOrders(prev => prev.filter(order => order.id !== message.data.id));
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [url]);

  return {
    socket,
    isConnected,
    orders,
    error
  };
}