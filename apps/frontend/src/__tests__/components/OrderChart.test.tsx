import React from 'react';
import { render, screen } from '@testing-library/react';
import { OrderChart } from '@/components/OrderChart';
import { OrderStatus } from '@muta/shared';

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'numberOfOrders': 'Number of orders',
    'ordersByStatus': 'Orders by Status',
    [`status.${OrderStatus.PENDING}`]: 'Pending',
    [`status.${OrderStatus.EN_ROUTE}`]: 'En Route',
    [`status.${OrderStatus.IN_PROCESS}`]: 'In Process',
    [`status.${OrderStatus.COMPLETED}`]: 'Completed',
    [`status.${OrderStatus.CANCELLED}`]: 'Cancelled',
  };
  return translations[key] || key;
};

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

interface MockChartProps {
  data: unknown;
  options: unknown;
}

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: MockChartProps) => (
    <div data-testid="bar-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
  Pie: ({ data, options }: MockChartProps) => (
    <div data-testid="pie-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
}));

jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
  ArcElement: {},
}));

describe('OrderChart', () => {
  const mockStats = {
    [OrderStatus.PENDING]: 5,
    [OrderStatus.EN_ROUTE]: 3,
    [OrderStatus.IN_PROCESS]: 2,
    [OrderStatus.COMPLETED]: 10,
    [OrderStatus.CANCELLED]: 1,
  };

  it('renders bar chart when type is bar', () => {
    render(<OrderChart stats={mockStats} type="bar" />);

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
  });

  it('renders pie chart when type is pie', () => {
    render(<OrderChart stats={mockStats} type="pie" />);

    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('passes correct data to chart components', () => {
    render(<OrderChart stats={mockStats} type="bar" />);

    const chartData = screen.getByTestId('chart-data');
    const data = JSON.parse(chartData.textContent || '{}');

    expect(data.labels).toEqual([
      'Pending', 'En Route', 'In Process', 'Completed', 'Cancelled'
    ]);
    expect(data.datasets[0].data).toEqual([5, 3, 2, 10, 1]);
    expect(data.datasets[0].label).toBe('Number of orders');
  });

  it('includes title in chart options', () => {
    render(<OrderChart stats={mockStats} type="bar" />);

    const chartOptions = screen.getByTestId('chart-options');
    const options = JSON.parse(chartOptions.textContent || '{}');

    expect(options.plugins.title.display).toBe(true);
    expect(options.plugins.title.text).toBe('Orders by Status');
  });

  it('configures legend position differently for pie chart', () => {
    render(<OrderChart stats={mockStats} type="pie" />);

    const chartOptions = screen.getByTestId('chart-options');
    const options = JSON.parse(chartOptions.textContent || '{}');

    expect(options.plugins.legend.position).toBe('right');
  });

  it('configures legend position for bar chart', () => {
    render(<OrderChart stats={mockStats} type="bar" />);

    const chartOptions = screen.getByTestId('chart-options');
    const options = JSON.parse(chartOptions.textContent || '{}');

    expect(options.plugins.legend.position).toBe('top');
  });

  it('includes scales configuration for bar chart only', () => {
    render(<OrderChart stats={mockStats} type="bar" />);

    const chartOptions = screen.getByTestId('chart-options');
    const options = JSON.parse(chartOptions.textContent || '{}');

    expect(options.scales).toBeDefined();
    expect(options.scales.y.beginAtZero).toBe(true);
  });

  it('does not include scales configuration for pie chart', () => {
    render(<OrderChart stats={mockStats} type="pie" />);

    const chartOptions = screen.getByTestId('chart-options');
    const options = JSON.parse(chartOptions.textContent || '{}');

    expect(options.scales).toBeUndefined();
  });
});