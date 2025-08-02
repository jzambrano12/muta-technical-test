import { renderHook, act } from '@testing-library/react';
import { useSocket } from '../../hooks/useSocket';
import { io } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');
const mockIo = io as jest.MockedFunction<typeof io>;

// Mock socket instance
const mockSocket = {
  on: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
};

const mockOrders = [
  {
    id: 'ORD-001',
    address: 'Test Address',
    status: 'pending' as const,
    collectorName: 'Test Collector',
    lastUpdated: new Date().toISOString()
  }
];

describe('useSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIo.mockReturnValue(mockSocket as typeof mockSocket & { [key: string]: unknown });
  });

  it('initializes socket connection with correct configuration', () => {
    renderHook(() => useSocket());

    expect(mockIo).toHaveBeenCalledWith('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  });

  it('sets up event listeners on socket connection', () => {
    renderHook(() => useSocket());

    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('orders:initial', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('orders:updated', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('order:created', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('order:updated', expect.any(Function));
  });

  it('updates connection status on connect event', () => {
    const { result } = renderHook(() => useSocket());

    // Simulate connect event
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
    act(() => {
      connectHandler?.();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('updates connection status on disconnect event', () => {
    const { result } = renderHook(() => useSocket());

    // First connect
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
    act(() => {
      connectHandler?.();
    });

    // Then disconnect
    const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1];
    act(() => {
      disconnectHandler?.('transport close');
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('handles initial orders event', () => {
    const { result } = renderHook(() => useSocket());

    const initialOrdersHandler = mockSocket.on.mock.calls.find(call => call[0] === 'orders:initial')?.[1];
    act(() => {
      initialOrdersHandler?.(mockOrders);
    });

    expect(result.current.orders).toEqual(mockOrders);
  });

  it('handles orders updated event', () => {
    const { result } = renderHook(() => useSocket());

    const updatedOrdersHandler = mockSocket.on.mock.calls.find(call => call[0] === 'orders:updated')?.[1];
    act(() => {
      updatedOrdersHandler?.(mockOrders);
    });

    expect(result.current.orders).toEqual(mockOrders);
  });

  it('handles new order created event', () => {
    const { result } = renderHook(() => useSocket());

    const newOrderHandler = mockSocket.on.mock.calls.find(call => call[0] === 'order:created')?.[1];
    act(() => {
      newOrderHandler?.(mockOrders[0]);
    });

    expect(result.current.orders).toContain(mockOrders[0]);
  });

  it('handles order updated event', () => {
    const { result } = renderHook(() => useSocket());

    // First add an order
    const newOrderHandler = mockSocket.on.mock.calls.find(call => call[0] === 'order:created')?.[1];
    act(() => {
      newOrderHandler?.(mockOrders[0]);
    });

    // Then update it
    const updatedOrder = { ...mockOrders[0], status: 'completed' as const };
    const orderUpdatedHandler = mockSocket.on.mock.calls.find(call => call[0] === 'order:updated')?.[1];
    act(() => {
      orderUpdatedHandler?.(updatedOrder);
    });

    expect(result.current.orders[0].status).toBe('completed');
  });

  it('handles connection errors', () => {
    const { result } = renderHook(() => useSocket());

    const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
    act(() => {
      errorHandler?.(new Error('Connection failed'));
    });

    expect(result.current.error).toContain('Reintentando conexión');
  });

  it('sets max reconnect error after multiple attempts', () => {
    const { result } = renderHook(() => useSocket());

    const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
    
    // Simulate 5 failed connection attempts
    act(() => {
      for (let i = 0; i < 5; i++) {
        errorHandler?.(new Error('Connection failed'));
      }
    });

    expect(result.current.error).toContain('No se pudo conectar al servidor');
  });

  it('disconnects socket on unmount', () => {
    const { unmount } = renderHook(() => useSocket());

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});