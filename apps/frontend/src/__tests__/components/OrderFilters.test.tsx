import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrderFilters } from '@/components/OrderFilters';
import { OrderStatus } from '@muta/shared';

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'filters.filterByStatus': 'Filter by status',
    'filters.allStatuses': 'All statuses',
    'filters.search': 'Search',
    'filters.searchPlaceholder': 'Search by address, collector or ID',
    'filters.apply': 'Apply',
    'filters.reset': 'Reset',
    'status.pending': 'Pending',
    'status.in-route': 'En Route',
    'status.in-progress': 'In Process',
    'status.completed': 'Completed',
    'status.cancelled': 'Cancelled',
  };
  return translations[key] || key;
};

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

interface MockSelectProps {
  label: string;
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

interface MockInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

interface MockButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant: string;
  className?: string;
}

jest.mock('@muta/ui', () => ({
  Select: ({ label, options, value, onChange }: MockSelectProps) => (
    <div>
      <label>{label}</label>
      <select value={value} onChange={onChange} data-testid="status-select">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  ),
  Input: ({ label, placeholder, value, onChange, onKeyPress }: MockInputProps) => (
    <div>
      <label>{label}</label>
      <input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyPress={onKeyPress}
        data-testid="search-input"
      />
    </div>
  ),
  Button: ({ onClick, children, variant, className }: MockButtonProps) => (
    <button onClick={onClick} className={className} data-testid={`${variant}-button`}>
      {children}
    </button>
  ),
}));

describe('OrderFilters', () => {
  const mockOnFilterChange = jest.fn();
  const mockOnReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <OrderFilters
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />
    );
  };

  it('renders all filter elements', () => {
    renderComponent();

    expect(screen.getByText('Filter by status')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Apply')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('calls onFilterChange when apply button is clicked', () => {
    renderComponent();

    const statusSelect = screen.getByTestId('status-select');
    const searchInput = screen.getByTestId('search-input');
    const applyButton = screen.getByTestId('primary-button');

    fireEvent.change(statusSelect, { target: { value: OrderStatus.PENDING } });
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    fireEvent.click(applyButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      status: OrderStatus.PENDING,
      search: 'test search'
    });
  });

  it('calls onReset when reset button is clicked', () => {
    renderComponent();

    const resetButton = screen.getByTestId('outline-button');
    fireEvent.click(resetButton);

    expect(mockOnReset).toHaveBeenCalled();
  });


  it('includes all status options in select', () => {
    renderComponent();
    
    expect(screen.getByText('All statuses')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('En Route')).toBeInTheDocument();
    expect(screen.getByText('In Process')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });
});