import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import type { Order } from '@muta/shared';
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

interface OrdersChartsProps {
  orders: Order[];
}


const statusColors: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '#FCD34D',
  [OrderStatus.EN_ROUTE]: '#60A5FA',
  [OrderStatus.IN_PROCESS]: '#A78BFA',
  [OrderStatus.COMPLETED]: '#34D399',
  [OrderStatus.CANCELLED]: '#F87171'
};

export function OrdersCharts({ orders }: OrdersChartsProps) {
  const { t } = useTranslation('common');
  const statusCounts = useMemo(() => {
    const counts: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.EN_ROUTE]: 0,
      [OrderStatus.IN_PROCESS]: 0,
      [OrderStatus.COMPLETED]: 0,
      [OrderStatus.CANCELLED]: 0
    };

    orders.forEach(order => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });

    return counts;
  }, [orders]);

  const statusTranslationKeys: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: 'status.pending',
    [OrderStatus.EN_ROUTE]: 'status.in-route',
    [OrderStatus.IN_PROCESS]: 'status.in-progress',
    [OrderStatus.COMPLETED]: 'status.completed',
    [OrderStatus.CANCELLED]: 'status.cancelled'
  };

  const barChartData = {
    labels: Object.keys(statusCounts).map(status => t(statusTranslationKeys[status as OrderStatus])),
    datasets: [
      {
        label: t('charts.datasetLabel'),
        data: Object.values(statusCounts),
        backgroundColor: Object.keys(statusCounts).map(status => statusColors[status as OrderStatus]),
        borderColor: Object.keys(statusCounts).map(status => statusColors[status as OrderStatus]),
        borderWidth: 1,
      },
    ],
  };

  const doughnutChartData = {
    labels: Object.keys(statusCounts).map(status => t(statusTranslationKeys[status as OrderStatus])),
    datasets: [
      {
        data: Object.values(statusCounts),
        backgroundColor: Object.keys(statusCounts).map(status => statusColors[status as OrderStatus]),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        }
      },
    },
  };

  const barOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        }
      }
    }
  };

  const totalOrders = orders.length;
  const activeOrders = orders.filter(order => 
    order.status === OrderStatus.PENDING || order.status === OrderStatus.EN_ROUTE || order.status === OrderStatus.IN_PROCESS
  ).length;
  const completedOrders = statusCounts[OrderStatus.COMPLETED];
  const cancelledOrders = statusCounts[OrderStatus.CANCELLED];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Summary Cards */}
      <div className="lg:col-span-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalOrders}</div>
                <div className="text-sm text-gray-600">{t('charts.summary.total')}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{activeOrders}</div>
                <div className="text-sm text-gray-600">{t('charts.summary.active')}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{completedOrders}</div>
                <div className="text-sm text-gray-600">{t('charts.summary.completed')}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{cancelledOrders}</div>
                <div className="text-sm text-gray-600">{t('charts.summary.cancelled')}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('charts.barTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Bar data={barChartData} options={barOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Doughnut Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('charts.doughnutTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Doughnut data={doughnutChartData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}