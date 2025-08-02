import '@testing-library/jest-dom';

// Mock next-i18next
jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      // Mock translation function that returns the key or a simple translation
      const translations = {
        'title': 'Collection Orders Dashboard',
        'subtitle': 'Real-time collection orders management',
        'ordersTable.title': 'Active Orders',
        'ordersTable.connected': 'Connected',
        'ordersTable.disconnected': 'Disconnected',
        'ordersTable.searchPlaceholder': 'Search by address or collector...',
        'ordersTable.filterPlaceholder': 'Filter by status',
        'ordersTable.headers.id': 'ID',
        'ordersTable.headers.address': 'Address',
        'ordersTable.headers.status': 'Status',
        'ordersTable.headers.collector': 'Collector',
        'ordersTable.headers.lastUpdated': 'Last Updated',
        'ordersTable.noOrders': 'No orders available',
        'ordersTable.noResults': 'No orders found matching the filters',
        'ordersTable.pagination.showing': 'Showing',
        'ordersTable.pagination.to': 'to',
        'ordersTable.pagination.of': 'of',
        'ordersTable.pagination.orders': 'orders',
        'ordersTable.pagination.page': 'Page',
        'ordersTable.pagination.previous': 'Previous',
        'ordersTable.pagination.next': 'Next',
        'charts.barTitle': 'Orders by Status - Bar Chart',
        'charts.doughnutTitle': 'Status Distribution - Doughnut Chart',
        'charts.summary.total': 'Total',
        'charts.summary.active': 'Active',
        'charts.summary.completed': 'Completed',
        'charts.summary.cancelled': 'Cancelled',
        'charts.datasetLabel': 'Number of Orders',
        'status.all': 'All statuses',
        'status.pending': 'Pending',
        'status.in-route': 'In Route',
        'status.in-progress': 'In Progress',
        'status.completed': 'Completed',
        'status.cancelled': 'Cancelled',
        'errors.connectionError': 'Could not connect to server. Please check your connection.',
        'errors.retrying': 'Retrying connection',
        'language.switchTo': 'Language',
        'language.spanish': 'Spanish',
        'language.english': 'English',
        'filters.filterByStatus': 'Filter by Status',
        'filters.search': 'Search',
        'filters.searchPlaceholder': 'Search by address or collector...',
        'filters.apply': 'Apply',
        'filters.reset': 'Reset',
        'filters.allStatuses': 'All statuses',
        'footer.companyInfo': 'Muta Technical Test - Order Management System',
        'footer.techStack': 'Backend: Node.js + Socket.io | Frontend: Next.js + React 19'
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: () => new Promise(() => {})
    }
  }),
  serverSideTranslations: async () => ({ _nextI18Next: { initialI18nStore: {}, initialLocale: 'en' } }),
  appWithTranslation: (component) => component
}));

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    locale: 'en',
    pathname: '/',
    asPath: '/',
    push: jest.fn(),
  }),
}));