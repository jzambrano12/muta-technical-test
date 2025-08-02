import React from 'react';
import { Input, Select, Button } from '@muta/ui';
import { OrderStatus } from '@muta/shared';
import { useTranslation } from 'next-i18next';

interface OrderFiltersProps {
  onFilterChange: (filters: { status?: OrderStatus; search?: string }) => void;
  onReset: () => void;
}

export const OrderFilters: React.FC<OrderFiltersProps> = ({ onFilterChange, onReset }) => {
  const { t } = useTranslation('common');
  const [status, setStatus] = React.useState<string>('');
  const [search, setSearch] = React.useState('');

  // Real-time filtering with React 19's optimized re-renders
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      onFilterChange({
        status: status as OrderStatus || undefined,
        search: search || undefined
      });
    }, 300); // Debounce for better UX

    return () => clearTimeout(timeoutId);
  }, [status, search, onFilterChange]);

  const handleApplyFilters = () => {
    onFilterChange({
      status: status as OrderStatus || undefined,
      search: search || undefined
    });
  };

  const handleReset = () => {
    setStatus('');
    setSearch('');
    onReset();
  };

  const statusOptions = [
    { value: '', label: t('filters.allStatuses') },
    { value: OrderStatus.PENDING, label: t('status.pending') },
    { value: OrderStatus.EN_ROUTE, label: t('status.in-route') },
    { value: OrderStatus.IN_PROCESS, label: t('status.in-progress') },
    { value: OrderStatus.COMPLETED, label: t('status.completed') },
    { value: OrderStatus.CANCELLED, label: t('status.cancelled') }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Select
            label={t('filters.filterByStatus')}
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>
        <div>
          <Input
            label={t('filters.search')}
            placeholder={t('filters.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
          />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
        <Button 
          onClick={handleApplyFilters} 
          variant="primary"
          className="w-full sm:w-auto"
        >
          {t('filters.apply')}
        </Button>
        <Button 
          onClick={handleReset} 
          variant="outline"
          className="w-full sm:w-auto"
        >
          {t('filters.reset')}
        </Button>
      </div>
    </div>
  );
};