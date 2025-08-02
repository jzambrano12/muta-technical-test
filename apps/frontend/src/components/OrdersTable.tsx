import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { formatDate, debounce } from '../lib/utils';
import type { Order } from '@muta/shared';
import { OrderStatus } from '@muta/shared';
import { Search, RefreshCw } from 'lucide-react';
import { useTranslation } from 'next-i18next';

interface OrdersTableProps {
  orders: Order[];
  isConnected: boolean;
  error: string | null;
}


const statusColors: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [OrderStatus.EN_ROUTE]: 'bg-blue-100 text-blue-800',
  [OrderStatus.IN_PROCESS]: 'bg-purple-100 text-purple-800',
  [OrderStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800'
};

export function OrdersTable({ orders, isConnected, error }: OrdersTableProps) {
  const { t } = useTranslation('common');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const debouncedSetSearchTerm = useMemo(
    () => debounce((value: unknown) => {
      if (typeof value === 'string') {
        setSearchTerm(value);
        setCurrentPage(1);
      }
    }, 300),
    []
  );

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = searchTerm === '' || 
        order.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.collectorName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === '' || order.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as OrderStatus | '');
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSetSearchTerm(e.target.value);
  };

  const statusOptions = [
    { value: '', label: t('status.all') },
    { value: OrderStatus.PENDING, label: t('status.pending') },
    { value: OrderStatus.EN_ROUTE, label: t('status.in-route') },
    { value: OrderStatus.IN_PROCESS, label: t('status.in-progress') },
    { value: OrderStatus.COMPLETED, label: t('status.completed') },
    { value: OrderStatus.CANCELLED, label: t('status.cancelled') }
  ];

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-red-600">
            <RefreshCw className="w-5 h-5 mr-2" />
            {t('errors.connectionError')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('ordersTable.title')}</CardTitle>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? t('ordersTable.connected') : t('ordersTable.disconnected')}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t('ordersTable.searchPlaceholder')}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              placeholder={t('ordersTable.filterPlaceholder')}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-semibold">{t('ordersTable.headers.id')}</th>
                <th className="text-left p-3 font-semibold">{t('ordersTable.headers.address')}</th>
                <th className="text-left p-3 font-semibold">{t('ordersTable.headers.status')}</th>
                <th className="text-left p-3 font-semibold">{t('ordersTable.headers.collector')}</th>
                <th className="text-left p-3 font-semibold">{t('ordersTable.headers.lastUpdated')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-gray-500">
                    {orders.length === 0 ? t('ordersTable.noOrders') : t('ordersTable.noResults')}
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-sm">{order.id}</td>
                    <td className="p-3">{order.address}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                        {t(`status.${order.status}`)}
                      </span>
                    </td>
                    <td className="p-3">{order.collectorName}</td>
                    <td className="p-3 text-sm text-gray-600">
                      {formatDate(new Date(order.lastUpdated))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              {t('ordersTable.pagination.showing')} {((currentPage - 1) * itemsPerPage) + 1} {t('ordersTable.pagination.to')} {Math.min(currentPage * itemsPerPage, filteredOrders.length)} {t('ordersTable.pagination.of')} {filteredOrders.length} {t('ordersTable.pagination.orders')}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                {t('ordersTable.pagination.previous')}
              </Button>
              <span className="text-sm">
                {t('ordersTable.pagination.page')} {currentPage} {t('ordersTable.pagination.of')} {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                {t('ordersTable.pagination.next')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}