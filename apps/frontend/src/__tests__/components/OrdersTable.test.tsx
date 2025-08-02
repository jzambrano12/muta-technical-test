import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { OrdersTable } from '../../components/OrdersTable';
import type { Order } from '@muta/shared';
import { OrderStatus } from '@muta/shared';

const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    address: 'Calle 123, Ciudad',
    status: OrderStatus.PENDING,
    collectorName: 'Juan Pérez',
    lastUpdated: new Date('2024-01-15T10:30:00Z')
  },
  {
    id: 'ORD-002',
    address: 'Avenida 456, Pueblo',
    status: OrderStatus.EN_ROUTE,
    collectorName: 'María García',
    lastUpdated: new Date('2024-01-15T11:00:00Z')
  },
  {
    id: 'ORD-003',
    address: 'Plaza Central 789',
    status: OrderStatus.COMPLETED,
    collectorName: 'Carlos López',
    lastUpdated: new Date('2024-01-15T12:00:00Z')
  }
];

describe('OrdersTable', () => {
  const defaultProps = {
    orders: mockOrders,
    isConnected: true,
    error: null
  };

  it('renders orders table with correct data', () => {
    render(<OrdersTable {...defaultProps} />);
    
    expect(screen.getByText('Active Orders')).toBeInTheDocument();
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('Calle 123, Ciudad')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
  });

  it('shows connection status correctly', () => {
    render(<OrdersTable {...defaultProps} />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
    
    render(<OrdersTable {...defaultProps} isConnected={false} />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    const errorMessage = 'Connection failed';
    render(<OrdersTable {...defaultProps} error={errorMessage} />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('filters orders by status', async () => {
    const user = userEvent.setup();
    render(<OrdersTable {...defaultProps} />);
    
    const statusSelect = screen.getByRole('combobox');
    await user.selectOptions(statusSelect, OrderStatus.PENDING);
    
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
    expect(screen.queryByText('ORD-003')).not.toBeInTheDocument();
  });

  it('searches orders by address', async () => {
    const user = userEvent.setup();
    render(<OrdersTable {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search by address or collector...');
    await user.type(searchInput, 'Calle 123');
    
    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
      expect(screen.queryByText('ORD-003')).not.toBeInTheDocument();
    });
  });

  it('searches orders by collector name', async () => {
    const user = userEvent.setup();
    render(<OrdersTable {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search by address or collector...');
    await user.type(searchInput, 'María');
    
    await waitFor(() => {
      expect(screen.getByText('ORD-002')).toBeInTheDocument();
      expect(screen.queryByText('ORD-001')).not.toBeInTheDocument();
      expect(screen.queryByText('ORD-003')).not.toBeInTheDocument();
    });
  });

  it('shows no results message when no orders match filters', async () => {
    const user = userEvent.setup();
    render(<OrdersTable {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search by address or collector...');
    await user.type(searchInput, 'NonExistentAddress');
    
    await waitFor(() => {
      expect(screen.getByText('No orders found matching the filters')).toBeInTheDocument();
    });
  });

  it('shows correct status labels and colors', () => {
    render(<OrdersTable {...defaultProps} />);
    
    // Status labels appear in both the filter dropdown and the table rows
    expect(screen.getAllByText('Pending')).toHaveLength(2);
    expect(screen.getAllByText('In Route')).toHaveLength(2);
    expect(screen.getAllByText('Completed')).toHaveLength(2);
  });

  it('handles empty orders array', () => {
    render(<OrdersTable {...defaultProps} orders={[]} />);
    expect(screen.getByText('No orders available')).toBeInTheDocument();
  });

  it('handles pagination when there are many orders', () => {
    const manyOrders = Array.from({ length: 25 }, (_, i) => ({
      id: `ORD-${String(i + 1).padStart(3, '0')}`,
      address: `Address ${i + 1}`,
      status: OrderStatus.PENDING,
      collectorName: `Collector ${i + 1}`,
      lastUpdated: new Date()
    }));

    render(<OrdersTable {...defaultProps} orders={manyOrders} />);
    
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });
});