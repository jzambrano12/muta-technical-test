import React from 'react';
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
  const { orders, isConnected, error } = useSocket();

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
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('title')}
                </h1>
                <p className="text-sm text-gray-600">
                  {t('subtitle')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                className="flex items-center space-x-2"
              >
                <Globe className="w-4 h-4" />
                <span>
                  {t('language.switchTo')} {i18n.language === 'es' ? t('language.english') : t('language.spanish')}
                </span>
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Charts Section */}
            <section>
              <OrdersCharts orders={orders} />
            </section>

            {/* Orders Table Section */}
            <section>
              <OrdersTable 
                orders={orders} 
                isConnected={isConnected} 
                error={error} 
              />
            </section>
          </div>
        </main>

        <footer className="bg-white border-t mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center text-sm text-gray-500">
              <p>Muta Technical Test - Sistema de Gestión de Órdenes</p>
              <p className="mt-1">
                Backend: Node.js + Socket.io | Frontend: Next.js + React 19
              </p>
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