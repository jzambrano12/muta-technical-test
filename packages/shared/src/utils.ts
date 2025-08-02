import { Order, OrderStatus } from './types';

export function generateOrderId(): string {
  return `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function getRandomStatus(): OrderStatus {
  const statuses = Object.values(OrderStatus);
  return statuses[Math.floor(Math.random() * statuses.length)];
}

export function getRandomCollectorName(): string {
  const names = [
    'Juan Pérez',
    'María García',
    'Carlos López',
    'Ana Martínez',
    'Pedro Rodríguez',
    'Laura Sánchez',
    'Diego González',
    'Sofía Ramírez'
  ];
  return names[Math.floor(Math.random() * names.length)];
}

export function getRandomAddress(): string {
  const streets = ['Av. Principal', 'Calle 50', 'Av. Balboa', 'Calle Uruguay', 'Via España'];
  const numbers = Math.floor(Math.random() * 200) + 1;
  const areas = ['Bella Vista', 'El Cangrejo', 'Obarrio', 'San Francisco', 'Paitilla'];
  
  return `${streets[Math.floor(Math.random() * streets.length)]} #${numbers}, ${areas[Math.floor(Math.random() * areas.length)]}`;
}

export function filterOrders(orders: Order[], filters: { status?: OrderStatus; search?: string }): Order[] {
  return orders.filter(order => {
    if (filters.status && order.status !== filters.status) {
      return false;
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        order.address.toLowerCase().includes(searchLower) ||
        order.collectorName.toLowerCase().includes(searchLower) ||
        order.id.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });
}