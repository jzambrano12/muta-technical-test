import { OrderService } from '../../services/OrderService';
import { OrderStatus } from '@muta/shared';
import { IOrderRepository } from '../../interfaces/IOrderRepository';
import { INotificationService } from '../../interfaces/INotificationService';
import { IOrderSimulator } from '../../interfaces/IOrderSimulator';

describe('OrderService', () => {
  let orderService: OrderService;
  let mockRepository: jest.Mocked<IOrderRepository>;
  let mockNotificationService: jest.Mocked<INotificationService>;
  let mockSimulator: jest.Mocked<IOrderSimulator>;

  beforeEach(async () => {
    // Mock sample orders data
    const mockOrders = Array.from({ length: 20 }, (_, i) => ({
      id: `order-${i + 1}`,
      address: `Address ${i + 1}`,
      status: OrderStatus.PENDING,
      collectorName: `Collector ${i + 1}`,
      lastUpdated: new Date(),
    }));

    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn().mockResolvedValue(mockOrders),
      update: jest.fn(),
      delete: jest.fn(),
      findByStatus: jest.fn(),
      findByFilters: jest.fn().mockResolvedValue({
        data: mockOrders,
        pagination: {
          page: 1,
          limit: 20,
          total: 20,
          totalPages: 1,
        },
      }),
      search: jest.fn(),
      countByStatus: jest.fn().mockResolvedValue({
        [OrderStatus.PENDING]: 20,
        [OrderStatus.EN_ROUTE]: 0,
        [OrderStatus.IN_PROCESS]: 0,
        [OrderStatus.COMPLETED]: 0,
        [OrderStatus.CANCELLED]: 0,
      }),
      getTotalCount: jest.fn().mockResolvedValue(20),
      createMany: jest.fn().mockResolvedValue(mockOrders),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    } as jest.Mocked<IOrderRepository>;

    mockNotificationService = {
      notifyOrderCreated: jest.fn(),
      notifyOrderUpdated: jest.fn(),
      notifyOrderDeleted: jest.fn(),
    } as jest.Mocked<INotificationService>;

    mockSimulator = {
      onOrderCreated: undefined,
      onOrderUpdated: undefined,
      onOrderDeleted: undefined,
      start: jest.fn(),
      stop: jest.fn(),
      startSimulation: jest.fn(),
      stopSimulation: jest.fn(),
    } as jest.Mocked<IOrderSimulator>;

    orderService = new OrderService(mockRepository, mockNotificationService, mockSimulator);
    await orderService.initializeWithSampleData();
  });

  afterEach(() => {
    orderService.stopSimulation();
  });

  describe('initialization', () => {
    it('should initialize with 20 orders', async () => {
      const result = await orderService.getAllOrders();
      expect(result.data).toHaveLength(20);
      expect(result.pagination.total).toBe(20);
    });

    it('should create orders with all required fields', async () => {
      const result = await orderService.getAllOrders();
      result.data.forEach(order => {
        expect(order).toHaveProperty('id');
        expect(order).toHaveProperty('address');
        expect(order).toHaveProperty('status');
        expect(order).toHaveProperty('collectorName');
        expect(order).toHaveProperty('lastUpdated');
        expect(Object.values(OrderStatus)).toContain(order.status);
      });
    });
  });

  describe('getOrderById', () => {
    it('should return order by id', async () => {
      const result = await orderService.getAllOrders();
      const firstOrder = result.data[0];
      
      mockRepository.findById.mockResolvedValue(firstOrder);
      const foundOrder = await orderService.getOrderById(firstOrder.id);
      expect(foundOrder).toEqual(firstOrder);
    });

    it('should return undefined for non-existent id', async () => {
      mockRepository.findById.mockResolvedValue(null);
      const foundOrder = await orderService.getOrderById('non-existent-id');
      expect(foundOrder).toBeNull();
    });
  });

  describe('getFilteredOrders', () => {
    it('should filter orders by status', async () => {
      const mockFilteredOrders = [{
        id: 'order-1',
        address: 'Address 1',
        status: OrderStatus.PENDING,
        collectorName: 'Collector 1',
        lastUpdated: new Date(),
      }];
      
      mockRepository.findByFilters.mockResolvedValue({
        data: mockFilteredOrders,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      
      const result = await orderService.getFilteredOrders({ status: OrderStatus.PENDING });
      expect(result.data).toEqual(mockFilteredOrders);
    });

    it('should filter orders by search term', async () => {
      const mockSearchResults = [{
        id: 'order-1',
        address: 'Test Address',
        status: OrderStatus.PENDING,
        collectorName: 'Test Collector',
        lastUpdated: new Date(),
      }];
      
      mockRepository.search.mockResolvedValue({
        data: mockSearchResults,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      
      const result = await orderService.searchOrders('test');
      expect(result.data).toEqual(mockSearchResults);
    });
  });

  describe('getOrderStats', () => {
    it('should return stats for all order statuses', async () => {
      const mockStats = {
        [OrderStatus.PENDING]: 5,
        [OrderStatus.EN_ROUTE]: 3,
        [OrderStatus.IN_PROCESS]: 2,
        [OrderStatus.COMPLETED]: 8,
        [OrderStatus.CANCELLED]: 2,
      };
      
      mockRepository.countByStatus.mockResolvedValue(mockStats);
      
      const stats = await orderService.getOrderStats();
      expect(stats).toEqual(mockStats);
    });
  });
});