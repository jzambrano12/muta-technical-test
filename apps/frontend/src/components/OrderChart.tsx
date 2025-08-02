import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { OrderStatus } from '@muta/shared';
import { useTranslation } from 'next-i18next';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface OrderChartProps {
  stats: Record<OrderStatus, number>;
  type: 'bar' | 'pie';
}

export const OrderChart: React.FC<OrderChartProps> = ({ stats, type }) => {
  const { t } = useTranslation('common');

  const labels = Object.keys(stats).map(status => t(`status.${status}`));
  const data = Object.values(stats);

  const colors = {
    [OrderStatus.PENDING]: 'rgba(156, 163, 175, 0.8)',
    [OrderStatus.EN_ROUTE]: 'rgba(59, 130, 246, 0.8)',
    [OrderStatus.IN_PROCESS]: 'rgba(251, 191, 36, 0.8)',
    [OrderStatus.COMPLETED]: 'rgba(34, 197, 94, 0.8)',
    [OrderStatus.CANCELLED]: 'rgba(239, 68, 68, 0.8)'
  };

  const backgroundColors = Object.keys(stats).map(status => colors[status as OrderStatus]);

  const chartData = {
    labels,
    datasets: [
      {
        label: t('numberOfOrders'),
        data,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: type === 'pie' ? 'right' as const : 'top' as const,
      },
      title: {
        display: true,
        text: t('ordersByStatus')
      }
    },
    scales: type === 'bar' ? {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    } : undefined
  };

  return (
    <div className="w-full h-full">
      {type === 'bar' ? (
        <Bar data={chartData} options={options} />
      ) : (
        <Pie data={chartData} options={options} />
      )}
    </div>
  );
};