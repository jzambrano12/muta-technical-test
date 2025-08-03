import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetStaticProps } from 'next';
import { useSocket } from '../hooks/useSocket';
import { OrdersTable } from '../components/OrdersTable';
import { OrdersCharts } from '../components/OrdersCharts';
import { Button } from '../components/ui/Button';
import { Globe } from 'lucide-react';

export default function Home() {
  const { t, i18n } = useTranslation('common');
  const [httpOrders, setHttpOrders] = useState([]);
  const [httpError, setHttpError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

  const { orders, isConnected, error: socketError } = useSocket(wsUrl);

  // Test HTTP API connectivity
  useEffect(() => {
    const testHttpConnection = async () => {
      try {
        setHttpError(null);

        console.log('=== HTTP REQUEST DEBUG ===');
        console.log('API URL:', apiUrl);
        console.log(
          'Current page protocol:',
          typeof window !== 'undefined' ? window.location.protocol : 'unknown'
        );
        console.log('API URL protocol:', new URL(apiUrl).protocol);

        // Check for mixed content issues
        if (
          typeof window !== 'undefined' &&
          window.location.protocol === 'https:' &&
          new URL(apiUrl).protocol === 'http:'
        ) {
          console.error('🚨 MIXED CONTENT DETECTED: HTTPS page trying to make HTTP request');
          console.error('This will be blocked by the browser for security reasons');
          throw new Error('Mixed content error: Cannot make HTTP requests from HTTPS page');
        }

        console.log('Making fetch request to:', `${apiUrl}/api/orders`);
        const response = await fetch(`${apiUrl}/api/orders`);
        console.log('Response status:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Successfully fetched orders via HTTP:', data.data?.length || 0, 'orders');
        setHttpOrders(data.data || []);
      } catch (err: unknown) {
        const error = err as Error;
        console.error('❌ Failed to fetch orders via HTTP:', error);

        let errorMessage = 'Could not connect to server. Please check your connection.';
        if (error.message.includes('Mixed content')) {
          errorMessage =
            'Security Error: Cannot connect to HTTP backend from HTTPS frontend. Backend must use HTTPS.';
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage =
            'Network Error: Cannot reach the backend server. Check if the server is running and accessible.';
        }

        setHttpError(errorMessage);
      }
    };

    testHttpConnection();
  }, [apiUrl]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  return (
    <>
      <Head>
        <title>{t('title')} - Muta Tech Test</title>
        <meta name="description" content={t('subtitle')} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                <p className="text-sm text-gray-600">{t('subtitle')}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                className="flex items-center space-x-2"
              >
                <Globe className="w-4 h-4" />
                <span>
                  {t('language.switchTo')}{' '}
                  {i18n.language === 'es' ? t('language.english') : t('language.spanish')}
                </span>
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Debug Information Panel */}
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">
              🔍 Connection Debug Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Environment Info */}
              <div>
                <h3 className="font-medium text-blue-800 mb-2">Environment Configuration</h3>
                <div className="text-sm space-y-1">
                  <div>
                    API URL: <code className="bg-blue-100 px-1 rounded">{apiUrl}</code>
                  </div>
                  <div>
                    WebSocket URL: <code className="bg-blue-100 px-1 rounded">{wsUrl}</code>
                  </div>
                  <div>
                    Page Protocol:{' '}
                    <code className="bg-blue-100 px-1 rounded">
                      {typeof window !== 'undefined' ? window.location.protocol : 'unknown'}
                    </code>
                  </div>
                </div>
              </div>

              {/* Connection Status */}
              <div>
                <h3 className="font-medium text-blue-800 mb-2">Connection Status</h3>
                <div className="space-y-2">
                  <div
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                      isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isConnected ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    ></div>
                    <span>WebSocket: {isConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>

                  <div
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                      !httpError ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        !httpError ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    ></div>
                    <span>HTTP API: {!httpError ? 'Connected' : 'Failed'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {(httpError || socketError) && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <h4 className="text-red-800 font-medium mb-2">Connection Errors:</h4>
                <div className="text-sm text-red-700 space-y-2">
                  {httpError && (
                    <div>
                      <strong>HTTP Error:</strong> {httpError}
                    </div>
                  )}
                  {socketError && (
                    <div>
                      <strong>WebSocket Error:</strong> {socketError}
                    </div>
                  )}
                  <div className="mt-3 text-xs text-red-600">
                    <strong>Debug Tip:</strong> Open browser DevTools Console (F12) for detailed
                    logs
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            {/* Charts Section */}
            <section>
              <OrdersCharts orders={orders.length > 0 ? orders : httpOrders} />
            </section>

            {/* Orders Table Section */}
            <section>
              <OrdersTable
                orders={orders.length > 0 ? orders : httpOrders}
                isConnected={isConnected}
                error={httpError || socketError}
              />
            </section>
          </div>
        </main>

        <footer className="bg-white border-t mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center text-sm text-gray-500">
              <p>{t('footer.companyInfo')}</p>
              <p className="mt-1">{t('footer.techStack')}</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'es', ['common'])),
    },
  };
};
