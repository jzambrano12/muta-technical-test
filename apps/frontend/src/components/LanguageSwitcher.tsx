import React from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { Select } from '@muta/ui';

export const LanguageSwitcher: React.FC = () => {
  const { t } = useTranslation('common');
  const router = useRouter();

  const languageOptions = [
    { value: 'es', label: t('spanish') },
    { value: 'en', label: t('english') }
  ];

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = event.target.value;
    router.push(router.pathname, router.asPath, { locale: newLocale });
  };

  return (
    <div className="w-32">
      <Select
        label={t('languageSwitcher')}
        options={languageOptions}
        value={router.locale || 'es'}
        onChange={handleLanguageChange}
        className="text-sm"
      />
    </div>
  );
};