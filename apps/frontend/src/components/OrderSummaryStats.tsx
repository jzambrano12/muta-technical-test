import React, { useMemo, memo } from 'react';
import { OrderStatus } from '@muta/shared';
import { useTranslation } from 'next-i18next';

interface OrderSummaryStatsProps {
  orderStats: Record<OrderStatus, number>;
  totalOrders: number;
}

// Using React 19's improved memo behavior
export const OrderSummaryStats = memo<OrderSummaryStatsProps>(({ orderStats, totalOrders }) => {
  const { t } = useTranslation('common');

  // Optimized computation using React 19's improved useMemo
  const statsWithPercentages = useMemo(() => {
    return Object.entries(orderStats).map(([status, count]) => ({
      status: status as OrderStatus,
      count,
      percentage: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0,
    }));
  }, [orderStats, totalOrders]);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'text-gray-600 bg-gray-100';
      case OrderStatus.EN_ROUTE:
        return 'text-blue-600 bg-blue-100';
      case OrderStatus.IN_PROCESS:
        return 'text-yellow-600 bg-yellow-100';
      case OrderStatus.COMPLETED:
        return 'text-green-600 bg-green-100';
      case OrderStatus.CANCELLED:
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <span className="text-gray-700 font-medium">{t('totalOrders')}:</span>
        <span className="font-bold text-xl text-blue-600">{totalOrders}</span>
      </div>
      
      {statsWithPercentages.map(({ status, count, percentage }) => (
        <div 
          key={status} 
          className="flex justify-between items-center p-2 rounded-lg transition-all duration-200 hover:shadow-sm"
        >
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(status).split(' ')[1]}`} />
            <span className="text-gray-600 text-sm font-medium">
              {t(`status.${status}`)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-900">{count}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(status)}`}>
              {percentage}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
});

OrderSummaryStats.displayName = 'OrderSummaryStats';